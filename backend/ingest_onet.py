"""
O*NET 30.2 Data Ingestion Script
Parses tab-delimited files from O*NET database and inserts into MongoDB.
"""
import csv
import os
import sys
from pathlib import Path
from pymongo import MongoClient, TEXT, ASCENDING
from dotenv import load_dotenv
from collections import defaultdict
import re

load_dotenv(Path(__file__).parent / '.env')

ONET_DIR = "/tmp/onet_data/db_30_2_text"
ATTRIBUTION = "Includes O*NET 30.2 data, U.S. Department of Labor/Employment and Training Administration (USDOL/ETA). Licensed under CC BY 4.0."

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = MongoClient(mongo_url)
db = client[db_name]


def read_tsv(filename):
    filepath = os.path.join(ONET_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  SKIP: {filename} not found")
        return []
    rows = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            rows.append(row)
    return rows


def safe_float(val, default=None):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=None):
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def make_slug(title):
    slug = title.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    return slug


def ingest_occupations():
    print("Ingesting occupations...")
    rows = read_tsv("Occupation Data.txt")
    
    # Get job zones
    jz_rows = read_tsv("Job Zones.txt")
    job_zones = {}
    for r in jz_rows:
        job_zones[r['O*NET-SOC Code']] = safe_int(r.get('Job Zone'))
    
    docs = []
    for row in rows:
        code = row['O*NET-SOC Code']
        title = row['Title']
        desc = row['Description']
        
        # Extract major group from code (first 2 digits)
        major_group = code.split('-')[0] if '-' in code else code[:2]
        
        docs.append({
            "onet_code": code,
            "title_en": title,
            "definition_en": desc,
            "slug": make_slug(title),
            "job_zone": job_zones.get(code),
            "major_group": major_group,
            "country_scope": ["US"],
            "source": "O*NET 30.2",
            "attribution": ATTRIBUTION,
        })
    
    if docs:
        db.occupations.drop()
        db.occupations.insert_many(docs)
        db.occupations.create_index([("onet_code", ASCENDING)], unique=True)
        db.occupations.create_index([("slug", ASCENDING)])
        db.occupations.create_index([("title_en", TEXT), ("definition_en", TEXT)])
        db.occupations.create_index([("major_group", ASCENDING)])
        print(f"  Inserted {len(docs)} occupations")


def ingest_tasks():
    print("Ingesting task statements...")
    statements = read_tsv("Task Statements.txt")
    
    # Get task ratings for importance
    ratings = read_tsv("Task Ratings.txt")
    # Build importance lookup: task_id -> {importance, frequency}
    task_metrics = defaultdict(lambda: {"importance": None, "frequency": None})
    for r in ratings:
        task_id = r.get('Task ID')
        scale = r.get('Scale ID')
        val = safe_float(r.get('Data Value'))
        if scale == 'IM':  # Importance
            task_metrics[task_id]["importance"] = val
        elif scale == 'FT' and r.get('Category') == '':
            pass  # FT is frequency distribution, skip categories
    
    # For frequency, we need the RT (relevance) scale  
    # Actually Task Ratings has FT with categories 1-7 (frequency dist)
    # Let's compute weighted average frequency
    freq_sums = defaultdict(lambda: {"weighted": 0, "total": 0})
    for r in ratings:
        task_id = r.get('Task ID')
        scale = r.get('Scale ID')
        cat = r.get('Category', '')
        val = safe_float(r.get('Data Value'), 0)
        if scale == 'FT' and cat:
            cat_num = safe_int(cat, 0)
            if cat_num > 0:
                freq_sums[task_id]["weighted"] += cat_num * val
                freq_sums[task_id]["total"] += val

    for task_id, data in freq_sums.items():
        if data["total"] > 0:
            task_metrics[task_id]["frequency"] = round(data["weighted"] / data["total"], 2)
    
    # Also get RT (relevance/task importance scale)
    for r in ratings:
        task_id = r.get('Task ID')
        scale = r.get('Scale ID')
        val = safe_float(r.get('Data Value'))
        if scale == 'RT':
            task_metrics[task_id]["importance"] = val

    docs = []
    for row in statements:
        code = row['O*NET-SOC Code']
        task_id = row['Task ID']
        metrics = task_metrics.get(task_id, {})
        
        docs.append({
            "onet_code": code,
            "task_id": task_id,
            "statement_en": row['Task'],
            "task_type": row.get('Task Type', 'Core'),
            "importance": metrics.get("importance"),
            "frequency": metrics.get("frequency"),
            "source": "O*NET 30.2",
        })
    
    if docs:
        db.tasks.drop()
        db.tasks.insert_many(docs)
        db.tasks.create_index([("onet_code", ASCENDING)])
        db.tasks.create_index([("statement_en", TEXT)])
        print(f"  Inserted {len(docs)} tasks")


def ingest_ksa(collection_name, filename, element_prefix=None):
    """Generic ingester for Skills, Knowledge, Abilities"""
    print(f"Ingesting {collection_name}...")
    rows = read_tsv(filename)
    
    # Group by onet_code + element_name, separate IM (importance) and LV (level)
    grouped = defaultdict(lambda: {"importance": None, "level": None})
    for r in rows:
        code = r['O*NET-SOC Code']
        name = r['Element Name']
        scale = r.get('Scale ID', '')
        val = safe_float(r.get('Data Value'))
        key = (code, name, r.get('Element ID', ''))
        
        if scale == 'IM':
            grouped[key]["importance"] = val
        elif scale == 'LV':
            grouped[key]["level"] = val
    
    docs = []
    for (code, name, elem_id), metrics in grouped.items():
        docs.append({
            "onet_code": code,
            "element_id": elem_id,
            "name": name,
            "importance": metrics["importance"],
            "level": metrics["level"],
            "source": "O*NET 30.2",
        })
    
    if docs:
        db[collection_name].drop()
        db[collection_name].insert_many(docs)
        db[collection_name].create_index([("onet_code", ASCENDING)])
        print(f"  Inserted {len(docs)} {collection_name} records")


def ingest_work_activities():
    print("Ingesting work activities...")
    rows = read_tsv("Work Activities.txt")
    
    grouped = defaultdict(lambda: {"importance": None, "level": None})
    for r in rows:
        code = r['O*NET-SOC Code']
        name = r['Element Name']
        scale = r.get('Scale ID', '')
        val = safe_float(r.get('Data Value'))
        key = (code, name, r.get('Element ID', ''))
        
        if scale == 'IM':
            grouped[key]["importance"] = val
        elif scale == 'LV':
            grouped[key]["level"] = val
    
    docs = []
    for (code, name, elem_id), metrics in grouped.items():
        docs.append({
            "onet_code": code,
            "element_id": elem_id,
            "name": name,
            "importance": metrics["importance"],
            "level": metrics["level"],
            "source": "O*NET 30.2",
        })
    
    if docs:
        db.work_activities.drop()
        db.work_activities.insert_many(docs)
        db.work_activities.create_index([("onet_code", ASCENDING)])
        print(f"  Inserted {len(docs)} work activities")


def ingest_work_context():
    print("Ingesting work context...")
    rows = read_tsv("Work Context.txt")
    
    # Work context has CX (mean) and CXP (category percentages)
    grouped = defaultdict(lambda: {"value": None, "categories": {}})
    for r in rows:
        code = r['O*NET-SOC Code']
        name = r['Element Name']
        scale = r.get('Scale ID', '')
        val = safe_float(r.get('Data Value'))
        cat = r.get('Category', '')
        key = (code, name, r.get('Element ID', ''))
        
        if scale == 'CX':
            grouped[key]["value"] = val
        elif scale == 'CXP' and cat:
            grouped[key]["categories"][cat] = val
    
    docs = []
    for (code, name, elem_id), metrics in grouped.items():
        docs.append({
            "onet_code": code,
            "element_id": elem_id,
            "name": name,
            "value": metrics["value"],
            "categories": metrics["categories"],
            "source": "O*NET 30.2",
        })
    
    if docs:
        db.work_context.drop()
        db.work_context.insert_many(docs)
        db.work_context.create_index([("onet_code", ASCENDING)])
        print(f"  Inserted {len(docs)} work context records")


def ingest_tools_technology():
    print("Ingesting tools & technology...")
    # Tools Used
    tools = read_tsv("Tools Used.txt")
    # Technology Skills
    tech = read_tsv("Technology Skills.txt")
    
    docs = []
    for r in tools:
        docs.append({
            "onet_code": r['O*NET-SOC Code'],
            "name": r['Example'],
            "category": r.get('Commodity Title', ''),
            "commodity_code": r.get('Commodity Code', ''),
            "type": "tool",
            "hot_technology": False,
            "in_demand": False,
            "source": "O*NET 30.2",
        })
    
    for r in tech:
        docs.append({
            "onet_code": r['O*NET-SOC Code'],
            "name": r['Example'],
            "category": r.get('Commodity Title', ''),
            "commodity_code": r.get('Commodity Code', ''),
            "type": "technology",
            "hot_technology": r.get('Hot Technology', 'N') == 'Y',
            "in_demand": r.get('In Demand', 'N') == 'Y',
            "source": "O*NET 30.2",
        })
    
    if docs:
        db.tools_technology.drop()
        db.tools_technology.insert_many(docs)
        db.tools_technology.create_index([("onet_code", ASCENDING)])
        db.tools_technology.create_index([("hot_technology", ASCENDING)])
        print(f"  Inserted {len(docs)} tools & technology records")


def ingest_education():
    print("Ingesting education requirements...")
    rows = read_tsv("Education, Training, and Experience.txt")
    
    # Education has RL (required level) with categories
    grouped = defaultdict(lambda: {"categories": {}})
    for r in rows:
        code = r['O*NET-SOC Code']
        name = r['Element Name']
        scale = r.get('Scale ID', '')
        val = safe_float(r.get('Data Value'))
        cat = r.get('Category', '')
        key = (code, name, r.get('Element ID', ''))
        
        if cat:
            grouped[key]["categories"][cat] = val
        else:
            grouped[key]["value"] = val
    
    docs = []
    for (code, name, elem_id), metrics in grouped.items():
        docs.append({
            "onet_code": code,
            "element_id": elem_id,
            "name": name,
            "categories": metrics.get("categories", {}),
            "value": metrics.get("value"),
            "source": "O*NET 30.2",
        })
    
    if docs:
        db.education.drop()
        db.education.insert_many(docs)
        db.education.create_index([("onet_code", ASCENDING)])
        print(f"  Inserted {len(docs)} education records")


def ingest_related_occupations():
    print("Ingesting related occupations...")
    rows = read_tsv("Related Occupations.txt")
    
    docs = []
    for r in rows:
        docs.append({
            "onet_code": r['O*NET-SOC Code'],
            "related_code": r['Related O*NET-SOC Code'],
            "tier": r.get('Relatedness Tier', ''),
            "index": safe_int(r.get('Index')),
            "source": "O*NET 30.2",
        })
    
    if docs:
        db.related_occupations.drop()
        db.related_occupations.insert_many(docs)
        db.related_occupations.create_index([("onet_code", ASCENDING)])
        print(f"  Inserted {len(docs)} related occupation records")


def ingest_work_styles():
    print("Ingesting work styles...")
    rows = read_tsv("Work Styles.txt")
    
    grouped = defaultdict(lambda: {"importance": None, "level": None})
    for r in rows:
        code = r['O*NET-SOC Code']
        name = r['Element Name']
        scale = r.get('Scale ID', '')
        val = safe_float(r.get('Data Value'))
        key = (code, name, r.get('Element ID', ''))
        
        if scale in ('DR', 'IM'):
            grouped[key]["importance"] = val
        elif scale in ('WI', 'LV'):
            grouped[key]["level"] = val
    
    docs = []
    for (code, name, elem_id), metrics in grouped.items():
        docs.append({
            "onet_code": code,
            "element_id": elem_id,
            "name": name,
            "importance": metrics["importance"],
            "level": metrics["level"],
            "source": "O*NET 30.2",
        })
    
    if docs:
        db.work_styles.drop()
        db.work_styles.insert_many(docs)
        db.work_styles.create_index([("onet_code", ASCENDING)])
        print(f"  Inserted {len(docs)} work styles records")


def create_industry_groups():
    """Create industry group mappings from O*NET major groups"""
    print("Creating industry groups...")
    major_groups = {
        "11": "Management",
        "13": "Business and Financial Operations",
        "15": "Computer and Mathematical",
        "17": "Architecture and Engineering",
        "19": "Life, Physical, and Social Science",
        "21": "Community and Social Service",
        "23": "Legal",
        "25": "Educational Instruction and Library",
        "27": "Arts, Design, Entertainment, Sports, and Media",
        "29": "Healthcare Practitioners and Technical",
        "31": "Healthcare Support",
        "33": "Protective Service",
        "35": "Food Preparation and Serving Related",
        "37": "Building and Grounds Cleaning and Maintenance",
        "39": "Personal Care and Service",
        "41": "Sales and Related",
        "43": "Office and Administrative Support",
        "45": "Farming, Fishing, and Forestry",
        "47": "Construction and Extraction",
        "49": "Installation, Maintenance, and Repair",
        "51": "Production",
        "53": "Transportation and Material Moving",
        "55": "Military Specific",
    }
    
    docs = []
    for code, name in major_groups.items():
        count = db.occupations.count_documents({"major_group": code})
        docs.append({
            "group_code": code,
            "name": name,
            "occupation_count": count,
        })
    
    db.industry_groups.drop()
    if docs:
        db.industry_groups.insert_many(docs)
        print(f"  Created {len(docs)} industry groups")


def create_platform_stats():
    """Create platform statistics"""
    print("Creating platform stats...")
    stats = {
        "total_occupations": db.occupations.count_documents({}),
        "total_tasks": db.tasks.count_documents({}),
        "total_skills": db.skills.count_documents({}),
        "total_tools": db.tools_technology.count_documents({}),
        "data_sources": ["O*NET 30.2"],
        "attribution": ATTRIBUTION,
    }
    db.platform_stats.drop()
    db.platform_stats.insert_one(stats)
    print(f"  Stats: {stats['total_occupations']} occupations, {stats['total_tasks']} tasks")


if __name__ == "__main__":
    print("=" * 60)
    print("O*NET 30.2 Data Ingestion")
    print("=" * 60)
    
    ingest_occupations()
    ingest_tasks()
    ingest_ksa("skills", "Skills.txt")
    ingest_ksa("knowledge", "Knowledge.txt")
    ingest_ksa("abilities", "Abilities.txt")
    ingest_work_activities()
    ingest_work_context()
    ingest_tools_technology()
    ingest_education()
    ingest_related_occupations()
    ingest_work_styles()
    create_industry_groups()
    create_platform_stats()
    
    print("\n" + "=" * 60)
    print("INGESTION COMPLETE")
    print("=" * 60)
