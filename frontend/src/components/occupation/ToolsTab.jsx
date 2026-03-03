import React, { useState, useEffect } from 'react';
import { occupationAPI } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Wrench, Cpu, Flame } from 'lucide-react';

export default function ToolsTab({ onetCode }) {
  const [tools, setTools] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('technology');

  useEffect(() => {
    setLoading(true);
    occupationAPI.tools(onetCode)
      .then(r => {
        setTools(r.data.tools || []);
        setTechnology(r.data.technology || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onetCode]);

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-zinc-800/30 rounded animate-pulse" />)}</div>;

  const activeList = tab === 'technology' ? technology : tools;
  const hotTech = technology.filter(t => t.hot_technology);

  // Group by category
  const grouped = {};
  activeList.forEach(item => {
    const cat = item.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return (
    <div data-testid="tools-tab">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setTab('technology')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${tab === 'technology' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`} data-testid="tools-tech-tab">
          <Cpu className="w-3 h-3" /> Technology ({technology.length})
        </button>
        <button onClick={() => setTab('tools')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${tab === 'tools' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`} data-testid="tools-physical-tab">
          <Wrench className="w-3 h-3" /> Tools ({tools.length})
        </button>
      </div>

      {/* Hot Technology */}
      {tab === 'technology' && hotTech.length > 0 && (
        <div className="mb-4 p-4 bg-zinc-950/50 border border-zinc-800/60 rounded-lg">
          <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-orange-400" /> Hot Technology
          </h4>
          <div className="flex flex-wrap gap-2">
            {hotTech.map((t, i) => (
              <Badge key={i} variant="outline" className="font-mono text-[10px] border-orange-500/20 text-orange-300 bg-orange-500/5">{t.name}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Grouped list */}
      <div className="space-y-4">
        {Object.entries(grouped).sort().map(([category, items]) => (
          <div key={category} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">{category}</span>
              <span className="font-mono text-[10px] text-zinc-600">{items.length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3">
              {items.map((item, i) => (
                <span key={i} className={`font-mono text-[10px] px-2 py-1 rounded-sm border ${item.hot_technology ? 'bg-orange-500/5 border-orange-500/20 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
