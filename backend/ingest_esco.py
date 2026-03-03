"""
ESCO v1.2.1 Data Ingestion Script
Fetches occupations from the ESCO API and stores in MongoDB.
Also fetches skills/competences linked to each occupation.
"""
import os
import json
import time
import logging
import re
import requests
from pathlib import Path
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv(Path(__file__).parent / '.env')

ESCO_API_BASE = "https://ec.europa.eu/esco/api"
ESCO_VERSION = "v1.2.1"
ESCO_SCHEME = "http://data.europa.eu/esco/concept-scheme/occupations"
ESCO_ATTRIBUTION = "Contains ESCO v1.2.1 data, European Commission. Licensed under EU Open Data (commercial use permitted)."

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = MongoClient(mongo_url)
db = client[db_name]

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

session = requests.Session()
session.headers.update({"Accept": "application/json"})


def esco_search_occupations(offset=0, limit=100):
    """Search ESCO occupations"""
    url = f"{ESCO_API_BASE}/search"
    params = {
        "type": "occupation",
        "language": "en",
        "full": "false",
        "limit": limit,
        "offset": offset,
        "selectedVersion": ESCO_VERSION,
        "isInScheme": ESCO_SCHEME,
    }
    try:
        r = session.get(url, params=params, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"ESCO search failed at offset {offset}: {e}")
        return None


def esco_get_occupation(uri):
    """Get full occupation details including skills"""
    url = f"{ESCO_API_BASE}/resource/occupation"
    params = {
        "uri": uri,
        "language": "en",
        "selectedVersion": ESCO_VERSION,
    }
    try:
        r = session.get(url, params=params, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.warning(f"Failed to get occupation {uri}: {e}")
        return None


def extract_esco_code(uri):
    """Extract ESCO UUID from URI"""
    if uri:
        parts = uri.rsplit('/', 1)
        if len(parts) > 1:
            return parts[-1]
    return uri


def extract_isco_code(data):
    """Extract ISCO-08 code from ESCO data"""
    broader = data.get("_links", {}).get("broaderIscoGroup", [])
    if broader:
        if isinstance(broader, list) and broader:
            uri = broader[0].get("uri", "")
        elif isinstance(broader, dict):
            uri = broader.get("uri", "")
        else:
            return None
        match = re.search(r'/isco/group/(\d+)', uri)
        if match:
            return match.group(1)
    return None


def make_slug(title):
    slug = title.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    return slug


def ingest_esco_occupations():
    """Fetch and store all ESCO occupations"""
    logger.info("Fetching ESCO occupations...")

    # First, get the total count
    result = esco_search_occupations(offset=0, limit=1)
    if not result:
        logger.error("Failed to connect to ESCO API")
        return
    total = result.get("total", 0)
    logger.info(f"Total ESCO occupations: {total}")

    all_occs = []
    offset = 0
    limit = 100

    while offset < min(total, 3100):
        result = esco_search_occupations(offset=offset, limit=limit)
        if not result:
            logger.warning(f"  Failed at offset {offset}, retrying...")
            time.sleep(2)
            result = esco_search_occupations(offset=offset, limit=limit)
            if not result:
                break
        results = result.get("_embedded", {}).get("results", [])
        if not results:
            break

        for r in results:
            all_occs.append({
                "uri": r.get("uri", ""),
                "title": r.get("title", ""),
            })

        offset += limit
        logger.info(f"  Fetched {min(offset, total)}/{total} occupations...")
        time.sleep(0.5)  # Rate limit

    logger.info(f"Total fetched: {len(all_occs)}")

    # Now get details for a batch (full details for top 500, basic for rest)
    docs = []
    detail_count = 0

    for i, occ in enumerate(all_occs):
        uri = occ["uri"]
        esco_code = extract_esco_code(uri)
        title_en = occ["title"]

        doc = {
            "esco_code": esco_code,
            "esco_uri": uri,
            "title_en": title_en,
            "slug": make_slug(title_en) + f"-esco-{esco_code[:8]}",
            "source": "ESCO v1.2.1",
            "attribution": ESCO_ATTRIBUTION,
            "country_scope": ["EU"],
        }

        # Get full details for first 500 (with skills/description)
        if i < 500:
            details = esco_get_occupation(uri)
            if details:
                desc = details.get("description", {})
                if isinstance(desc, dict):
                    doc["definition_en"] = desc.get("en", {}).get("literal", "") if isinstance(desc.get("en"), dict) else str(desc.get("en", ""))
                elif isinstance(desc, str):
                    doc["definition_en"] = desc

                doc["isco_code"] = extract_isco_code(details)

                # Get French title/description if available
                pref_labels = details.get("preferredLabel", {})
                if isinstance(pref_labels, dict) and "fr" in pref_labels:
                    doc["title_fr"] = pref_labels["fr"]

                desc_labels = details.get("description", {})
                if isinstance(desc_labels, dict) and "fr" in desc_labels:
                    fr_desc = desc_labels["fr"]
                    if isinstance(fr_desc, dict):
                        doc["definition_fr"] = fr_desc.get("literal", "")
                    elif isinstance(fr_desc, str):
                        doc["definition_fr"] = fr_desc

                # Extract essential skills
                essential_skills = details.get("_links", {}).get("hasEssentialSkill", [])
                if essential_skills:
                    doc["essential_skills"] = [
                        {"uri": s.get("uri", ""), "title": s.get("title", "")}
                        for s in (essential_skills if isinstance(essential_skills, list) else [essential_skills])
                    ]

                optional_skills = details.get("_links", {}).get("hasOptionalSkill", [])
                if optional_skills:
                    doc["optional_skills"] = [
                        {"uri": s.get("uri", ""), "title": s.get("title", "")}
                        for s in (optional_skills if isinstance(optional_skills, list) else [optional_skills])
                    ]

                detail_count += 1
                if detail_count % 50 == 0:
                    logger.info(f"  Detailed: {detail_count}/500")
                time.sleep(0.2)

        docs.append(doc)

    if docs:
        db.esco_occupations.drop()
        db.esco_occupations.insert_many(docs)
        db.esco_occupations.create_index([("esco_code", ASCENDING)], unique=True)
        db.esco_occupations.create_index([("title_en", "text")])
        db.esco_occupations.create_index([("isco_code", ASCENDING)])
        logger.info(f"Inserted {len(docs)} ESCO occupations ({detail_count} with full details)")


def build_esco_onet_crosswalk():
    """Build ESCO ↔ O*NET crosswalk using fuzzy title matching"""
    logger.info("Building ESCO ↔ O*NET crosswalk via title matching...")

    onet_occs = list(db.occupations.find({"onet_code": {"$exists": True}}, {"_id": 0, "onet_code": 1, "title_en": 1}))
    esco_occs = list(db.esco_occupations.find({}, {"_id": 0, "esco_code": 1, "title_en": 1}))

    # Build normalized title lookup for O*NET
    onet_lookup = {}
    for o in onet_occs:
        normalized = o["title_en"].lower().strip()
        onet_lookup[normalized] = o["onet_code"]
        # Also try without parenthetical parts
        clean = re.sub(r'\s*\(.*?\)', '', normalized).strip()
        if clean != normalized:
            onet_lookup[clean] = o["onet_code"]

    matches = []
    for e in esco_occs:
        e_title = e["title_en"].lower().strip()
        # Exact match
        if e_title in onet_lookup:
            matches.append({
                "source_system": "ESCO",
                "source_code": e["esco_code"],
                "source_title": e["title_en"],
                "target_system": "O*NET",
                "target_code": onet_lookup[e_title],
                "match_type": "exact",
            })
            continue

        # Partial match - check if ESCO title is contained in O*NET title or vice versa
        for onet_title, onet_code in onet_lookup.items():
            if len(e_title) > 5 and (e_title in onet_title or onet_title in e_title):
                matches.append({
                    "source_system": "ESCO",
                    "source_code": e["esco_code"],
                    "source_title": e["title_en"],
                    "target_system": "O*NET",
                    "target_code": onet_code,
                    "match_type": "partial",
                })
                break

    if matches:
        # Add to existing crosswalks
        db.crosswalks.insert_many(matches)
        db.crosswalks.create_index([("source_system", ASCENDING), ("source_code", ASCENDING)])
        logger.info(f"Added {len(matches)} ESCO ↔ O*NET crosswalk entries")

    return len(matches)


def update_stats():
    """Update platform statistics"""
    logger.info("Updating platform stats...")
    esco_count = db.esco_occupations.count_documents({})
    total_occ = db.occupations.count_documents({})
    total_crosswalks = db.crosswalks.count_documents({})

    sources = ["O*NET 30.2"]
    if db.noc_occupations.count_documents({}) > 0:
        sources.append("NOC 2021")
    if esco_count > 0:
        sources.append("ESCO v1.2.1")

    db.platform_stats.update_one(
        {},
        {"$set": {
            "total_occupations": total_occ + esco_count,
            "total_esco": esco_count,
            "total_crosswalks": total_crosswalks,
            "data_sources": sources,
        }},
        upsert=True,
    )
    logger.info(f"Stats: {total_occ} O*NET + {esco_count} ESCO = {total_occ + esco_count} total, {total_crosswalks} crosswalks")


if __name__ == "__main__":
    print("=" * 60)
    print("ESCO v1.2.1 Data Ingestion")
    print("=" * 60)

    ingest_esco_occupations()
    build_esco_onet_crosswalk()
    update_stats()

    print("\n" + "=" * 60)
    print("ESCO INGESTION COMPLETE")
    print("=" * 60)
