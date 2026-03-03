# automateOps data - Product Requirements Document

## Original Problem Statement
Build an enterprise-grade "Agent Builder" platform that provides structured task data, compliance rules, and domain expertise for AI builders. The application is a data SaaS marketplace sourcing job and task data from government databases (O*NET, NOC, ESCO).

## User Persona
- **Primary**: Software developers building AI agents who lack domain expertise in specific fields (medicine, law, finance)
- **Secondary**: Investors evaluating the platform for its data value and revenue potential

## Core Value Proposition
"Build AI Agents Without Domain Expertise" - Provide developers with complete training packages including tasks, skills, compliance rules, edge cases, and sample code to build AI agents for any profession.

## Architecture

### Tech Stack
- **Frontend**: React 18, Tailwind CSS, shadcn/ui, Recharts, Axios
- **Backend**: FastAPI (Python 3.11), Motor (async MongoDB driver)
- **Database**: MongoDB
- **Authentication**: JWT
- **AI Integration**: emergentintegrations library (GPT-4o via Emergent LLM Key)

### File Structure
```
/app
├── backend/
│   ├── server.py         # FastAPI main app, all API endpoints
│   ├── requirements.txt
│   ├── .env
│   ├── data/             # Downloaded source data files
│   └── ingest_*.py       # Data ingestion scripts
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main router
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   └── lib/          # API client, utilities
│   └── package.json
└── test_reports/         # Testing results
```

### Key Database Collections
- `occupations`: { onet_code, title_en, definition_en, major_group, country_scope }
- `tasks`: { onet_code, statement_en, importance, automatable_score, automation_type, edge_cases, enriched }
- `skills`: { onet_code, name, importance, level }
- `knowledge`: { onet_code, name, importance }
- `tools_technology`: { onet_code, name, type }

## Current Data Stats
- **1,117** Occupations (O*NET + NOC + ESCO)
- **18,796** Task Statements
- **31,290** Skills Mapped
- **74,435** Tools & Technology
- **457** Tasks AI-Enriched with automation scores

## Implemented Features

### P0 - Core Features (Complete)
1. **Agent Builder Page** (`/agent-builder`) - COMPLETE (Dec 4, 2025)
   - Displays real stats on page load
   - Shows top 6 automation opportunities from goldmines API
   - Quick access buttons for high-automation occupations
   - Search functionality for 1,117+ occupations
   - Package view with tasks, skills, knowledge, tools
   - Export options: JSON, JSONL, CSV, Python SDK
   - Back-to-search navigation

2. **Automation Heatmap** (`/heatmap`) - COMPLETE
   - Visualizes automation potential across industries
   - Shows top automatable occupations

3. **Top 30 Goldmines** (`/goldmines`) - COMPLETE
   - Ranked automation opportunities
   - Implementation guides with tech stack and code samples

4. **Homepage** (`/`) - COMPLETE
   - Live stats display
   - Featured goldmines
   - ROI calculator
   - Search functionality

5. **Pricing Page** (`/pricing`) - COMPLETE
   - 4-tier pricing model

### P1 - Secondary Features (Complete)
- **Data Sources Page** (`/data-sources`) - COMPLETE
- **Workflow Templates** (`/templates`) - COMPLETE
- **Automation Builder** (`/automation-builder`) - COMPLETE

### API Endpoints
- `/api/stats` - Platform statistics
- `/api/search` - Occupation search
- `/api/occupations/{code}` - Occupation detail
- `/api/occupations/{code}/tasks` - Tasks for occupation
- `/api/occupations/{code}/skills` - Skills required
- `/api/occupations/{code}/knowledge` - Knowledge areas
- `/api/occupations/{code}/tools` - Tools & technology
- `/api/automation-opportunities` - High-automation tasks
- `/api/automation-goldmines` - Top ranked opportunities
- `/api/heatmap/data` - Industry automation data
- `/api/featured` - Featured occupations

## Backlog / Future Tasks

### P0 - High Priority
1. **Ingest Enterprise-Grade Data** (User-approved, 20 token budget)
   - Scrape from official sources (Medicare.gov, FASB.org, NIST.gov)
   - Focus on top 10 high-automation occupations
   - Add compliance checklists, decision trees, quality standards

### P1 - Medium Priority
2. **Real Payment Integration**
   - Stripe integration for pricing tiers
   - Subscription management

3. **User Dashboard Enhancement**
   - Saved packages
   - Download history
   - API key management

### P2 - Low Priority
4. **Additional Data Enrichment**
   - Remaining 18K+ tasks (expensive - avoid unless needed)
   
5. **UI Cleanup**
   - Consider consolidating redundant pages (templates, automation-builder)

## Known Issues
1. **NOC Ingestion Unique Index Error** - Minor: Some NOC-only occupations without onet_code fail to insert. Most data ingested successfully.

## Testing Status
- Backend: 100% (12/12 tests passed)
- Frontend: 100% (All UI features verified)
- Test file: `/app/backend/tests/test_agent_builder_apis.py`

## Third-Party Integrations
- OpenAI GPT-4o via emergentintegrations library (Emergent LLM Key)
