import React, { useState, useEffect } from 'react';
import { Search, Download, FileJson, FileSpreadsheet, Code, CheckCircle, Brain, Zap, AlertCircle, TrendingUp, Database, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AgentBuilder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [occupations, setOccupations] = useState([]);
  const [selectedOcc, setSelectedOcc] = useState(null);
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [topOpportunities, setTopOpportunities] = useState([]);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  // Load top automation opportunities on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [oppsRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/automation-goldmines?limit=12`),
        axios.get(`${BACKEND_URL}/api/stats`)
      ]);
      setTopOpportunities(oppsRes.data.goldmines || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  // Featured high-automation occupations with real data
  const featured = [
    { code: '43-3031.00', title: 'Bookkeeping Clerks', score: 80.2, domain: 'Finance', tasks: 28 },
    { code: '13-2011.00', title: 'Accountants & Auditors', score: 76.2, domain: 'Finance', tasks: 34 },
    { code: '15-1232.00', title: 'Computer User Support', score: 75.0, domain: 'Technology', tasks: 26 },
    { code: '11-1021.00', title: 'General Managers', score: 75.0, domain: 'Management', tasks: 40 },
    { code: '43-4051.00', title: 'Customer Service Reps', score: 72.5, domain: 'Customer Service', tasks: 31 },
    { code: '13-1111.00', title: 'Management Analysts', score: 71.8, domain: 'Consulting', tasks: 27 },
  ];

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/search?q=${searchQuery}`);
      setOccupations(res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAgentPackage = async (code) => {
    setLoading(true);
    try {
      // Get occupation + tasks + skills + tools + knowledge
      const [occRes, tasksRes, skillsRes, toolsRes, knowledgeRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/occupations/${code}`),
        axios.get(`${BACKEND_URL}/api/occupations/${code}/tasks?sort=importance&order=desc`),
        axios.get(`${BACKEND_URL}/api/occupations/${code}/skills`),
        axios.get(`${BACKEND_URL}/api/occupations/${code}/tools`),
        axios.get(`${BACKEND_URL}/api/occupations/${code}/knowledge`),
      ]);

      // API returns occupation directly, not wrapped
      const occData = occRes.data;
      const tasks = tasksRes.data.tasks || [];
      
      // Sort tasks by automation score (if enriched), then by importance
      const sortedTasks = [...tasks].sort((a, b) => {
        if (a.automatable_score && b.automatable_score) {
          return b.automatable_score - a.automatable_score;
        }
        return (b.importance || 0) - (a.importance || 0);
      });

      setSelectedOcc(occData);
      setPackageData({
        occupation: occData,
        tasks: sortedTasks,
        skills: skillsRes.data.skills || [],
        tools: toolsRes.data.tools || [],
        technology: toolsRes.data.technology || [],
        knowledge: knowledgeRes.data.knowledge || [],
      });
    } catch (err) {
      console.error('Failed to load agent package:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportPackage = (format) => {
    if (!packageData) return;

    const agentPackage = {
      metadata: {
        occupation_code: packageData.occupation.onet_code,
        occupation_title: packageData.occupation.title_en,
        domain: packageData.occupation.definition_en,
        automation_potential: calculateAvgAutomation(packageData.tasks),
        enriched_tasks_count: packageData.tasks.filter(t => t.enriched).length,
        total_tasks: packageData.tasks.length,
        generated_at: new Date().toISOString(),
        data_sources: ['O*NET 30.2 (US Dept of Labor)', 'NOC 2021 (Statistics Canada)', 'ESCO (EU Classification)']
      },
      domain_expertise: {
        required_skills: packageData.skills.slice(0, 10).map(s => ({
          skill: s.name,
          importance: s.importance,
          level_required: s.level
        })),
        required_knowledge: packageData.knowledge.slice(0, 10).map(k => ({
          area: k.name,
          importance: k.importance
        })),
        tools_technologies: [
          ...packageData.tools.slice(0, 10).map(t => t.name),
          ...packageData.technology.slice(0, 10).map(t => t.name)
        ],
        certifications_recommended: getDomainCertifications(packageData.occupation.major_group),
        industry_standards: getIndustryStandards(packageData.occupation.major_group),
        compliance_requirements: getComplianceRequirements(packageData.occupation.major_group)
      },
      tasks: packageData.tasks.map(t => ({
        task_id: t.task_id,
        description: t.statement_en,
        importance: t.importance,
        automation_score: t.automatable_score || null,
        automation_type: t.automation_type || null,
        edge_cases: t.edge_cases || null,
        enriched: t.enriched || false,
        decision_points: extractDecisionPoints(t.statement_en),
      })),
      agent_training: {
        sample_prompts: generateSamplePrompts(packageData),
        few_shot_examples: generateFewShotExamples(packageData),
        validation_rules: generateValidationRules(packageData),
      }
    };

    if (format === 'json') {
      downloadJSON(agentPackage, `agent-${packageData.occupation.onet_code}.json`);
    } else if (format === 'jsonl') {
      downloadJSONL(agentPackage, `agent-${packageData.occupation.onet_code}.jsonl`);
    } else if (format === 'csv') {
      downloadCSV(agentPackage, `agent-${packageData.occupation.onet_code}.csv`);
    } else if (format === 'python') {
      downloadPythonSDK(agentPackage, `agent-${packageData.occupation.onet_code}.py`);
    }
  };

  const calculateAvgAutomation = (tasks) => {
    const enriched = tasks.filter(t => t.automatable_score);
    if (enriched.length === 0) return 0;
    return (enriched.reduce((sum, t) => sum + t.automatable_score, 0) / enriched.length * 100).toFixed(1);
  };

  const getDomainCertifications = (majorGroup) => {
    const certs = {
      '13': ['CPA (Certified Public Accountant)', 'CFA (Chartered Financial Analyst)', 'CIA (Certified Internal Auditor)'],
      '15': ['AWS Certified', 'Microsoft Certified', 'CompTIA Security+'],
      '29': ['Board Certification', 'State Medical License', 'HIPAA Certification'],
      '23': ['Bar Admission', 'Juris Doctor (JD)'],
    };
    return certs[majorGroup] || ['Industry-specific certification required'];
  };

  const getIndustryStandards = (majorGroup) => {
    const standards = {
      '13': ['GAAP (Generally Accepted Accounting Principles)', 'SOX Compliance', 'IFRS Standards'],
      '15': ['ISO 27001 (Security)', 'NIST Cybersecurity Framework', 'OWASP Guidelines'],
      '29': ['HIPAA', 'HL7 FHIR', 'ICD-10 Coding'],
      '23': ['ABA Model Rules', 'Federal Rules of Civil Procedure'],
    };
    return standards[majorGroup] || ['Consult industry regulatory body'];
  };

  const getComplianceRequirements = (majorGroup) => {
    const compliance = {
      '13': ['SEC Reporting', 'Tax Code Compliance', 'Audit Standards (PCAOB)'],
      '15': ['GDPR (if EU data)', 'SOC 2', 'PCI DSS (if payments)'],
      '29': ['HIPAA Privacy Rule', 'State Medical Board Regulations'],
      '23': ['Attorney-Client Privilege', 'Conflict of Interest Rules'],
    };
    return compliance[majorGroup] || ['Verify local regulations'];
  };

  const extractDecisionPoints = (statement) => {
    // Simple heuristic - can be enhanced
    if (statement.toLowerCase().includes('determine') || statement.toLowerCase().includes('decide')) {
      return [`Decision required: ${statement.slice(0, 100)}...`];
    }
    return [];
  };

  const generateSamplePrompts = (data) => {
    const topTask = data.tasks[0];
    return [
      `You are an AI agent trained to perform tasks for ${data.occupation.title_en}. Task: ${topTask?.statement_en}. Analyze the input and provide structured output following industry standards.`,
      `System: You are a ${data.occupation.title_en} AI assistant. Follow ${getIndustryStandards(data.occupation.major_group)[0]}. Task: ${topTask?.statement_en}`,
    ];
  };

  const generateFewShotExamples = (data) => {
    return [
      {
        input: 'Sample input for task',
        output: 'Sample structured output',
        note: 'Replace with domain-specific examples'
      }
    ];
  };

  const generateValidationRules = (data) => {
    return [
      'Verify all outputs against industry standards',
      `Ensure compliance with ${getComplianceRequirements(data.occupation.major_group)[0]}`,
      'Flag low-confidence results for human review',
      'Maintain audit trail for all decisions'
    ];
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const downloadJSONL = (data, filename) => {
    const lines = data.tasks.map(task => JSON.stringify(task)).join('\n');
    const blob = new Blob([lines], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const downloadCSV = (data, filename) => {
    const headers = 'task_id,description,importance,automation_score,automation_type\n';
    const rows = data.tasks.map(t => 
      `"${t.task_id}","${t.description?.replace(/"/g, '""')}",${t.importance},${t.automation_score},"${t.automation_type}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const downloadPythonSDK = (data, filename) => {
    const code = `# Agent SDK for ${data.occupation.title_en}
import json
from typing import Dict, List

class ${data.occupation.title_en.replace(/[^a-zA-Z]/g, '')}Agent:
    """
    AI Agent trained for ${data.occupation.title_en}
    
    Domain Expertise:
    - ${data.domain_expertise.industry_standards.join('\n    - ')}
    
    Compliance:
    - ${data.domain_expertise.compliance_requirements.join('\n    - ')}
    """
    
    def __init__(self, llm_api_key: str):
        self.api_key = llm_api_key
        self.tasks = ${JSON.stringify(data.tasks.slice(0, 5), null, 8)}
    
    def execute_task(self, task_description: str, input_data: Dict) -> Dict:
        """Execute a task with validation"""
        # Add your LLM integration here
        # Follow industry standards: ${data.domain_expertise.industry_standards[0]}
        
        result = {
            "output": "...",
            "confidence": 0.95,
            "compliance_check": self.validate_compliance(input_data),
            "audit_trail": []
        }
        return result
    
    def validate_compliance(self, data: Dict) -> bool:
        """Validate against ${data.domain_expertise.compliance_requirements[0]}"""
        # Add compliance validation logic
        return True

# Usage Example
agent = ${data.occupation.title_en.replace(/[^a-zA-Z]/g, '')}Agent(api_key="your_key")
result = agent.execute_task("task_description", {"input": "data"})
print(result)
`;
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" data-testid="agent-builder-page">
      {/* Hero - Compact */}
      <div className="bg-gradient-to-b from-indigo-950/40 to-zinc-950 border-b border-zinc-800 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
                <Brain className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-indigo-400 font-semibold">Enterprise Agent Training Data</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Build AI Agents for Any Profession
              </h1>
              <p className="text-zinc-400 max-w-2xl">
                Access structured task data, compliance rules, and domain expertise for 1,000+ occupations. No domain expertise required.
              </p>
            </div>
            {stats && (
              <div className="hidden md:flex gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-indigo-400">{stats.total_occupations?.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">Occupations</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{stats.total_tasks?.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">Tasks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-400">{stats.total_skills?.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">Skills</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search any occupation... (e.g., 'nurse', 'accountant', 'software developer')"
                className="w-full pl-12 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:border-indigo-500 focus:outline-none"
                data-testid="occupation-search"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
              data-testid="search-button"
            >
              Search
            </button>
          </div>

          {/* Quick Access */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-zinc-500 py-1.5">Quick access:</span>
            {featured.map(f => (
              <button
                key={f.code}
                onClick={() => loadAgentPackage(f.code)}
                className="px-3 py-1.5 text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-colors flex items-center gap-2"
                data-testid={`quick-access-${f.code}`}
              >
                <span>{f.title}</span>
                <span className="text-green-400 font-semibold">{f.score}%</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {occupations.length > 0 && (
          <div className="mb-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Search Results ({occupations.length})</h3>
            <div className="grid md:grid-cols-3 gap-2">
              {occupations.slice(0, 9).map(occ => (
                <button
                  key={occ.onet_code}
                  onClick={() => loadAgentPackage(occ.onet_code)}
                  className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition-all group"
                >
                  <div className="font-medium text-sm group-hover:text-indigo-400 transition-colors">{occ.title_en}</div>
                  <div className="text-xs text-zinc-500">{occ.onet_code}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="ml-3 text-zinc-400">Loading agent training package...</span>
          </div>
        )}

        {/* Selected Package View */}
        {packageData && !loading && (
          <div className="space-y-6" data-testid="package-details">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-950/30 to-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{packageData.occupation.title_en}</h2>
                  <p className="text-sm text-zinc-500">{packageData.occupation.onet_code}</p>
                </div>
                <button
                  onClick={() => { setPackageData(null); setSelectedOcc(null); }}
                  className="text-sm text-zinc-400 hover:text-white"
                >
                  ← Back to search
                </button>
              </div>
              <p className="text-zinc-400 text-sm mb-4">{packageData.occupation.definition_en}</p>
              
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <div className="text-xl font-bold text-indigo-400">{packageData.tasks.length}</div>
                  <div className="text-xs text-zinc-500">Total Tasks</div>
                </div>
                <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <div className="text-xl font-bold text-green-400">{packageData.tasks.filter(t => t.enriched).length}</div>
                  <div className="text-xs text-zinc-500">AI-Analyzed</div>
                </div>
                <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <div className="text-xl font-bold text-amber-400">{calculateAvgAutomation(packageData.tasks)}%</div>
                  <div className="text-xs text-zinc-500">Avg Automation</div>
                </div>
                <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <div className="text-xl font-bold text-purple-400">{packageData.skills.length}</div>
                  <div className="text-xs text-zinc-500">Skills</div>
                </div>
                <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <div className="text-xl font-bold text-cyan-400">{packageData.tools.length + packageData.technology.length}</div>
                  <div className="text-xs text-zinc-500">Tools/Tech</div>
                </div>
              </div>
            </div>

            {/* Main Content - Two Columns */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Tasks */}
              <div className="lg:col-span-2 space-y-4">
                {/* Top Tasks */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Top Tasks by Automation Potential
                  </h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {packageData.tasks.slice(0, 15).map((task, idx) => (
                      <div key={task.task_id || idx} className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-200">{task.statement_en}</p>
                            <div className="flex items-center gap-3 mt-2">
                              {task.enriched && task.automatable_score && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  task.automatable_score >= 0.7 ? 'bg-green-500/20 text-green-400' :
                                  task.automatable_score >= 0.4 ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {(task.automatable_score * 100).toFixed(0)}% automatable
                                </span>
                              )}
                              {task.automation_type && (
                                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                                  {task.automation_type}
                                </span>
                              )}
                              {task.importance && (
                                <span className="text-xs text-zinc-500">
                                  Importance: {task.importance.toFixed(0)}
                                </span>
                              )}
                            </div>
                            {task.edge_cases && (
                              <p className="text-xs text-zinc-500 mt-1 italic">Edge cases: {task.edge_cases}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {packageData.tasks.length > 15 && (
                    <p className="text-xs text-zinc-500 mt-3 text-center">
                      +{packageData.tasks.length - 15} more tasks in download
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column - Skills, Tools, Export */}
              <div className="space-y-4">
                {/* Required Skills */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                  <h3 className="text-sm font-semibold mb-3 text-zinc-400">Required Skills</h3>
                  <div className="space-y-2">
                    {packageData.skills.slice(0, 8).map((skill, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm truncate pr-2">{skill.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${(skill.importance || 50)}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500 w-8">{skill.importance?.toFixed(0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Domain Knowledge */}
                {packageData.knowledge.length > 0 && (
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                    <h3 className="text-sm font-semibold mb-3 text-zinc-400">Required Knowledge</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {packageData.knowledge.slice(0, 10).map((k, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-300">
                          {k.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools & Technology */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                  <h3 className="text-sm font-semibold mb-3 text-zinc-400">Tools & Technology</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {[...packageData.tools, ...packageData.technology].slice(0, 12).map((t, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-purple-300">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Export */}
                <div className="bg-gradient-to-b from-indigo-950/30 to-zinc-900 rounded-xl border border-indigo-500/20 p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4 text-indigo-400" />
                    Download Training Package
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportPackage('json')}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-center"
                      data-testid="export-json"
                    >
                      <FileJson className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-semibold">JSON</span>
                    </button>
                    <button
                      onClick={() => exportPackage('jsonl')}
                      className="p-3 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-center"
                      data-testid="export-jsonl"
                    >
                      <FileJson className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-semibold">JSONL</span>
                    </button>
                    <button
                      onClick={() => exportPackage('csv')}
                      className="p-3 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors text-center"
                      data-testid="export-csv"
                    >
                      <FileSpreadsheet className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-semibold">CSV</span>
                    </button>
                    <button
                      onClick={() => exportPackage('python')}
                      className="p-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-center"
                      data-testid="export-python"
                    >
                      <Code className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-semibold">Python</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">
                    Includes tasks, skills, compliance rules, sample prompts & starter code
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Default View - Show Top Opportunities */}
        {!packageData && !loading && (
          <div className="space-y-8">
            {/* Top Automation Goldmines */}
            {topOpportunities.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Top Automation Opportunities
                  </h2>
                  <a href="/goldmines" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    View all <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topOpportunities.slice(0, 6).map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => loadAgentPackage(item.occupation.code)}
                      className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-indigo-500/50 cursor-pointer transition-all group"
                      data-testid={`opportunity-${idx}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-500">#{item.rank}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          item.task.automation_score >= 0.7 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {(item.task.automation_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mb-1 group-hover:text-indigo-400 transition-colors">
                        {item.occupation.title}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                        {item.task.statement}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded">
                          {item.task.automation_type || 'Hybrid'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Importance: {item.task.importance?.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <h2 className="text-lg font-bold mb-4 text-center">How Agent Builder Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1">1. Search Role</h3>
                  <p className="text-sm text-zinc-400">Find any of 1,000+ occupations with detailed task breakdowns</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-3">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1">2. Get Domain Data</h3>
                  <p className="text-sm text-zinc-400">Access tasks, skills, tools, compliance rules & edge cases</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1">3. Train Your Agent</h3>
                  <p className="text-sm text-zinc-400">Download JSON, JSONL for fine-tuning, or Python SDK to start</p>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="flex items-center justify-center gap-8 text-xs text-zinc-500">
              <span>Data from:</span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" /> O*NET 30.2 (US Dept of Labor)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" /> NOC 2021 (Statistics Canada)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" /> ESCO (European Commission)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
