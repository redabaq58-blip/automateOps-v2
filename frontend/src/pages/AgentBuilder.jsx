import React, { useState, useEffect } from 'react';
import { Search, Download, FileJson, FileSpreadsheet, Code, CheckCircle, Brain, Zap, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AgentBuilder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [occupations, setOccupations] = useState([]);
  const [selectedOcc, setSelectedOcc] = useState(null);
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Featured high-automation occupations
  const featured = [
    { code: '43-3031.00', title: 'Bookkeeping Clerks', score: 80.2, domain: 'Finance' },
    { code: '13-2011.00', title: 'Accountants', score: 76.2, domain: 'Finance' },
    { code: '15-1232.00', title: 'IT Support Specialists', score: 75.0, domain: 'Technology' },
    { code: '11-1021.00', title: 'Operations Managers', score: 75.0, domain: 'Management' },
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
      // Get occupation + tasks + skills + tools
      const [occ, tasks, skills, tools] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/occupations/${code}`),
        axios.get(`${BACKEND_URL}/api/occupations/${code}/tasks?sort=automatable_score&order=desc`),
        axios.get(`${BACKEND_URL}/api/occupations/${code}/skills`),
        axios.get(`${BACKEND_URL}/api/occupations/${code}/tools`),
      ]);

      setSelectedOcc(occ.data.occupation);
      setPackageData({
        occupation: occ.data.occupation,
        tasks: tasks.data.tasks || [],
        skills: skills.data.skills || [],
        tools: tools.data.tools || [],
      });
    } catch (err) {
      console.error(err);
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
        generated_at: new Date().toISOString(),
        data_sources: ['O*NET 30.2 (US Dept of Labor)', 'NOC 2021 (Statistics Canada)']
      },
      domain_expertise: {
        required_skills: packageData.skills.slice(0, 10).map(s => ({
          skill: s.name,
          importance: s.importance,
          level_required: s.level
        })),
        tools_technologies: packageData.tools.slice(0, 20).map(t => t.name),
        certifications_recommended: getDomainCertifications(packageData.occupation.major_group),
        industry_standards: getIndustryStandards(packageData.occupation.major_group),
        compliance_requirements: getComplianceRequirements(packageData.occupation.major_group)
      },
      tasks: packageData.tasks.map(t => ({
        task_id: t.task_id,
        description: t.statement_en,
        importance: t.importance,
        automation_score: t.automatable_score,
        automation_type: t.automation_type,
        edge_cases: t.edge_cases,
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <div className="bg-gradient-to-b from-indigo-950/40 to-zinc-950 border-b border-zinc-800 py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-400 font-semibold">Enterprise-Grade Agent Training Data</span>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Build AI Agents Without Domain Expertise
          </h1>
          <p className="text-xl text-zinc-300 max-w-3xl mx-auto mb-2">
            You're a great developer. But you don't know what a cardiologist does day-to-day.
          </p>
          <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
            We provide every detail - every task, decision, edge case - so you can train your agent without medical school.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Search */}
        <div className="mb-12">
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for a job role... (e.g., 'cardiologist', 'accountant', 'lawyer')"
              className="flex-1 px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-lg text-lg focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold flex items-center gap-2"
            >
              <Search className="w-5 h-5" /> Search
            </button>
          </div>

          {/* Featured */}
          <div>
            <h3 className="text-sm text-zinc-500 mb-3">High-Automation Opportunities:</h3>
            <div className="grid grid-cols-4 gap-3">
              {featured.map(f => (
                <button
                  key={f.code}
                  onClick={() => loadAgentPackage(f.code)}
                  className="p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition-all"
                >
                  <div className="text-sm font-semibold mb-1">{f.title}</div>
                  <div className="text-xs text-zinc-500">{f.domain}</div>
                  <div className="text-lg font-bold text-green-400 mt-2">{f.score}%</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {occupations.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {occupations.slice(0, 10).map(occ => (
              <button
                key={occ.onet_code}
                onClick={() => loadAgentPackage(occ.onet_code)}
                className="p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition-all"
              >
                <div className="font-semibold mb-1">{occ.title_en}</div>
                <div className="text-sm text-zinc-400">{occ.onet_code}</div>
              </button>
            ))}
          </div>
        )}

        {/* Agent Package */}
        {packageData && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">{packageData.occupation.title_en}</h2>
              <p className="text-zinc-400 mb-4">{packageData.occupation.definition_en?.slice(0, 300)}...</p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <div className="text-2xl font-bold text-indigo-400">{packageData.tasks.length}</div>
                  <div className="text-sm text-zinc-500">Tasks</div>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <div className="text-2xl font-bold text-green-400">{calculateAvgAutomation(packageData.tasks)}%</div>
                  <div className="text-sm text-zinc-500">Automation Potential</div>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <div className="text-2xl font-bold text-amber-400">{packageData.skills.length}</div>
                  <div className="text-sm text-zinc-500">Skills Required</div>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5" /> Download Agent Training Package
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => exportPackage('json')}
                  className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all flex flex-col items-center gap-2"
                >
                  <FileJson className="w-8 h-8" />
                  <span className="font-semibold">JSON</span>
                  <span className="text-xs text-indigo-200">Agent Training</span>
                </button>
                <button
                  onClick={() => exportPackage('jsonl')}
                  className="p-4 bg-green-600 hover:bg-green-500 rounded-lg transition-all flex flex-col items-center gap-2"
                >
                  <FileJson className="w-8 h-8" />
                  <span className="font-semibold">JSONL</span>
                  <span className="text-xs text-green-200">Fine-Tuning</span>
                </button>
                <button
                  onClick={() => exportPackage('csv')}
                  className="p-4 bg-amber-600 hover:bg-amber-500 rounded-lg transition-all flex flex-col items-center gap-2"
                >
                  <FileSpreadsheet className="w-8 h-8" />
                  <span className="font-semibold">CSV</span>
                  <span className="text-xs text-amber-200">Analysis</span>
                </button>
                <button
                  onClick={() => exportPackage('python')}
                  className="p-4 bg-purple-600 hover:bg-purple-500 rounded-lg transition-all flex flex-col items-center gap-2"
                >
                  <Code className="w-8 h-8" />
                  <span className="font-semibold">Python SDK</span>
                  <span className="text-xs text-purple-200">Code Sample</span>
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-300">
                    <strong className="text-blue-400">Package Includes:</strong> Complete task list, automation scores, required skills, industry standards, compliance requirements, sample prompts, validation rules, and Python SDK starter code.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        {!packageData && (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center mb-4">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Search for Role</h3>
              <p className="text-sm text-zinc-400">
                Find any occupation - from cardiologist to accountant to data analyst
              </p>
            </div>
            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center mb-4">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Get Training Package</h3>
              <p className="text-sm text-zinc-400">
                Complete domain expertise - tasks, decisions, edge cases, compliance
              </p>
            </div>
            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center mb-4">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Train Your Agent</h3>
              <p className="text-sm text-zinc-400">
                Use JSON for prompts, JSONL for fine-tuning, or Python SDK to start coding
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
