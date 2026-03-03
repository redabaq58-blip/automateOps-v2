import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderTree, ChevronRight, Users } from 'lucide-react';
import { industryAPI } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

export default function IndustryBrowser() {
  const [industries, setIndustries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [occupations, setOccupations] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    industryAPI.list().then(r => setIndustries(r.data.industries || [])).catch(() => {});
  }, []);

  const selectIndustry = async (code) => {
    setSelected(code);
    setLoading(true);
    try {
      const res = await industryAPI.occupations(code, { limit: 100 });
      setOccupations(res.data.occupations || []);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" data-testid="industry-browser-page">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-2">Industry Browser</h1>
        <p className="text-sm text-zinc-500">Explore occupations by SOC major groups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Industry list */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800/60">
              <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <FolderTree className="w-3 h-3" /> Major Groups
              </h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {industries.map(ind => (
                <button
                  key={ind.group_code}
                  onClick={() => selectIndustry(ind.group_code)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-800/30 hover:bg-zinc-900/50 transition-colors flex items-center justify-between group ${selected === ind.group_code ? 'bg-zinc-900/50 border-l-2 border-l-indigo-500' : ''}`}
                  data-testid={`industry-${ind.group_code}`}
                >
                  <div>
                    <span className="font-mono text-[10px] text-zinc-600">{ind.group_code}</span>
                    <p className="text-xs text-zinc-300 mt-0.5">{ind.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-zinc-600">{ind.occupation_count}</span>
                    <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Occupations list */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg">
              <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Occupations
                </h2>
                <Badge variant="outline" className="font-mono text-[10px] border-zinc-700 text-zinc-500">
                  {occupations.length} results
                </Badge>
              </div>
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-zinc-800/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/30 max-h-[600px] overflow-y-auto">
                  {occupations.map(occ => (
                    <button
                      key={occ.onet_code}
                      onClick={() => navigate(`/occupation/${encodeURIComponent(occ.onet_code)}`)}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-900/50 transition-colors flex items-center justify-between group"
                      data-testid={`industry-occ-${occ.onet_code}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-600">{occ.onet_code}</span>
                          {occ.job_zone && <span className="font-mono text-[10px] text-zinc-700">Z{occ.job_zone}</span>}
                        </div>
                        <p className="text-sm text-zinc-300 truncate group-hover:text-indigo-300 transition-colors">{occ.title_en}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-indigo-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg flex items-center justify-center py-20">
              <div className="text-center">
                <FolderTree className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Select an industry group to browse occupations</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
