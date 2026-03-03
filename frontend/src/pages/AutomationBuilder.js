import React, { useState, useEffect } from 'react';
import { Copy, Check, Zap, Bot, Workflow, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AutomationBuilder() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [minScore, setMinScore] = useState(0.6);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchOpportunities();
  }, [filter, minScore]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = { min_score: minScore };
      if (filter !== 'all') params.automation_type = filter;
      
      const res = await axios.get(`${BACKEND_URL}/api/automation-opportunities`, { params });
      setOpportunities(res.data.opportunities || []);
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'LLM': return <Bot className="w-4 h-4" />;
      case 'RPA': return <Workflow className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'LLM': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'RPA': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-8 h-8 text-indigo-500" />
            <h1 className="text-4xl font-bold">Automation Builder</h1>
          </div>
          <p className="text-zinc-400 text-lg">
            Ready-to-use prompts, workflows, and templates for AI agents and RPA automation
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Automation Type</label>
            <div className="flex gap-2">
              {['all', 'Hybrid', 'LLM', 'RPA'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    filter === type 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {type === 'all' ? 'All Types' : type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Min Automation Score</label>
            <select
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100"
            >
              <option value="0.5">50%+</option>
              <option value="0.6">60%+</option>
              <option value="0.7">70%+ (High)</option>
              <option value="0.8">80%+ (Very High)</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="text-2xl font-bold text-indigo-400">{opportunities.length}</div>
              <div className="text-sm text-zinc-400">Automation Opportunities</div>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="text-2xl font-bold text-green-400">
                {Math.round(opportunities.reduce((acc, o) => acc + o.task.automatable_score, 0) / opportunities.length * 100)}%
              </div>
              <div className="text-sm text-zinc-400">Avg Automation Score</div>
            </div>
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="text-2xl font-bold text-amber-400">
                {opportunities.filter(o => o.task.automatable_score >= 0.7).length}
              </div>
              <div className="text-sm text-zinc-400">High-Priority Tasks</div>
            </div>
          </div>
        )}

        {/* Opportunities List */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading automation opportunities...</div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp, idx) => (
              <div 
                key={`${opp.task.task_id}-${idx}`}
                className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all"
              >
                {/* Task Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getTypeColor(opp.task.automation_type)}`}>
                          {getTypeIcon(opp.task.automation_type)}
                          {opp.task.automation_type}
                        </span>
                        <span className="text-xs text-zinc-500">{opp.occupation.code}</span>
                      </div>
                      <h3 className="text-xl font-semibold mb-1">{opp.task.statement}</h3>
                      <p className="text-sm text-zinc-400">
                        <Link to={`/occupation/${opp.occupation.code}`} className="hover:text-indigo-400 transition-colors">
                          {opp.occupation.title}
                        </Link>
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-green-400">
                        {Math.round(opp.task.automatable_score * 100)}%
                      </div>
                      <div className="text-xs text-zinc-500">Automation Score</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedId(expandedId === opp.task.task_id ? null : opp.task.task_id)}
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {expandedId === opp.task.task_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedId === opp.task.task_id ? 'Hide' : 'Show'} Automation Guide
                  </button>
                </div>

                {/* Expanded Content */}
                {expandedId === opp.task.task_id && (
                  <div className="border-t border-zinc-800 bg-zinc-950/50 p-5 space-y-5">
                    {/* Prompt Template */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-indigo-400">Ready-to-Use Prompt Template</h4>
                        <button
                          onClick={() => copyToClipboard(opp.automation_guide.prompt_template, `prompt-${opp.task.task_id}`)}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                        >
                          {copiedId === `prompt-${opp.task.task_id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedId === `prompt-${opp.task.task_id}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="bg-zinc-900 p-4 rounded text-sm text-zinc-300 overflow-x-auto border border-zinc-800 whitespace-pre-wrap">
                        {opp.automation_guide.prompt_template}
                      </pre>
                    </div>

                    {/* Workflow Steps */}
                    <div>
                      <h4 className="font-semibold text-amber-400 mb-2">Implementation Workflow</h4>
                      <div className="space-y-2">
                        {opp.automation_guide.workflow_steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <span className="text-zinc-300 pt-0.5">{step.replace(/^\d+\.\s*/, '')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Implementation Notes */}
                    <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-400 mb-1">Implementation Notes</h4>
                        <p className="text-sm text-zinc-300">{opp.automation_guide.implementation_notes}</p>
                      </div>
                    </div>

                    {/* Edge Cases */}
                    {opp.task.edge_cases && (
                      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-400 mb-1">Edge Cases to Handle</h4>
                          <p className="text-sm text-zinc-300">{opp.task.edge_cases}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
