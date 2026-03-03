"""
Workflow Templates Ingestion Script
Parses real-world playbooks from GitHub repos and maps them to O*NET occupations
NO LLM calls - pure data parsing
"""

import os
import re
import uuid
from pathlib import Path
from typing import List, Dict, Optional
from pymongo import MongoClient
from dotenv import load_dotenv
import markdown
from bs4 import BeautifulSoup

# Load environment
load_dotenv(Path('/app/backend/.env'))
client = MongoClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# Occupation keyword mapping (for automatic linking to O*NET codes)
OCCUPATION_KEYWORDS = {
    "security analyst": ["15-1212.00", "33-3021.06"],  # InfoSec Analysts, Cybersecurity
    "soc analyst": ["15-1212.00"],
    "incident response": ["15-1212.00"],
    "cybersecurity": ["15-1212.00"],
    "developer": ["15-1252.00", "15-1256.00"],  # Software Developers
    "devsecops": ["15-1252.00", "15-1212.00"],
    "devops": ["15-1252.00"],
    "cto": ["11-3021.00"],  # Computer and Information Systems Managers
    "engineering manager": ["11-3021.00"],
    "startup": ["11-1021.00"],  # General and Operations Managers
    "marketing": ["11-2021.00", "13-1161.00"],  # Marketing Managers, Market Research
    "growth": ["11-2021.00"],
    "sales": ["41-3099.00", "41-4011.00"],  # Sales Representatives
    "account manager": ["13-1199.00"],
    "client onboarding": ["13-1199.00", "41-3099.00"],
    "operations": ["11-3051.00"],  # Operations Managers
    "project manager": ["11-9199.00"],
    "hr": ["11-3121.00"],  # Human Resources Managers
    "hiring": ["11-3121.00"],
    "recruiter": ["13-1071.00"],
}

# Task keyword mapping (for linking to specific tasks)
TASK_KEYWORDS = {
    "incident": ["Respond to system security breaches", "Investigate security incidents"],
    "monitoring": ["Monitor system performance", "Track security events"],
    "analysis": ["Analyze data", "Conduct analysis"],
    "reporting": ["Prepare reports", "Document findings"],
    "client": ["Manage client relationships", "Communicate with clients"],
    "onboarding": ["Onboard new clients", "Complete intake processes"],
}


def extract_title(content: str, filename: str) -> str:
    """Extract title from markdown content or filename"""
    # Try to find H1 heading
    h1_match = re.search(r'^#\s+(.+?)$', content, re.M)
    if h1_match:
        return h1_match.group(1).strip()
    
    # Fallback to filename
    return filename.replace('.md', '').replace('-', ' ').replace('_', ' ').title()


def extract_steps(content: str) -> List[Dict]:
    """Extract numbered steps or sections from markdown"""
    steps = []
    
    # Method 1: Look for numbered lists
    numbered_pattern = r'^\d+\.\s+(.+?)(?=\n\d+\.|\n##|\n$)'
    matches = re.findall(numbered_pattern, content, re.M | re.S)
    
    if matches:
        for i, step_text in enumerate(matches, 1):
            steps.append({
                "order": i,
                "action": step_text.strip()[:500],  # Limit length
                "tools": extract_tools_from_text(step_text),
                "notes": ""
            })
    else:
        # Method 2: Look for H2/H3 sections
        section_pattern = r'^#{2,3}\s+(.+?)$'
        sections = re.findall(section_pattern, content, re.M)
        
        for i, section in enumerate(sections[:20], 1):  # Max 20 steps
            if not any(skip in section.lower() for skip in ['table of contents', 'introduction', 'references']):
                steps.append({
                    "order": i,
                    "action": section.strip()[:500],
                    "tools": [],
                    "notes": ""
                })
    
    return steps[:30]  # Max 30 steps


def extract_tools_from_text(text: str) -> List[str]:
    """Extract tool/software names from text using common patterns"""
    tools = []
    
    # Common tool patterns
    tool_patterns = [
        r'(?:using|with|via|through)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
        r'`([^`]+)`',  # Code blocks often contain tool names
        r'\*\*([A-Z][a-zA-Z]+)\*\*',  # Bold tool names
    ]
    
    for pattern in tool_patterns:
        matches = re.findall(pattern, text)
        tools.extend(matches)
    
    # Common security/dev tools
    known_tools = ['Splunk', 'ELK', 'SIEM', 'Wireshark', 'Nmap', 'Metasploit', 
                   'Jenkins', 'Docker', 'Kubernetes', 'Git', 'GitHub', 'GitLab',
                   'Jira', 'Slack', 'Notion', 'Asana', 'HubSpot', 'Salesforce']
    
    for tool in known_tools:
        if tool.lower() in text.lower():
            tools.append(tool)
    
    return list(set(tools))[:10]  # Dedupe, max 10


def extract_decision_points(content: str) -> List[str]:
    """Extract decision points or conditional logic"""
    decision_points = []
    
    # Look for if/when/unless patterns
    decision_patterns = [
        r'(?:If|When|Unless|In case)\s+(.+?)(?:\n|$)',
        r'(?:Scenario|Case):\s*(.+?)(?:\n|$)',
    ]
    
    for pattern in decision_patterns:
        matches = re.findall(pattern, content, re.I)
        decision_points.extend([m.strip()[:200] for m in matches])
    
    return decision_points[:10]  # Max 10


def extract_edge_cases(content: str) -> List[str]:
    """Extract edge cases, exceptions, or special notes"""
    edge_cases = []
    
    # Look for note/warning/caution patterns
    edge_patterns = [
        r'(?:Note|Warning|Caution|Important|Exception):\s*(.+?)(?:\n|$)',
        r'⚠️\s*(.+?)(?:\n|$)',
        r'(?:Edge case|Special case|Consider):\s*(.+?)(?:\n|$)',
    ]
    
    for pattern in edge_patterns:
        matches = re.findall(pattern, content, re.I)
        edge_cases.extend([m.strip()[:200] for m in matches])
    
    return edge_cases[:10]  # Max 10


def determine_category(title: str, content: str) -> str:
    """Determine workflow category based on content"""
    title_content = (title + " " + content).lower()
    
    if any(word in title_content for word in ['security', 'incident', 'soc', 'threat', 'vulnerability']):
        return 'Security'
    elif any(word in title_content for word in ['devops', 'devsecops', 'ci/cd', 'deployment', 'infrastructure']):
        return 'DevOps'
    elif any(word in title_content for word in ['marketing', 'growth', 'campaign', 'seo', 'content']):
        return 'Marketing'
    elif any(word in title_content for word in ['sales', 'client', 'onboarding', 'account']):
        return 'Sales'
    elif any(word in title_content for word in ['hr', 'hiring', 'recruit', 'employee', 'people']):
        return 'Human Resources'
    elif any(word in title_content for word in ['cto', 'engineering', 'startup', 'leadership', 'management']):
        return 'Leadership'
    else:
        return 'Operations'


def map_to_occupations(title: str, content: str) -> List[str]:
    """Map workflow to O*NET occupation codes using keyword matching"""
    text = (title + " " + content).lower()
    mapped_codes = set()
    
    for keyword, codes in OCCUPATION_KEYWORDS.items():
        if keyword in text:
            mapped_codes.update(codes)
    
    return list(mapped_codes)


def determine_complexity(steps: List[Dict], content: str) -> str:
    """Estimate workflow complexity"""
    step_count = len(steps)
    content_length = len(content)
    
    if step_count <= 5 and content_length < 1000:
        return 'Beginner'
    elif step_count <= 15 and content_length < 3000:
        return 'Intermediate'
    else:
        return 'Advanced'


def parse_markdown_file(file_path: Path, source_name: str) -> Optional[Dict]:
    """Parse a single markdown file into workflow template structure"""
    try:
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        filename = file_path.stem
        
        # Skip if too short (probably README or index)
        if len(content) < 200:
            return None
        
        title = extract_title(content, filename)
        
        # Skip common non-workflow files
        skip_titles = ['readme', 'index', 'table of contents', 'license', 'contributing']
        if any(skip in title.lower() for skip in skip_titles):
            return None
        
        steps = extract_steps(content)
        
        # Need at least 3 steps to be a valid workflow
        if len(steps) < 3:
            return None
        
        category = determine_category(title, content)
        mapped_occupations = map_to_occupations(title, content)
        
        # Extract all the components
        tools = extract_tools_from_text(content)
        decision_points = extract_decision_points(content)
        edge_cases = extract_edge_cases(content)
        
        workflow = {
            "id": str(uuid.uuid4()),
            "title": title,
            "source": source_name,
            "source_url": f"https://github.com/{source_name}",
            "source_file": str(file_path.name),
            "category": category,
            "mapped_occupations": mapped_occupations,
            "mapped_tasks": [],  # Can enhance later with task matching
            "steps": steps,
            "tools_required": tools,
            "decision_points": decision_points,
            "edge_cases": edge_cases,
            "compliance_notes": "Review for industry-specific compliance requirements",
            "complexity": determine_complexity(steps, content),
            "estimated_time": f"{len(steps) * 15}-{len(steps) * 30} minutes",
            "content_preview": content[:500],
            "step_count": len(steps),
            "created_at": "2025-03-03"
        }
        
        return workflow
        
    except Exception as e:
        print(f"  ⚠️  Error parsing {file_path.name}: {e}")
        return None


def ingest_repository(repo_path: Path, source_name: str) -> List[Dict]:
    """Ingest all markdown files from a repository"""
    workflows = []
    md_files = list(repo_path.rglob("*.md"))
    
    print(f"\n📂 Processing {source_name} ({len(md_files)} markdown files)...")
    
    for md_file in md_files:
        workflow = parse_markdown_file(md_file, source_name)
        if workflow:
            workflows.append(workflow)
            print(f"  ✅ {workflow['title'][:60]}... ({len(workflow['steps'])} steps)")
    
    return workflows


def main():
    print("=" * 70)
    print("WORKFLOW TEMPLATES INGESTION - Real-World Playbooks")
    print("=" * 70)
    
    base_path = Path('/tmp/workflow-sources')
    all_workflows = []
    
    # Ingest each repository
    repos = [
        (base_path / 'SOC-Playbooks', 'socfortress/Playbooks'),
        (base_path / 'DevSecOps', '6mile/DevSecOps-Playbook'),
        (base_path / 'Startup-CTO', 'ZachGoldberg/Startup-CTO-Handbook'),
    ]
    
    for repo_path, source_name in repos:
        if repo_path.exists():
            workflows = ingest_repository(repo_path, source_name)
            all_workflows.extend(workflows)
    
    print(f"\n📊 SUMMARY:")
    print(f"  Total workflows extracted: {len(all_workflows)}")
    
    # Show breakdown by category
    categories = {}
    for wf in all_workflows:
        cat = wf['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"\n  By Category:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"    {cat}: {count}")
    
    # Insert into MongoDB
    if all_workflows:
        print(f"\n💾 Inserting {len(all_workflows)} workflows into MongoDB...")
        result = db.workflow_templates.insert_many(all_workflows)
        print(f"  ✅ Inserted {len(result.inserted_ids)} documents")
        
        # Create indexes
        db.workflow_templates.create_index("category")
        db.workflow_templates.create_index("mapped_occupations")
        db.workflow_templates.create_index([("title", "text")])
        print(f"  ✅ Created indexes")
    
    print("\n" + "=" * 70)
    print("✅ INGESTION COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
