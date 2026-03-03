import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { searchAPI, industryAPI } from '@/lib/api';

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [taskMatches, setTaskMatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [industries, setIndustries] = useState([]);

  const q = params.get('q') || '';
  const page = parseInt(params.get('page') || '1');
  const majorGroup = params.get('major_group') || '';
  const jobZone = params.get('job_zone') || '';

  useEffect(() => {
    industryAPI.list().then(r => setIndustries(r.data.industries || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const searchParams = { q, page, limit: 20 };
    if (majorGroup) searchParams.major_group = majorGroup;
    if (jobZone) searchParams.job_zone = parseInt(jobZone);
    
    searchAPI.search(searchParams)
      .then(r => {
        setResults(r.data.results || []);
        setTaskMatches(r.data.task_matches || []);
        setTotal(r.data.total || 0);
        setTotalPages(r.data.total_pages || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, page, majorGroup, jobZone]);

  const updateParam = (key, val) => {
    const newParams = new URLSearchParams(params);
    if (val) {
      newParams.set(key, val);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setParams(newParams);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" data-testid="search-results-page">
      {/* Search bar */}
      <form onSubmit={e => { e.preventDefault(); updateParam('q', document.getElementById('search-input').value); }} className="mb-6">
        <div className="flex items-center bg-zinc-900/50 border border-zinc-800/80 rounded-lg px-4 py-2.5 focus-within:border-indigo-500/50 transition-colors">
          <Search className="w-4 h-4 text-zinc-500 mr-3" />
          <input
            id="search-input"
            type="text"
            defaultValue={q}
            placeholder="Search occupations, tasks, skills..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono"
            data-testid="search-input"
          />
          <Button type="submit" size="sm" variant="ghost" className="text-xs text-zinc-400">Search</Button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Filter className="w-3 h-3" /> Filters:
        </div>
        <Select value={majorGroup} onValueChange={v => updateParam('major_group', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px] h-8 text-xs bg-zinc-900/50 border-zinc-800" data-testid="filter-industry">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-xs">All Industries</SelectItem>
            {industries.map(ind => (
              <SelectItem key={ind.group_code} value={ind.group_code} className="text-xs">
                {ind.name} ({ind.occupation_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={jobZone} onValueChange={v => updateParam('job_zone', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-zinc-900/50 border-zinc-800" data-testid="filter-jobzone">
            <SelectValue placeholder="All Job Zones" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-xs">All Job Zones</SelectItem>
            {[1,2,3,4,5].map(z => (
              <SelectItem key={z} value={String(z)} className="text-xs">Zone {z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(majorGroup || jobZone) && (
          <button onClick={() => { updateParam('major_group', ''); updateParam('job_zone', ''); }} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300" data-testid="clear-filters-btn">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-xs font-mono text-zinc-600 ml-auto">{total} results</span>
      </div>

      {/* Task matches */}
      {taskMatches.length > 0 && (
        <div className="mb-6 bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4">
          <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">Matching Tasks</h3>
          <div className="space-y-2">
            {taskMatches.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <button onClick={() => navigate(`/occupation/${encodeURIComponent(t.onet_code)}`)} className="font-mono text-indigo-400 hover:text-indigo-300 whitespace-nowrap">{t.onet_code}</button>
                <span className="text-zinc-400">{t.statement_en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-5 animate-pulse">
              <div className="h-3 w-20 bg-zinc-800 rounded mb-3" />
              <div className="h-4 w-48 bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-full bg-zinc-800/50 rounded" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">No occupations found for "{q}"</p>
          <p className="text-zinc-600 text-xs mt-2">Try a different search term or browse industries</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
          {results.map(occ => (
            <button
              key={occ.onet_code}
              onClick={() => navigate(`/occupation/${encodeURIComponent(occ.onet_code)}`)}
              className="text-left bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-5 hover:border-zinc-700 transition-all duration-200 group"
              data-testid={`search-result-${occ.onet_code}`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">{occ.onet_code}</span>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1.5 group-hover:text-indigo-300 transition-colors">{occ.title_en}</h3>
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{occ.definition_en?.substring(0, 150)}</p>
              <div className="flex items-center gap-2 mt-3">
                {occ.job_zone && <span className="font-mono text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">Zone {occ.job_zone}</span>}
                <span className="font-mono text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">{occ.country_scope?.join(', ')}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))} className="text-xs text-zinc-500" data-testid="prev-page-btn">Prev</Button>
          <span className="text-xs font-mono text-zinc-600">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))} className="text-xs text-zinc-500" data-testid="next-page-btn">Next</Button>
        </div>
      )}
    </div>
  );
}
