import React, { useState, useEffect } from 'react';
import { TrendingUp, Code, Database, Zap, DollarSign, Clock, Users, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AutomationGoldmines() {
  const [goldmines, setGoldmines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchGoldmines();
  }, []);

  const fetchGoldmines = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/automation-goldmines`);
      setGoldmines(res.data.goldmines || []);
    } catch (err) {
      console.error('Failed to fetch goldmines:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'LLM': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'RPA': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading top automation opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-950/40 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-10 h-10 text-indigo-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Top 30 Automation Goldmines
            </h1>
          </div>
          <p className="text-xl text-zinc-300 mb-2">
            Highest-value automation opportunities ranked by market demand × automation potential
          </p>
          <p className="text-zinc-400">
            Complete implementation guides with real code, tech stacks, and revenue projections
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-zinc-900/50 backdrop-blur rounded-lg p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-green-400">{goldmines.length}</div>
              <div className="text-sm text-zinc-400">Opportunities</div>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur rounded-lg p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-indigo-400">2-7 days</div>
              <div className="text-sm text-zinc-400">Avg Build Time</div>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur rounded-lg p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-amber-400">$29-199/mo</div>
              <div className="text-sm text-zinc-400">Pricing Range</div>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur rounded-lg p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-purple-400">$50K-5M</div>
              <div className="text-sm text-zinc-400">ARR Potential</div>
            </div>
          </div>
        </div>
      </div>

      {/* Goldmines List */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {goldmines.map((gm) => (
          <div 
            key={gm.rank}
            className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-indigo-500/30 transition-all"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-900/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold">
                      #{gm.rank}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getTypeColor(gm.task.automation_type)}`}>
                        {gm.task.automation_type}
                      </span>
                      <span className="text-xs text-zinc-500">{gm.occupation.code}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{gm.task.statement}</h2>
                    <p className="text-zinc-400">
                      <Link to={`/occupation/${gm.occupation.code}`} className="hover:text-indigo-400 transition-colors">
                        {gm.occupation.title}
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-3xl font-bold text-green-400 mb-1">
                    {Math.round(gm.task.automation_score * 100)}%
                  </div>
                  <div className="text-xs text-zinc-500">Automation Score</div>
                  <div className="text-sm text-amber-400 font-semibold mt-2">
                    Score: {gm.business_score}
                  </div>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-semibold text-zinc-200">{gm.implementation.business_metrics.potential_users}</div>
                    <div className="text-xs text-zinc-500">Potential Users</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <div>
                    <div className="font-semibold text-zinc-200">{gm.implementation.business_metrics.suggested_pricing}</div>
                    <div className="text-xs text-zinc-500">Suggested Price</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="font-semibold text-zinc-200">{gm.implementation.business_metrics.arr_potential}</div>
                    <div className="text-xs text-zinc-500">ARR Potential</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold text-zinc-200">{gm.implementation.build_timeline.mvp}</div>
                    <div className="text-xs text-zinc-500">Build Time (MVP)</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setExpandedId(expandedId === gm.rank ? null : gm.rank)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-sm font-medium"
              >
                {expandedId === gm.rank ? (
                  <>
                    <ChevronUp className="w-4 h-4" /> Hide Implementation Guide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" /> Show Complete Implementation Guide
                  </>
                )}
              </button>
            </div>

            {/* Expanded Implementation Guide */}
            {expandedId === gm.rank && (
              <div className="border-t border-zinc-800 bg-zinc-950/50">
                {/* Tech Stack */}
                <div className="p-6 border-b border-zinc-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Code className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg font-semibold text-indigo-400">Tech Stack</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(gm.implementation.tech_stack).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-sm">
                        <span className="text-zinc-500 capitalize min-w-[100px]">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-zinc-300 font-mono text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample Code */}
                <div className="p-6 border-b border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-green-400">Working Code (Copy & Use)</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(gm.implementation.sample_code, `code-${gm.rank}`)}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                      {copiedId === `code-${gm.rank}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === `code-${gm.rank}` ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="bg-zinc-900 p-4 rounded-lg text-xs text-zinc-300 overflow-x-auto border border-zinc-800 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {gm.implementation.sample_code}
                  </pre>
                </div>

                {/* API Endpoints */}
                <div className="p-6 border-b border-zinc-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-amber-400">API Endpoints to Build</h3>
                  </div>
                  <div className="space-y-2">
                    {gm.implementation.api_endpoints.map((endpoint, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-900 rounded border border-zinc-800">
                        <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded">{endpoint.method}</span>
                        <code className="text-sm text-zinc-300 font-mono">{endpoint.path}</code>
                        <span className="text-xs text-zinc-500 ml-auto">{endpoint.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Database Schema */}
                <div className="p-6 border-b border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-semibold text-purple-400">Database Schema</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(gm.implementation.database_schema, `db-${gm.rank}`)}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                      {copiedId === `db-${gm.rank}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === `db-${gm.rank}` ? 'Copied!' : 'Copy SQL'}
                    </button>
                  </div>
                  <pre className="bg-zinc-900 p-4 rounded-lg text-xs text-zinc-300 overflow-x-auto border border-zinc-800 font-mono whitespace-pre-wrap">
                    {gm.implementation.database_schema}
                  </pre>
                </div>

                {/* Go-to-Market */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ExternalLink className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-blue-400">Go-to-Market Strategy</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-400 mb-1">Target Audience</div>
                      <div className="text-zinc-300">{gm.implementation.go_to_market.target_audience}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-400 mb-1">Distribution</div>
                      <div className="text-zinc-300 text-sm">{gm.implementation.go_to_market.distribution}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-400 mb-1">Competition Level</div>
                      <div className="text-zinc-300">{gm.implementation.go_to_market.competition}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-400 mb-1">Competitive Moat</div>
                      <div className="text-zinc-300 text-sm">{gm.implementation.go_to_market.moat}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
