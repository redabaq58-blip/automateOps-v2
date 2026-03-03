"""
NOC 2021 + Crosswalk Ingestion Script
Parses NOC structure/elements CSVs and NOC ↔ O*NET crosswalk.
"""
import csv
import os
import re
from pathlib import Path
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv(Path(__file__).parent / '.env')

NOC_STRUCTURE = "/tmp/noc_structure.csv"
NOC_ELEMENTS = "/tmp/noc_elements.csv"
NOC_ONET_CROSSWALK = "/tmp/NOC_ONet_Crosswalk/noc2021_onet26.csv"

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = MongoClient(mongo_url)
db = client[db_name]

NOC_ATTRIBUTION = "Contains information from the National Occupational Classification (NOC) 2021, Statistics Canada. Licensed under the Open Government Licence - Canada."


def read_csv_bom(filepath):
    rows = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def make_slug(title):
    slug = title.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    return slug


def ingest_noc_structure():
    """Ingest NOC 2021 classification structure"""
    print("Ingesting NOC 2021 structure...")
    rows = read_csv_bom(NOC_STRUCTURE)

    noc_docs = []
    for row in rows:
        level = int(row.get('Level', 0))
        code = row.get('Code - NOC 2021 V1.0', '').strip()
        title = row.get('Class title', '').strip()
        definition = row.get('Class definition', '').strip()
        hierarchy = row.get('Hierarchical structure', '').strip()

        noc_docs.append({
            "noc_code": code,
            "level": level,
            "hierarchy_type": hierarchy,
            "title_en": title,
            "definition_en": definition,
            "source": "NOC 2021 V1.0",
            "attribution": NOC_ATTRIBUTION,
        })

    if noc_docs:
        db.noc_occupations.drop()
        db.noc_occupations.insert_many(noc_docs)
        db.noc_occupations.create_index([("noc_code", ASCENDING)], unique=True)
        db.noc_occupations.create_index([("level", ASCENDING)])
        db.noc_occupations.create_index([("title_en", "text")])
        print(f"  Inserted {len(noc_docs)} NOC entries ({sum(1 for d in noc_docs if d['level']==5)} unit groups)")


def ingest_noc_elements():
    """Ingest NOC 2021 elements (duties, examples, requirements)"""
    print("Ingesting NOC 2021 elements...")
    rows = read_csv_bom(NOC_ELEMENTS)

    # Group by code + element type
    grouped = defaultdict(list)
    for row in rows:
        code = row.get('Code - NOC 2021 V1.0', '').strip()
        elem_type = row.get('Element Type Label English', '').strip()
        desc = row.get('Element Description English', '').strip()
        grouped[(code, elem_type)].append(desc)

    docs = []
    for (code, elem_type), descriptions in grouped.items():
        docs.append({
            "noc_code": code,
            "element_type": elem_type,
            "descriptions": descriptions,
            "source": "NOC 2021 V1.0",
        })

    if docs:
        db.noc_elements.drop()
        db.noc_elements.insert_many(docs)
        db.noc_elements.create_index([("noc_code", ASCENDING)])
        db.noc_elements.create_index([("element_type", ASCENDING)])
        print(f"  Inserted {len(docs)} NOC element groups")


def ingest_crosswalk():
    """Ingest NOC 2021 ↔ O*NET crosswalk"""
    print("Ingesting NOC ↔ O*NET crosswalk...")
    rows = read_csv_bom(NOC_ONET_CROSSWALK)

    docs = []
    for row in rows:
        noc_code = row.get('noc', '').strip()
        noc_title = row.get('noc_title', '').strip()
        onet_code = row.get('onet', '').strip()
        onet_title = row.get('onet_title', '').strip()

        docs.append({
            "source_system": "NOC 2021",
            "source_code": noc_code,
            "source_title": noc_title,
            "target_system": "O*NET",
            "target_code": onet_code,
            "target_title": onet_title,
        })

    if docs:
        db.crosswalks.drop()
        db.crosswalks.insert_many(docs)
        db.crosswalks.create_index([("source_system", ASCENDING), ("source_code", ASCENDING)])
        db.crosswalks.create_index([("target_system", ASCENDING), ("target_code", ASCENDING)])
        print(f"  Inserted {len(docs)} crosswalk mappings")


def update_occupations_with_noc():
    """Link O*NET occupations with NOC codes using the crosswalk"""
    print("Linking O*NET occupations with NOC codes...")
    crosswalk_cursor = db.crosswalks.find({"source_system": "NOC 2021", "target_system": "O*NET"}, {"_id": 0})
    crosswalks = list(crosswalk_cursor)

    # Build onet_code -> list of noc_codes mapping
    onet_to_noc = defaultdict(list)
    for cw in crosswalks:
        onet_to_noc[cw["target_code"]].append(cw["source_code"])

    updated = 0
    for onet_code, noc_codes in onet_to_noc.items():
        result = db.occupations.update_one(
            {"onet_code": onet_code},
            {"$set": {
                "noc_codes": noc_codes,
                "country_scope": ["US", "CA"],
            }}
        )
        if result.modified_count > 0:
            updated += 1

    print(f"  Updated {updated} occupations with NOC codes")

    # Also create standalone NOC occupation entries for those not in O*NET
    noc_unit_groups = list(db.noc_occupations.find({"level": 5}, {"_id": 0}))
    existing_noc = set()
    for cw in crosswalks:
        existing_noc.add(cw["source_code"])

    standalone = []
    for noc in noc_unit_groups:
        if noc["noc_code"] not in existing_noc:
            # Get duties from elements
            duties = db.noc_elements.find_one(
                {"noc_code": noc["noc_code"], "element_type": "Main duties"},
                {"_id": 0}
            )
            standalone.append({
                "noc_code": noc["noc_code"],
                "title_en": noc["title_en"],
                "definition_en": noc.get("definition_en", ""),
                "slug": make_slug(noc["title_en"]) + f"-noc-{noc['noc_code']}",
                "country_scope": ["CA"],
                "source": "NOC 2021",
                "attribution": NOC_ATTRIBUTION,
                "noc_duties": duties.get("descriptions", []) if duties else [],
            })

    if standalone:
        # Insert as additional occupations (with noc_code as identifier)
        for doc in standalone:
            db.occupations.update_one(
                {"noc_code": doc["noc_code"], "source": "NOC 2021"},
                {"$set": doc},
                upsert=True,
            )
        print(f"  Added {len(standalone)} standalone NOC occupations")


def update_platform_stats():
    """Update platform statistics"""
    print("Updating platform stats...")
    total_occ = db.occupations.count_documents({})
    total_tasks = db.tasks.count_documents({})
    total_skills = db.skills.count_documents({})
    total_tools = db.tools_technology.count_documents({})
    total_crosswalks = db.crosswalks.count_documents({})

    db.platform_stats.update_one(
        {},
        {"$set": {
            "total_occupations": total_occ,
            "total_tasks": total_tasks,
            "total_skills": total_skills,
            "total_tools": total_tools,
            "total_crosswalks": total_crosswalks,
            "data_sources": ["O*NET 30.2", "NOC 2021"],
        }},
        upsert=True,
    )
    print(f"  Stats: {total_occ} occupations, {total_crosswalks} crosswalk mappings")


if __name__ == "__main__":
    print("=" * 60)
    print("NOC 2021 + Crosswalk Ingestion")
    print("=" * 60)

    ingest_noc_structure()
    ingest_noc_elements()
    ingest_crosswalk()
    update_occupations_with_noc()
    update_platform_stats()

    print("\n" + "=" * 60)
    print("NOC INGESTION COMPLETE")
    print("=" * 60)
