"""
OaSIS 2025 Data Scraper
Scrapes occupational profiles from the OaSIS (ESDC) website.
Since no bulk download/API exists, we scrape individual profiles for key NOC codes.
"""
import os
import re
import time
import logging
import requests
from pathlib import Path
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv(Path(__file__).parent / '.env')

OASIS_BASE = "https://noc.esdc.gc.ca/Oasis"
OASIS_ATTRIBUTION = "Contains information from OaSIS 2025, Employment and Social Development Canada (ESDC). Licensed under the Open Government Licence - Canada."

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = MongoClient(mongo_url)
db = client[db_name]

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

session = requests.Session()
session.headers.update({
    "User-Agent": "automateOps-data/1.0 (research; occupation data aggregation)",
    "Accept": "text/html,application/xhtml+xml",
})

# Priority NOC codes to scrape (unit group level - 5 digits)
PRIORITY_NOC_CODES = [
    "10010", "10011", "10012", "10019", "10020",  # Senior managers
    "11100", "11101", "11102", "11109",  # Financial managers
    "20010", "20011", "20012",  # Engineers
    "21210", "21211", "21220", "21221", "21222", "21223",  # IT
    "21230", "21231", "21232", "21233", "21234",  # More IT
    "30010", "31100", "31101", "31102", "31103",  # Health
    "31200", "31201", "31202", "31203", "31209",  # More health
    "31301", "31302", "31303",  # Nurses
    "32100", "32101", "32102", "32103", "32109",  # Med techs
    "40020", "40021", "41100", "41200", "41201",  # Education
    "42100", "42201", "42202", "42203",  # Legal/social
    "43100", "43109", "43200",  # Library
    "51100", "51101", "51102",  # Art/culture
    "60010", "62100", "63100", "63200",  # Sales/service
    "70010", "72010", "72011", "72012", "72013",  # Trades
    "72100", "72101", "72200", "72201",  # More trades
    "73100", "73101", "73200", "73201",  # Construction
    "80010", "82010", "82020", "82030",  # Resources
    "90010", "92010", "92011", "92012",  # Manufacturing
    "93100", "93101", "93200",  # Labourers
    "14100", "14101", "14110", "14200", "14201",  # Admin/office
]


def scrape_oasis_profile(noc_code):
    """Scrape an OaSIS occupation profile page"""
    url = f"{OASIS_BASE}/OasisSearchResult"
    params = {
        "GocTemplateCulture": "en-CA",
        "version": "2025.0",
        "code": noc_code,
    }

    try:
        r = session.get(url, params=params, timeout=30)
        if r.status_code != 200:
            return None

        soup = BeautifulSoup(r.text, 'html.parser')
        profile = {"noc_code": noc_code, "source": "OaSIS 2025"}

        # Get title
        title_el = soup.find('h1') or soup.find('h2')
        if title_el:
            profile["title_en"] = title_el.get_text(strip=True)

        # Extract all data tables and lists
        skills = []
        abilities = []
        knowledge = []
        interests = []
        work_activities = []
        work_context = []
        personal_attributes = []

        # Find data sections by looking for specific patterns
        tables = soup.find_all('table')
        for table in tables:
            headers = [th.get_text(strip=True) for th in table.find_all('th')]
            rows = table.find_all('tr')

            # Determine what kind of data this table contains
            caption = table.find('caption')
            caption_text = caption.get_text(strip=True).lower() if caption else ""
            prev_header = table.find_previous(['h2', 'h3', 'h4'])
            section_title = prev_header.get_text(strip=True).lower() if prev_header else ""

            data_type = None
            if 'skill' in section_title or 'skill' in caption_text:
                data_type = 'skills'
            elif 'abilit' in section_title or 'abilit' in caption_text:
                data_type = 'abilities'
            elif 'knowledge' in section_title or 'knowledge' in caption_text:
                data_type = 'knowledge'
            elif 'interest' in section_title or 'interest' in caption_text:
                data_type = 'interests'
            elif 'activit' in section_title or 'activit' in caption_text:
                data_type = 'work_activities'
            elif 'context' in section_title or 'context' in caption_text:
                data_type = 'work_context'
            elif 'personal' in section_title or 'attribute' in caption_text:
                data_type = 'personal_attributes'

            if data_type:
                for row in rows[1:]:  # Skip header
                    cells = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
                    if len(cells) >= 2:
                        item = {"name": cells[0], "level": cells[1] if len(cells) > 1 else None}
                        if data_type == 'skills':
                            skills.append(item)
                        elif data_type == 'abilities':
                            abilities.append(item)
                        elif data_type == 'knowledge':
                            knowledge.append(item)
                        elif data_type == 'interests':
                            interests.append(item)
                        elif data_type == 'work_activities':
                            work_activities.append(item)
                        elif data_type == 'work_context':
                            work_context.append(item)
                        elif data_type == 'personal_attributes':
                            personal_attributes.append(item)

        # Also extract from definition lists (dl/dt/dd patterns)
        for dl in soup.find_all('dl'):
            prev_header = dl.find_previous(['h2', 'h3', 'h4'])
            section = prev_header.get_text(strip=True).lower() if prev_header else ""

            dts = dl.find_all('dt')
            dds = dl.find_all('dd')
            for dt, dd in zip(dts, dds):
                name = dt.get_text(strip=True)
                value = dd.get_text(strip=True)
                item = {"name": name, "value": value}

                if 'skill' in section:
                    skills.append(item)
                elif 'abilit' in section:
                    abilities.append(item)
                elif 'knowledge' in section:
                    knowledge.append(item)

        # Also extract list items from sections
        for section in soup.find_all(['section', 'div']):
            header = section.find(['h2', 'h3', 'h4'])
            if not header:
                continue
            header_text = header.get_text(strip=True).lower()

            items = section.find_all('li')
            for li in items:
                text = li.get_text(strip=True)
                if not text or len(text) < 3:
                    continue

                # Check for rating span
                rating = li.find(class_=re.compile(r'rating|level|score'))
                rating_val = rating.get_text(strip=True) if rating else None

                item = {"name": text, "level": rating_val}
                if 'skill' in header_text:
                    skills.append(item)
                elif 'abilit' in header_text:
                    abilities.append(item)
                elif 'knowledge' in header_text:
                    knowledge.append(item)
                elif 'interest' in header_text:
                    interests.append(item)
                elif 'activit' in header_text:
                    work_activities.append(item)

        if skills:
            profile["skills"] = skills
        if abilities:
            profile["abilities"] = abilities
        if knowledge:
            profile["knowledge"] = knowledge
        if interests:
            profile["interests"] = interests
        if work_activities:
            profile["work_activities"] = work_activities
        if work_context:
            profile["work_context"] = work_context
        if personal_attributes:
            profile["personal_attributes"] = personal_attributes

        profile["attribution"] = OASIS_ATTRIBUTION
        return profile

    except Exception as e:
        logger.warning(f"Failed to scrape NOC {noc_code}: {e}")
        return None


def ingest_oasis_profiles():
    """Scrape and store OaSIS profiles for priority NOC codes"""
    logger.info(f"Scraping {len(PRIORITY_NOC_CODES)} OaSIS profiles...")

    docs = []
    for i, code in enumerate(PRIORITY_NOC_CODES):
        profile = scrape_oasis_profile(code)
        if profile and profile.get("title_en"):
            docs.append(profile)
            if (i + 1) % 10 == 0:
                logger.info(f"  Scraped {i + 1}/{len(PRIORITY_NOC_CODES)} profiles ({len(docs)} successful)")
            time.sleep(1.0)  # Be respectful to the server
        else:
            logger.info(f"  Skipped NOC {code} (no data found or page not accessible)")
            time.sleep(0.5)

    if docs:
        db.oasis_profiles.drop()
        db.oasis_profiles.insert_many(docs)
        db.oasis_profiles.create_index([("noc_code", ASCENDING)], unique=True)
        logger.info(f"Inserted {len(docs)} OaSIS profiles")

    return len(docs)


def update_stats():
    """Update platform stats with OaSIS data"""
    oasis_count = db.oasis_profiles.count_documents({})
    sources = db.platform_stats.find_one({}, {"_id": 0, "data_sources": 1})
    current_sources = sources.get("data_sources", []) if sources else []
    if "OaSIS 2025" not in current_sources:
        current_sources.append("OaSIS 2025")

    db.platform_stats.update_one(
        {},
        {"$set": {
            "total_oasis": oasis_count,
            "data_sources": current_sources,
        }},
        upsert=True,
    )
    logger.info(f"OaSIS profiles: {oasis_count}")


if __name__ == "__main__":
    print("=" * 60)
    print("OaSIS 2025 Data Scraping")
    print("=" * 60)

    count = ingest_oasis_profiles()
    update_stats()

    print(f"\n{'=' * 60}")
    print(f"OaSIS SCRAPING COMPLETE - {count} profiles")
    print("=" * 60)
