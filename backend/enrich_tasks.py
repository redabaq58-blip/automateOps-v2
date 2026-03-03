sed -n '51,100p' /app/backend/enrich_tasks.py
clear && cat /app/backend/enrich_tasks.py
cat -n /app/backend/enrich_tasks.py | head -n 50
sed -n '51,100p' /app/backend/enrich_tasks.py
wc -l /app/backend/enrich_tasks.py
wc -l /app/backend/enrich_tasks.py
sed -n '1,60p' /app/backend/enrich_tasks.py
sed -n '61,120p' /app/backend/enrich_tasks.py
sed -n '121,163p' /app/backend/enrich_tasks.py
wc -l /app/backend/ingest_esco.py
sed -n '1,60p' /app/backend/ingest_esco.py
sed -n '61,108p' /app/backend/ingest_esco.py
sed -n '109,144p' /app/backend/ingest_esco.py
wc -l /app/backend/ingest_noc.py
wc -l /app/backend/ingest_noc.py
sed -n '1,60p' /app/backend/ingest_noc.py
sed -n '61,144p' /app/backend/ingest_noc.py
sed -n '119,144p' /app/backend/ingest_noc.py
wc -l /app/backend/ingest_oasis.py

sed -n '1,60p' /app/backend/ingest_oasis.py
sed -n '61,144p' /app/backend/ingest_oasis.py
wc -l /app/backend/ingest_onet.py
sed -n '1,60p' /app/backend/ingest_onet.py
sed -n '61,144p' /app/backend/ingest_onet.py
cat /app/test_result.md
cat /app/test_result.md
clear && cat /app/test_result.md
clear && tail -n 50 /app/test_result.md
"""
LLM Task Enrichment Script
Enriches task statements with automation scores, edge cases, and regulatory notes.
Uses GPT-4o via Emergent Integrations.
"""
import os
import json
import asyncio
import logging
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = MongoClient(mongo_url)
db = client[db_name]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BATCH_SIZE = 10  # Process tasks in batches to avoid rate limits

# Priority occupations to enrich first
PRIORITY_CODES = [
    "29-1141.00",  # Registered Nurses
    "15-1252.00",  # Software Developers
    "47-2111.00",  # Electricians
    "13-2011.00",  # Accountants and Auditors
    "23-1011.00",  # Lawyers
    "29-1215.00",  # Family Medicine Physicians
    "15-2051.00",  # Data Scientists
    "47-2152.00",  # Plumbers
    "15-1299.08",  # Computer Systems Engineers/Architects
    "29-2061.00",  # Licensed Practical Nurses
    "13-1111.00",  # Management Analysts
    "43-3031.00",  # Bookkeeping Clerks
    "11-1021.00",  # General and Operations Managers
    "15-1232.00",  # Computer User Support Specialists
    "41-3011.00",  # Advertising Sales Agents
    "39-9011.00",  # Childcare Workers
    "25-2021.00",  # Elementary School Teachers
    "33-3051.00",  # Police and Sheriff's Patrol Officers
    "53-3032.00",  # Heavy and Tractor-Trailer Truck Drivers
    "35-2014.00",  # Cooks, Restaurant
]


async def enrich_task(task, occupation_title, llm_key):
    """Enrich a single task with automation data using LLM"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import uuid

    prompt = f"""Given this task in occupation "{occupation_title}":
Statement: "{task['statement_en']}"

1. Automatable score (0.0-1.0) – how suitable for RPA/LLM/agent automation.
2. Suggested automation type: RPA, LLM, Hybrid, or Low (human-only).
3. Common edge cases (list 2-4 real-world exceptions).
4. Canada/Québec-specific regulatory notes (if any – privacy, permits, etc.).

Output ONLY valid JSON:
{{
  "automatable_score": 0.XX,
  "automation_type": "...",
  "edge_cases": "text",
  "quebec_notes": "text or null"
}}"""

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"enrich-{uuid.uuid4()}",
            system_message="You are an automation analyst. Output only valid JSON. No markdown, no explanation."
        ).with_model("openai", "gpt-4o")

        response = await chat.send_message(UserMessage(text=prompt))

        # Parse JSON from response
        # Clean up response - remove markdown code blocks if present
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        if clean.startswith("json"):
            clean = clean[4:].strip()

        data = json.loads(clean)
        return {
            "automatable_score": float(data.get("automatable_score", 0)),
            "automation_type": data.get("automation_type", "Low"),
            "edge_cases": data.get("edge_cases", ""),
            "quebec_notes": data.get("quebec_notes"),
            "enriched": True,
        }
    except Exception as e:
        logger.warning(f"Failed to enrich task {task.get('task_id')}: {e}")
        return None


async def enrich_occupation_tasks(onet_code, llm_key):
    """Enrich all tasks for a given occupation"""
    occ = db.occupations.find_one({"onet_code": onet_code}, {"_id": 0})
    if not occ:
        logger.warning(f"Occupation {onet_code} not found")
        return 0

    title = occ.get("title_en", onet_code)
    tasks = list(db.tasks.find(
        {"onet_code": onet_code, "enriched": {"$ne": True}},
        {"_id": 0}
    ))

    if not tasks:
        logger.info(f"  No unenriched tasks for {onet_code}")
        return 0

    logger.info(f"  Enriching {len(tasks)} tasks for {title} ({onet_code})")
    enriched_count = 0

    for i in range(0, len(tasks), BATCH_SIZE):
        batch = tasks[i:i + BATCH_SIZE]
        for task in batch:
            result = await enrich_task(task, title, llm_key)
            if result:
                db.tasks.update_one(
                    {"onet_code": onet_code, "task_id": task["task_id"]},
                    {"$set": result}
                )
                enriched_count += 1

        # Small delay between batches
        if i + BATCH_SIZE < len(tasks):
            await asyncio.sleep(0.5)

    logger.info(f"  Enriched {enriched_count}/{len(tasks)} tasks for {title}")
    return enriched_count


async def main():
    llm_key = os.environ.get('EMERGENT_LLM_KEY')
    if not llm_key:
        logger.error("EMERGENT_LLM_KEY not set in environment")
        return

    print("=" * 60)
    print("LLM Task Enrichment - FULL RUN")
    print("=" * 60)

    total_enriched = 0

    # Enrich priority occupations first
    for code in PRIORITY_CODES:
        count = await enrich_occupation_tasks(code, llm_key)
        total_enriched += count

    # Then enrich ALL remaining occupations
    from pymongo import MongoClient as SyncClient
    sync_client = SyncClient(mongo_url)
    sync_db = sync_client[db_name]

    # Get all occupation codes that still have unenriched tasks
    pipeline = [
        {"$match": {"enriched": {"$ne": True}}},
        {"$group": {"_id": "$onet_code"}},
    ]
    unenriched_codes = [doc["_id"] for doc in sync_db.tasks.aggregate(pipeline)]
    logger.info(f"Found {len(unenriched_codes)} occupations with unenriched tasks")
    sync_client.close()

    for i, code in enumerate(unenriched_codes):
        count = await enrich_occupation_tasks(code, llm_key)
        total_enriched += count
        if (i + 1) % 20 == 0:
            logger.info(f"Progress: {i+1}/{len(unenriched_codes)} occupations processed, {total_enriched} total enriched")

    print(f"\nTotal enriched: {total_enriched} tasks")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
