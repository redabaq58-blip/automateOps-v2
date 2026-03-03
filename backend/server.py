from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import csv
import io
import json
import uuid
import jwt
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ATTRIBUTION = "Includes O*NET 30.2 data, U.S. Department of Labor/Employment and Training Administration (USDOL/ETA). Licensed under CC BY 4.0."
JWT_SECRET = os.environ.get('JWT_SECRET', 'automateops-secret-key-change-in-prod')
JWT_ALGORITHM = "HS256"

app = FastAPI(title="automateOps data API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic Models ───
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class AskRequest(BaseModel):
    question: str
    language: str = "en"

class PackCreate(BaseModel):
    title: str
    description: str = ""
    occupation_codes: List[str] = []

class LibrarySave(BaseModel):
    onet_code: str

class PackBuilderExport(BaseModel):
    codes: List[str]
    format: str = "json"

# ─── Auth Helpers ───
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str = "user") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Helper to clean MongoDB docs ───
def clean_doc(doc):
    if doc and '_id' in doc:
        del doc['_id']
    return doc

def clean_docs(docs):
    return [clean_doc(d) for d in docs]

# ─── AUTH ROUTES ───
@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, data.email)
    return {"token": token, "user": {"id": user_id, "email": data.email, "name": data.name, "role": "user"}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user['id'], user['email'], user.get('role', 'user'))
    return {"token": token, "user": {"id": user['id'], "email": user['email'], "name": user['name'], "role": user.get('role', 'user')}}

@api_router.get("/auth/me")
async def get_me(user=Depends(require_auth)):
    u = await db.users.find_one({"id": user['sub']}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(404, "User not found")
    return u

# ─── SEARCH ───
@api_router.get("/search")
async def search_occupations(
    q: str = "",
    country: str = "",
    major_group: str = "",
    job_zone: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
):
    query = {}
    if q:
        escaped = re.escape(q)
        query["$or"] = [
            {"title_en": {"$regex": escaped, "$options": "i"}},
            {"definition_en": {"$regex": escaped, "$options": "i"}},
            {"onet_code": {"$regex": escaped, "$options": "i"}},
        ]
    if country:
        query["country_scope"] = country
    if major_group:
        query["major_group"] = major_group
    if job_zone:
        query["job_zone"] = job_zone

    skip = (page - 1) * limit
    total = await db.occupations.count_documents(query)
    cursor = db.occupations.find(query, {"_id": 0}).skip(skip).limit(limit).sort("title_en", 1)
    results = await cursor.to_list(limit)

    # Also search tasks if q is provided
    task_matches = []
    if q:
        task_query = {"statement_en": {"$regex": re.escape(q), "$options": "i"}}
        task_cursor = db.tasks.find(task_query, {"_id": 0}).limit(10)
        task_matches = await task_cursor.to_list(10)

    return {
        "results": results,
        "task_matches": task_matches,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if limit > 0 else 0,
    }

# ─── OCCUPATION DETAIL ───
@api_router.get("/occupations/{onet_code}")
async def get_occupation(onet_code: str):
    occ = await db.occupations.find_one({"onet_code": onet_code}, {"_id": 0})
    if not occ:
        # Try slug
        occ = await db.occupations.find_one({"slug": onet_code}, {"_id": 0})
    if not occ:
        raise HTTPException(404, "Occupation not found")
    
    # Get task count
    task_count = await db.tasks.count_documents({"onet_code": occ["onet_code"]})
    tool_count = await db.tools_technology.count_documents({"onet_code": occ["onet_code"]})
    
    occ["task_count"] = task_count
    occ["tool_count"] = tool_count
    return occ

@api_router.get("/occupations/{onet_code}/tasks")
async def get_tasks(onet_code: str, sort: str = "importance", order: str = "desc"):
    sort_dir = -1 if order == "desc" else 1
    sort_field = sort if sort in ["importance", "frequency", "statement_en"] else "importance"
    cursor = db.tasks.find({"onet_code": onet_code}, {"_id": 0}).sort(sort_field, sort_dir)
    tasks = await cursor.to_list(500)
    return {"tasks": tasks, "count": len(tasks), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/skills")
async def get_skills(onet_code: str):
    cursor = db.skills.find({"onet_code": onet_code}, {"_id": 0}).sort("importance", -1)
    items = await cursor.to_list(500)
    return {"skills": items, "count": len(items), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/knowledge")
async def get_knowledge(onet_code: str):
    cursor = db.knowledge.find({"onet_code": onet_code}, {"_id": 0}).sort("importance", -1)
    items = await cursor.to_list(500)
    return {"knowledge": items, "count": len(items), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/abilities")
async def get_abilities(onet_code: str):
    cursor = db.abilities.find({"onet_code": onet_code}, {"_id": 0}).sort("importance", -1)
    items = await cursor.to_list(500)
    return {"abilities": items, "count": len(items), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/work-activities")
async def get_work_activities(onet_code: str):
    cursor = db.work_activities.find({"onet_code": onet_code}, {"_id": 0}).sort("importance", -1)
    items = await cursor.to_list(500)
    return {"work_activities": items, "count": len(items), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/work-context")
async def get_work_context(onet_code: str):
    cursor = db.work_context.find({"onet_code": onet_code}, {"_id": 0})
    items = await cursor.to_list(500)
    return {"work_context": items, "count": len(items), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/tools")
async def get_tools(onet_code: str):
    cursor = db.tools_technology.find({"onet_code": onet_code}, {"_id": 0})
    items = await cursor.to_list(500)
    # Separate tools and technology
    tools = [i for i in items if i.get("type") == "tool"]
    technology = [i for i in items if i.get("type") == "technology"]
    return {"tools": tools, "technology": technology, "count": len(items), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/education")
async def get_education(onet_code: str):
    cursor = db.education.find({"onet_code": onet_code}, {"_id": 0})
    items = await cursor.to_list(500)
    return {"education": items, "count": len(items), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/related")
async def get_related(onet_code: str):
    cursor = db.related_occupations.find({"onet_code": onet_code}, {"_id": 0}).sort("index", 1).limit(20)
    rels = await cursor.to_list(20)
    # Enrich with titles
    for r in rels:
        related_occ = await db.occupations.find_one({"onet_code": r["related_code"]}, {"_id": 0, "title_en": 1, "slug": 1})
        if related_occ:
            r["related_title"] = related_occ.get("title_en", "")
            r["related_slug"] = related_occ.get("slug", "")
    return {"related": rels, "count": len(rels), "attribution": ATTRIBUTION}

@api_router.get("/occupations/{onet_code}/work-styles")
async def get_work_styles(onet_code: str):
    cursor = db.work_styles.find({"onet_code": onet_code}, {"_id": 0}).sort("importance", -1)
    items = await cursor.to_list(500)
    return {"work_styles": items, "count": len(items), "attribution": ATTRIBUTION}

# ─── EXPORT ───
@api_router.get("/occupations/{onet_code}/export")
async def export_occupation(onet_code: str, format: str = "json"):
    occ = await db.occupations.find_one({"onet_code": onet_code}, {"_id": 0})
    if not occ:
        raise HTTPException(404, "Occupation not found")

    tasks = await db.tasks.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)
    skills = await db.skills.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)
    knowledge = await db.knowledge.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)
    abilities = await db.abilities.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)
    work_activities = await db.work_activities.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)
    work_context = await db.work_context.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)
    tools_tech = await db.tools_technology.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)
    education = await db.education.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)
    work_styles = await db.work_styles.find({"onet_code": onet_code}, {"_id": 0}).to_list(500)

    export_data = {
        "occupation": occ,
        "tasks": tasks,
        "skills": skills,
        "knowledge": knowledge,
        "abilities": abilities,
        "work_activities": work_activities,
        "work_context": work_context,
        "tools_and_technology": tools_tech,
        "education": education,
        "work_styles": work_styles,
        "attribution": ATTRIBUTION,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "data_version": "O*NET 30.2",
    }

    if format == "csv":
        output = io.StringIO()
        output.write(f"# {ATTRIBUTION}\n")
        output.write(f"# Exported: {export_data['exported_at']}\n\n")
        
        # Tasks CSV
        output.write("# TASKS\n")
        if tasks:
            writer = csv.DictWriter(output, fieldnames=["onet_code", "task_id", "statement_en", "task_type", "importance", "frequency", "source"])
            writer.writeheader()
            for t in tasks:
                writer.writerow({k: t.get(k, '') for k in writer.fieldnames})
        
        output.write("\n# SKILLS\n")
        if skills:
            writer = csv.DictWriter(output, fieldnames=["onet_code", "element_id", "name", "importance", "level", "source"])
            writer.writeheader()
            for s in skills:
                writer.writerow({k: s.get(k, '') for k in writer.fieldnames})

        content = output.getvalue()
        return Response(content=content, media_type="text/csv",
                       headers={"Content-Disposition": f'attachment; filename="{onet_code}_data.csv"'})
    
    return Response(
        content=json.dumps(export_data, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{onet_code}_data.json"'}
    )

# ─── INDUSTRIES ───
@api_router.get("/industries")
async def get_industries():
    groups = await db.industry_groups.find({}, {"_id": 0}).sort("group_code", 1).to_list(100)
    return {"industries": groups}

@api_router.get("/industries/{group_code}/occupations")
async def get_industry_occupations(group_code: str, page: int = 1, limit: int = 50):
    skip = (page - 1) * limit
    total = await db.occupations.count_documents({"major_group": group_code})
    cursor = db.occupations.find({"major_group": group_code}, {"_id": 0}).skip(skip).limit(limit).sort("title_en", 1)
    results = await cursor.to_list(limit)
    return {"occupations": results, "total": total, "page": page}

# ─── STATS ───
@api_router.get("/stats")
async def get_stats():
    stats = await db.platform_stats.find_one({}, {"_id": 0})
    if not stats:
        stats = {
            "total_occupations": await db.occupations.count_documents({}),
            "total_tasks": await db.tasks.count_documents({}),
            "total_skills": await db.skills.count_documents({}),
            "total_tools": await db.tools_technology.count_documents({}),
        }
    return stats

# ─── ASK THE DATA (RAG) ───
@api_router.post("/ask")
async def ask_the_data(req: AskRequest):
    llm_key = os.environ.get('EMERGENT_LLM_KEY')
    if not llm_key:
        raise HTTPException(500, "LLM key not configured")
    
    question = req.question
    
    # Try to find relevant occupations
    relevant_occs = await db.occupations.find(
        {"$or": [
            {"title_en": {"$regex": re.escape(question), "$options": "i"}},
            {"definition_en": {"$regex": re.escape(question), "$options": "i"}},
        ]},
        {"_id": 0, "title_en": 1, "onet_code": 1, "definition_en": 1}
    ).limit(5).to_list(5)
    
    # Search tasks
    relevant_tasks = await db.tasks.find(
        {"statement_en": {"$regex": re.escape(question.split()[0] if question.split() else question), "$options": "i"}},
        {"_id": 0, "onet_code": 1, "statement_en": 1, "importance": 1}
    ).limit(15).to_list(15)
    
    # Build context
    context_parts = []
    if relevant_occs:
        context_parts.append("Relevant Occupations:")
        for o in relevant_occs:
            context_parts.append(f"- {o['title_en']} ({o['onet_code']}): {o.get('definition_en', '')[:200]}")
    
    if relevant_tasks:
        context_parts.append("\nRelevant Tasks:")
        for t in relevant_tasks:
            context_parts.append(f"- [{t['onet_code']}] {t['statement_en']} (importance: {t.get('importance', 'N/A')})")
    
    context = "\n".join(context_parts) if context_parts else "No directly matching data found in the database."
    
    # Call LLM
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"ask-{uuid.uuid4()}",
            system_message=f"""You are the automateOps data assistant. You help users explore structured occupation data from O*NET 30.2 database.
You have access to 1,016 occupations with detailed tasks, skills, knowledge, abilities, work activities, tools, and work context data.

When answering:
- Reference specific occupation codes and task statements from the context
- Be concise and data-driven
- Suggest relevant occupations to explore
- Note data source: O*NET 30.2

{ATTRIBUTION}"""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""User question: {question}

Database context:
{context}

Answer the question using the data above. If the data doesn't directly answer the question, suggest which occupations or data categories the user should explore."""
        
        response = await chat.send_message(UserMessage(text=prompt))
        return {"answer": response, "context_occupations": relevant_occs, "context_tasks_count": len(relevant_tasks)}
    except Exception as e:
        logger.error(f"LLM error: {e}")
        return {
            "answer": f"I found {len(relevant_occs)} relevant occupations and {len(relevant_tasks)} related tasks. Please browse the search results for detailed data.",
            "context_occupations": relevant_occs,
            "context_tasks_count": len(relevant_tasks),
            "error": str(e)
        }

# ─── USER LIBRARY ───
@api_router.post("/library/save")
async def save_to_library(data: LibrarySave, user=Depends(require_auth)):
    existing = await db.user_library.find_one({"user_id": user['sub'], "onet_code": data.onet_code})
    if existing:
        await db.user_library.delete_one({"user_id": user['sub'], "onet_code": data.onet_code})
        return {"saved": False, "message": "Removed from library"}
    
    await db.user_library.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user['sub'],
        "onet_code": data.onet_code,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"saved": True, "message": "Added to library"}

@api_router.get("/library")
async def get_library(user=Depends(require_auth)):
    items = await db.user_library.find({"user_id": user['sub']}, {"_id": 0}).to_list(500)
    # Enrich with occupation info
    for item in items:
        occ = await db.occupations.find_one({"onet_code": item['onet_code']}, {"_id": 0, "title_en": 1, "slug": 1, "definition_en": 1})
        if occ:
            item.update(occ)
    return {"library": items, "count": len(items)}

@api_router.get("/library/check/{onet_code}")
async def check_library(onet_code: str, user=Depends(get_current_user)):
    if not user:
        return {"saved": False}
    existing = await db.user_library.find_one({"user_id": user['sub'], "onet_code": onet_code})
    return {"saved": bool(existing)}

# ─── MARKETPLACE PACKS ───
@api_router.get("/marketplace/packs")
async def list_packs(status: str = "approved", page: int = 1, limit: int = 20):
    query = {"status": status}
    skip = (page - 1) * limit
    total = await db.marketplace_packs.count_documents(query)
    cursor = db.marketplace_packs.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
    packs = await cursor.to_list(limit)
    return {"packs": packs, "total": total, "page": page}

@api_router.post("/marketplace/packs")
async def create_pack(data: PackCreate, user=Depends(require_auth)):
    pack_id = str(uuid.uuid4())
    pack = {
        "id": pack_id,
        "title": data.title,
        "description": data.description,
        "occupation_codes": data.occupation_codes,
        "user_id": user['sub'],
        "user_name": user.get('email', ''),
        "status": "pending",
        "price_cents": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.marketplace_packs.insert_one(pack)
    return clean_doc(pack)

@api_router.get("/marketplace/packs/{pack_id}")
async def get_pack(pack_id: str):
    pack = await db.marketplace_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(404, "Pack not found")
    return pack

# ─── ADMIN ───
@api_router.get("/admin/queue")
async def admin_queue(user=Depends(require_auth)):
    if user.get('role') != 'admin':
        raise HTTPException(403, "Admin access required")
    packs = await db.marketplace_packs.find({"status": "pending"}, {"_id": 0}).to_list(100)
    return {"queue": packs}

@api_router.post("/admin/moderate/{pack_id}")
async def moderate_pack(pack_id: str, action: str = Query(...), user=Depends(require_auth)):
    if user.get('role') != 'admin':
        raise HTTPException(403, "Admin access required")
    if action not in ["approved", "rejected"]:
        raise HTTPException(400, "Action must be 'approved' or 'rejected'")
    result = await db.marketplace_packs.update_one({"id": pack_id}, {"$set": {"status": action}})
    if result.modified_count == 0:
        raise HTTPException(404, "Pack not found")
    return {"status": action, "pack_id": pack_id}

# ─── API KEYS ───
@api_router.post("/api-keys/generate")
async def generate_api_key(user=Depends(require_auth)):
    key = f"aod_{uuid.uuid4().hex[:24]}"
    await db.api_keys.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user['sub'],
        "key": key,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
    })
    return {"key": key}

@api_router.get("/api-keys")
async def list_api_keys(user=Depends(require_auth)):
    keys = await db.api_keys.find({"user_id": user['sub']}, {"_id": 0}).to_list(50)
    return {"keys": keys}

# ─── FEATURED / HOMEPAGE ───
@api_router.get("/featured")
async def get_featured():
    # Get some interesting occupations across categories
    featured_codes = [
        "29-1141.00",  # Registered Nurses
        "15-1252.00",  # Software Developers
        "47-2111.00",  # Electricians
        "13-2011.00",  # Accountants and Auditors
        "23-1011.00",  # Lawyers
        "29-1215.00",  # Family Medicine Physicians
        "15-2051.00",  # Data Scientists
        "47-2152.00",  # Plumbers
    ]
    featured = []
    for code in featured_codes:
        occ = await db.occupations.find_one({"onet_code": code}, {"_id": 0})
        if occ:
            task_count = await db.tasks.count_documents({"onet_code": code})
            occ["task_count"] = task_count
            featured.append(occ)
    return {"featured": featured}

# ─── PACK BUILDER ───
@api_router.post("/pack-builder/export")
async def export_pack(data: PackBuilderExport):
    """Export a combined data pack for multiple occupations"""
    if not data.codes:
        raise HTTPException(400, "No occupation codes provided")

    all_data = []
    for code in data.codes[:50]:  # Limit to 50 occupations per pack
        occ = await db.occupations.find_one({"onet_code": code}, {"_id": 0})
        if not occ:
            continue

        tasks = await db.tasks.find({"onet_code": code}, {"_id": 0}).to_list(500)
        skills = await db.skills.find({"onet_code": code}, {"_id": 0}).to_list(500)
        knowledge = await db.knowledge.find({"onet_code": code}, {"_id": 0}).to_list(500)
        abilities = await db.abilities.find({"onet_code": code}, {"_id": 0}).to_list(500)
        work_activities = await db.work_activities.find({"onet_code": code}, {"_id": 0}).to_list(500)
        work_context = await db.work_context.find({"onet_code": code}, {"_id": 0}).to_list(500)
        tools_tech = await db.tools_technology.find({"onet_code": code}, {"_id": 0}).to_list(500)

        all_data.append({
            "occupation": occ,
            "tasks": tasks,
            "skills": skills,
            "knowledge": knowledge,
            "abilities": abilities,
            "work_activities": work_activities,
            "work_context": work_context,
            "tools_and_technology": tools_tech,
        })

    export = {
        "pack_metadata": {
            "occupation_count": len(all_data),
            "codes": [d["occupation"]["onet_code"] for d in all_data],
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "data_version": "O*NET 30.2 + NOC 2021",
        },
        "occupations": all_data,
        "attribution": ATTRIBUTION,
    }

    if data.format == "csv":
        output = io.StringIO()
        output.write(f"# {ATTRIBUTION}\n")
        output.write(f"# Pack: {len(all_data)} occupations\n\n")

        # Tasks CSV
        output.write("# TASKS\n")
        all_tasks = []
        for d in all_data:
            all_tasks.extend(d["tasks"])
        if all_tasks:
            fields = ["onet_code", "task_id", "statement_en", "task_type", "importance", "frequency", "automatable_score", "automation_type", "edge_cases"]
            writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
            writer.writeheader()
            for t in all_tasks:
                writer.writerow({k: t.get(k, '') for k in fields})

        # Skills CSV
        output.write("\n# SKILLS\n")
        all_skills = []
        for d in all_data:
            all_skills.extend(d["skills"])
        if all_skills:
            fields = ["onet_code", "element_id", "name", "importance", "level"]
            writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
            writer.writeheader()
            for s in all_skills:
                writer.writerow({k: s.get(k, '') for k in fields})

        content = output.getvalue()
        return Response(content=content, media_type="text/csv",
                       headers={"Content-Disposition": 'attachment; filename="data_pack.csv"'})

    return export

# ─── ADMIN ENRICHMENT STATS ───
@api_router.get("/admin/enrichment-stats")
async def enrichment_stats():
    total_tasks = await db.tasks.count_documents({})
    enriched_tasks = await db.tasks.count_documents({"enriched": True})

    # Get data sources
    sources = ["O*NET 30.2"]
    noc_count = await db.noc_occupations.count_documents({})
    if noc_count > 0:
        sources.append("NOC 2021")
    crosswalk_count = await db.crosswalks.count_documents({})

    return {
        "total_tasks": total_tasks,
        "enriched_tasks": enriched_tasks,
        "total_occupations": await db.occupations.count_documents({}),
        "noc_occupations": noc_count,
        "crosswalk_mappings": crosswalk_count,
        "data_sources": sources,
    }

# ─── CROSSWALK SEARCH ───
@api_router.get("/crosswalks/{source_code}")
async def get_crosswalks(source_code: str):
    # Search in both directions
    results = await db.crosswalks.find(
        {"$or": [{"source_code": source_code}, {"target_code": source_code}]},
        {"_id": 0}
    ).to_list(50)
    return {"crosswalks": results, "count": len(results)}

# ─── NOC DATA ───
@api_router.get("/noc/{noc_code}")
async def get_noc_occupation(noc_code: str):
    occ = await db.noc_occupations.find_one({"noc_code": noc_code}, {"_id": 0})
    if not occ:
        raise HTTPException(404, "NOC occupation not found")
    elements = await db.noc_elements.find({"noc_code": noc_code}, {"_id": 0}).to_list(100)
    crosswalks = await db.crosswalks.find(
        {"$or": [{"source_code": noc_code}, {"target_code": noc_code}]},
        {"_id": 0}
    ).to_list(50)
    return {**occ, "elements": elements, "crosswalks": crosswalks}

# ─── ESCO DATA ───
@api_router.get("/esco/occupations")
async def list_esco_occupations(page: int = 1, limit: int = 50, q: str = ""):
    query = {}
    if q:
        query["title_en"] = {"$regex": re.escape(q), "$options": "i"}
    skip = (page - 1) * limit
    total = await db.esco_occupations.count_documents(query)
    cursor = db.esco_occupations.find(query, {"_id": 0}).skip(skip).limit(limit).sort("title_en", 1)
    results = await cursor.to_list(limit)
    return {"occupations": results, "total": total, "page": page}

@api_router.get("/esco/occupations/{esco_code}")
async def get_esco_occupation(esco_code: str):
    occ = await db.esco_occupations.find_one({"esco_code": esco_code}, {"_id": 0})
    if not occ:
        raise HTTPException(404, "ESCO occupation not found")
    crosswalks = await db.crosswalks.find(
        {"source_system": "ESCO", "source_code": esco_code}, {"_id": 0}
    ).to_list(10)
    occ["crosswalks"] = crosswalks
    return occ

# ─── AUTOMATION HEATMAP ───
@api_router.get("/heatmap/data")
async def heatmap_data():
    """Get aggregated automation heatmap data by industry"""
    # Get industry groups
    industry_groups = await db.industry_groups.find({}, {"_id": 0}).to_list(100)

    industries = []
    for group in industry_groups:
        # Get enriched tasks for this industry group
        pipeline = [
            {"$match": {"major_group": group["group_code"]}},
            {"$lookup": {
                "from": "tasks",
                "localField": "onet_code",
                "foreignField": "onet_code",
                "as": "tasks"
            }},
            {"$unwind": "$tasks"},
            {"$match": {"tasks.enriched": True}},
            {"$group": {
                "_id": None,
                "avg_automation": {"$avg": "$tasks.automatable_score"},
                "total_enriched": {"$sum": 1},
            }}
        ]
        result = await db.occupations.aggregate(pipeline).to_list(1)
        if result:
            industries.append({
                "group_code": group["group_code"],
                "name": group["name"],
                "occupation_count": group["occupation_count"],
                "avg_automation": round(result[0]["avg_automation"], 3) if result[0]["avg_automation"] else None,
                "enriched_tasks": result[0]["total_enriched"],
            })
        else:
            industries.append({
                "group_code": group["group_code"],
                "name": group["name"],
                "occupation_count": group["occupation_count"],
                "avg_automation": None,
                "enriched_tasks": 0,
            })

    # Top automatable occupations
    top_pipeline = [
        {"$match": {"enriched": True}},
        {"$group": {
            "_id": "$onet_code",
            "avg_score": {"$avg": "$automatable_score"},
            "task_count": {"$sum": 1},
        }},
        {"$sort": {"avg_score": -1}},
        {"$limit": 50},
    ]
    top_results = await db.tasks.aggregate(top_pipeline).to_list(50)

    top_occupations = []
    for r in top_results:
        occ = await db.occupations.find_one({"onet_code": r["_id"]}, {"_id": 0, "title_en": 1})
        if occ:
            top_occupations.append({
                "onet_code": r["_id"],
                "title": occ["title_en"],
                "avg_score": round(r["avg_score"], 3),
                "task_count": r["task_count"],
            })

    # Automation type breakdown
    type_pipeline = [
        {"$match": {"enriched": True, "automation_type": {"$exists": True}}},
        {"$group": {"_id": "$automation_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    type_results = await db.tasks.aggregate(type_pipeline).to_list(10)
    total_typed = sum(r["count"] for r in type_results)
    type_breakdown = [
        {"type": r["_id"], "count": r["count"], "pct": round(r["count"] / total_typed * 100, 1) if total_typed > 0 else 0}
        for r in type_results
    ]

    # Overall stats
    total_enriched = await db.tasks.count_documents({"enriched": True})
    overall_avg_pipeline = [
        {"$match": {"enriched": True}},
        {"$group": {"_id": None, "avg": {"$avg": "$automatable_score"}}}
    ]
    overall_result = await db.tasks.aggregate(overall_avg_pipeline).to_list(1)
    overall_avg = round(overall_result[0]["avg"], 3) if overall_result else None

    high_count = await db.tasks.count_documents({"enriched": True, "automatable_score": {"$gte": 0.7}})

    return {
        "industries": industries,
        "top_automatable": top_occupations,
        "type_breakdown": type_breakdown,
        "total_enriched": total_enriched,
        "overall_avg": overall_avg,
        "high_automation_count": high_count,
    }

@api_router.get("/heatmap/industry/{group_code}")
async def heatmap_industry_detail(group_code: str):
    """Get detailed automation data for a specific industry"""
    group = await db.industry_groups.find_one({"group_code": group_code}, {"_id": 0})
    if not group:
        raise HTTPException(404, "Industry not found")

    # Get all occupations in this industry with their enrichment data
    occs = await db.occupations.find({"major_group": group_code}, {"_id": 0, "onet_code": 1, "title_en": 1}).to_list(200)

    result = []
    for occ in occs:
        pipeline = [
            {"$match": {"onet_code": occ["onet_code"], "enriched": True}},
            {"$group": {
                "_id": None,
                "avg_score": {"$avg": "$automatable_score"},
                "count": {"$sum": 1},
            }}
        ]
        agg = await db.tasks.aggregate(pipeline).to_list(1)
        result.append({
            "onet_code": occ["onet_code"],
            "title": occ["title_en"],
            "avg_score": round(agg[0]["avg_score"], 3) if agg else None,
            "enriched_tasks": agg[0]["count"] if agg else 0,
        })

    result.sort(key=lambda x: x["avg_score"] or 0, reverse=True)

    return {
        "group_code": group_code,
        "industry_name": group["name"],
        "occupations": result,
    }

# ─── Mount router & middleware ───
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
