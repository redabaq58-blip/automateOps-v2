import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Treemap } from 'recharts';
import { Flame, TrendingUp, Zap, ChevronRight, Filter, BarChart3, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AUTOMATION_COLORS = {
  high: '#22c55e',     // green
  medium: '#eab308',   // yellow
  low: '#ef4444',      // red
  none: '#3f3f46',     // zinc
};

const INDUSTRY_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#eab308', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6',
  '#f59e0b', '#84cc16', '#a855f7', '#0ea5e9', '#d946ef',
  '#10b981', '#f43f5e', '#6d28d9', '#0891b2', '#e11d48',
  '#059669', '#7c3aed', '#0284c7',
];

function HeatmapCell({ name, value, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative group overflow-hidden rounded-md border border-zinc-800/40 transition-all duration-200 hover:border-zinc-600 hover:scale-[1.02]"
      style={{ background: color, minHeight: '60px' }}
    >
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
      <div className="relative p-2.5 h-full flex flex-col justify-between">
        <span className="text-[10px] font-mono text-white/90 leading-tight line-clamp-2">{name}</span>
        <span className="text-[10px] font-mono text-white/70 mt-1">{value != null ? `${(value * 100).toFixed(0)}%` : '-'}</span>
      </div>
    </button>
  );
}

export default function AutomationHeatmap() {
  const navigate = useNavigate();
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('industry');
  const [selectedIndustry, setSelectedIndustry] = useState(null);

  useEffect(() => {
    axios.get(`${API}/heatmap/data`)
      .then(r => setHeatmapData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const industryData = useMemo(() => {
    if (!heatmapData?.industries) return [];
    return heatmapData.industries.sort((a, b) => (b.avg_automation || 0) - (a.avg_automation || 0));
  }, [heatmapData]);

  const topOccupations = useMemo(() => {
    if (!heatmapData?.top_automatable) return [];
    return heatmapData.top_automatable;
  }, [heatmapData]);

  const automationTypeBreakdown = useMemo(() => {
    if (!heatmapData?.type_breakdown) return [];
    return heatmapData.type_breakdown;
  }, [heatmapData]);

  const getColor = (score) => {
    if (score == null) return AUTOMATION_COLORS.none;
    if (score >= 0.7) return AUTOMATION_COLORS.high;
    if (score >= 0.4) return AUTOMATION_COLORS.medium;
    return AUTOMATION_COLORS.low;
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-zinc-800 rounded" />
          <div className="grid grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-zinc-800/50 rounded" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" data-testid="heatmap-page">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
              <Flame className="w-3 h-3 mr-1" /> Live Data
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] border-zinc-700 text-zinc-500">
              {heatmapData?.total_enriched || 0} tasks analyzed
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 mb-2" data-testid="heatmap-title">Automation Heatmap</h1>
          <p className="text-sm text-zinc-500 max-w-xl">Discover which industries and occupations have the highest AI automation potential. Based on LLM analysis of {heatmapData?.total_enriched?.toLocaleString() || '...'} real task statements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('industry')} className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${view === 'industry' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`} data-testid="view-industry">
            <BarChart3 className="w-3 h-3 inline mr-1" /> By Industry
          </button>
          <button onClick={() => setView('grid')} className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${view === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`} data-testid="view-grid">
            <Grid3X3 className="w-3 h-3 inline mr-1" /> Heat Grid
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Avg Automation Score', value: heatmapData?.overall_avg != null ? `${(heatmapData.overall_avg * 100).toFixed(0)}%` : '-', color: 'text-indigo-400' },
          { label: 'High Potential Tasks', value: heatmapData?.high_automation_count?.toLocaleString() || '0', color: 'text-emerald-400' },
          { label: 'Most Automatable', value: industryData[0]?.name?.substring(0, 20) || '-', color: 'text-yellow-400' },
          { label: 'Industries Analyzed', value: industryData.filter(d => d.avg_automation != null).length, color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4">
            <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 p-3 bg-zinc-950/50 border border-zinc-800/60 rounded-lg">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Automation Potential:</span>
        {[
          { label: 'High (70-100%)', color: AUTOMATION_COLORS.high },
          { label: 'Medium (40-69%)', color: AUTOMATION_COLORS.medium },
          { label: 'Low (0-39%)', color: AUTOMATION_COLORS.low },
          { label: 'Not analyzed', color: AUTOMATION_COLORS.none },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span className="text-[10px] font-mono text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      {view === 'industry' ? (
        <>
          {/* Industry Bar Chart */}
          <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-6 mb-6">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">Automation Potential by Industry</h3>
            <ResponsiveContainer width="100%" height={Math.max(400, industryData.length * 30)}>
              <BarChart data={industryData} layout="vertical" margin={{ left: 200, right: 40, top: 5, bottom: 5 }}>
                <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: '#52525b' }} axisLine={{ stroke: '#27272a' }} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} width={200} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', fontSize: '11px' }}
                  labelStyle={{ color: '#f4f4f5', fontWeight: 600 }}
                  formatter={(val) => [`${(val * 100).toFixed(1)}%`, 'Avg Automation Score']}
                />
                <Bar dataKey="avg_automation" radius={[0, 4, 4, 0]} maxBarSize={20} cursor="pointer"
                  onClick={(d) => d && setSelectedIndustry(d.group_code)}>
                  {industryData.map((entry, i) => (
                    <Cell key={i} fill={getColor(entry.avg_automation)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Automation Type Breakdown */}
          {automationTypeBreakdown.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-zinc-200 mb-4">Automation Type Distribution</h3>
                <div className="space-y-3">
                  {automationTypeBreakdown.map(({ type, count, pct }) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className={`font-mono text-[10px] px-2 py-1 rounded border w-16 text-center ${type === 'LLM' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : type === 'RPA' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : type === 'Hybrid' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>{type}</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500 w-16 text-right">{count} ({pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Automatable */}
              <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-zinc-200 mb-4">Most Automatable Occupations</h3>
                <div className="space-y-2">
                  {topOccupations.slice(0, 10).map((occ, i) => (
                    <button
                      key={occ.onet_code}
                      onClick={() => navigate(`/occupation/${encodeURIComponent(occ.onet_code)}`)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-900/50 transition-colors group"
                      data-testid={`heatmap-occ-${occ.onet_code}`}
                    >
                      <span className="font-mono text-[10px] text-zinc-600 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-zinc-300 group-hover:text-indigo-300 transition-colors truncate block">{occ.title}</span>
                        <span className="font-mono text-[10px] text-zinc-600">{occ.onet_code}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${occ.avg_score * 100}%`, background: getColor(occ.avg_score) }} />
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 w-10 text-right">{(occ.avg_score * 100).toFixed(0)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Grid View */
        <div className="mb-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {topOccupations.map((occ) => (
              <HeatmapCell
                key={occ.onet_code}
                name={occ.title}
                value={occ.avg_score}
                color={getColor(occ.avg_score)}
                onClick={() => navigate(`/occupation/${encodeURIComponent(occ.onet_code)}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected Industry Detail */}
      {selectedIndustry && (
        <IndustryDetail groupCode={selectedIndustry} onClose={() => setSelectedIndustry(null)} navigate={navigate} getColor={getColor} />
      )}
    </div>
  );
}

function IndustryDetail({ groupCode, onClose, navigate, getColor }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/heatmap/industry/${groupCode}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupCode]);

  if (loading) return null;
  if (!data) return null;

  return (
    <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-6 mt-6" data-testid="industry-detail">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">{data.industry_name} - Occupation Breakdown</h3>
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300">Close</button>
      </div>
      <div className="space-y-2">
        {data.occupations?.map((occ, i) => (
          <button
            key={occ.onet_code}
            onClick={() => navigate(`/occupation/${encodeURIComponent(occ.onet_code)}`)}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-900/50 transition-colors group border border-zinc-800/30"
          >
            <div className="w-2 h-2 rounded-sm" style={{ background: getColor(occ.avg_score) }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-zinc-300 group-hover:text-indigo-300 truncate block">{occ.title}</span>
              <span className="font-mono text-[10px] text-zinc-600">{occ.onet_code} | {occ.enriched_tasks} enriched tasks</span>
            </div>
            <span className="font-mono text-xs text-zinc-400">{occ.avg_score != null ? `${(occ.avg_score * 100).toFixed(0)}%` : '-'}</span>
            <ChevronRight className="w-3 h-3 text-zinc-700" />
          </button>
        ))}
      </div>
    </div>
  );
}
