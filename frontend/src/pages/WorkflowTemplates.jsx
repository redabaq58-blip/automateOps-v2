import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, AlertTriangle, Wrench, GitBranch, Clock, TrendingUp, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function WorkflowTemplates() {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedComplexity, setSelectedComplexity] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, selectedComplexity]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedComplexity !== 'all') params.complexity = selectedComplexity;
      
      const res = await axios.get(`${BACKEND_URL}/api/workflow-templates`, { params });
      setTemplates(res.data.templates || []);
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Security': 'bg-red-500/20 text-red-400 border-red-500/30',
      'DevOps': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Marketing': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Sales': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Leadership': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'Human Resources': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Operations': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    };
    return colors[category] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  const getComplexityColor = (complexity) => {
    const colors = {
      'Beginner': 'text-green-400',
      'Intermediate': 'text-amber-400',
      'Advanced': 'text-red-400',
    };
    return colors[complexity] || 'text-zinc-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading workflow templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <div className="bg-gradient-to-b from-indigo-950/40 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-indigo-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Real-World Workflow Templates
            </h1>
          </div>
          <p className="text-xl text-zinc-300 mb-2">
            Battle-tested playbooks from top security teams, agencies, and startups
          </p>
          <p className="text-zinc-400">
            Structured processes ready to adapt for your AI agents and automation workflows
          </p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-zinc-900/50 backdrop-blur rounded-lg p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-indigo-400">{templates.length}</div>
              <div className="text-sm text-zinc-400">Workflows</div>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur rounded-lg p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-green-400">{categories.length}</div>
              <div className="text-sm text-zinc-400">Categories</div>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur rounded-lg p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-amber-400">
                {templates.reduce((sum, t) => sum + t.step_count, 0)}
              </div>
              <div className="text-sm text-zinc-400">Total Steps</div>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur rounded-lg p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-purple-400">GitHub</div>
              <div className="text-sm text-zinc-400">Open Source</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Complexity</label>
            <div className="flex gap-2">
              {['all', 'Beginner', 'Intermediate', 'Advanced'].map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedComplexity(level)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    selectedComplexity === level
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {level === 'all' ? 'All Levels' : level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-indigo-500/30 transition-all"
            >
              {/* Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </span>
                      <span className={`text-xs font-semibold ${getComplexityColor(template.complexity)}`}>
                        {template.complexity}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {template.step_count} steps
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{template.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-4 h-4" />
                        {template.source.split('/')[0]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {template.estimated_time}
                      </span>
                      {template.tools_required && template.tools_required.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Wrench className="w-4 h-4" />
                          {template.tools_required.length} tools
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mapped Occupations */}
                {template.mapped_occupations && template.mapped_occupations.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-zinc-500 mb-1">Used by:</div>
                    <div className="flex flex-wrap gap-2">
                      {template.mapped_occupations.slice(0, 3).map(code => (
                        <Link
                          key={code}
                          to={`/occupation/${code}`}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 transition-colors"
                        >
                          {code}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-sm font-medium"
                >
                  {expandedId === template.id ? (
                    <>
                      <ChevronUp className="w-4 h-4" /> Hide Workflow Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" /> Show Workflow Details
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Content */}
              {expandedId === template.id && (
                <div className="border-t border-zinc-800 bg-zinc-950/50 p-6 space-y-6">
                  {/* Steps */}
                  {template.steps && template.steps.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-green-400">Workflow Steps</h3>
                      </div>
                      <div className="space-y-3">
                        {template.steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-900 rounded border border-zinc-800">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                              {step.order}
                            </span>
                            <div className="flex-1">
                              <p className="text-zinc-300">{step.action}</p>
                              {step.tools && step.tools.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {step.tools.map((tool, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                                      {tool}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tools Required */}
                  {template.tools_required && template.tools_required.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Wrench className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-semibold text-amber-400">Tools & Technologies</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {template.tools_required.map((tool, idx) => (
                          <span key={idx} className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 text-sm">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edge Cases */}
                  {template.edge_cases && template.edge_cases.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h3 className="text-lg font-semibold text-red-400">Edge Cases & Considerations</h3>
                      </div>
                      <ul className="space-y-2">
                        {template.edge_cases.map((edge, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                            <span className="text-red-400 mt-1">•</span>
                            <span>{edge}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Source Link */}
                  <div className="pt-4 border-t border-zinc-800">
                    <a
                      href={template.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View original on GitHub
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12 text-zinc-400">
            No templates found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
