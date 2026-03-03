import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, Download, FileJson, FileSpreadsheet, Package, Plus, Loader2 } from 'lucide-react';
import { searchAPI } from '@/lib/api';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DataPackBuilder({ open, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchAPI.search({ q: query, limit: 10 });
      setSearchResults(res.data.results || []);
    } catch {
      toast.error('Search failed');
    }
    setSearching(false);
  };

  const addOccupation = (occ) => {
    if (!selected.find(s => s.onet_code === occ.onet_code)) {
      setSelected(prev => [...prev, occ]);
    }
  };

  const removeOccupation = (code) => {
    setSelected(prev => prev.filter(s => s.onet_code !== code));
  };

  const exportPack = async (format) => {
    if (selected.length === 0) {
      toast.error('Add at least one occupation');
      return;
    }
    setExporting(true);
    try {
      const codes = selected.map(s => s.onet_code);
      const res = await axios.post(`${API}/pack-builder/export`, { codes, format }, {
        responseType: format === 'csv' ? 'blob' : 'json',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const blob = format === 'csv' ? res.data : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_pack_${codes.length}_occupations.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Pack exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-3xl max-h-[85vh] flex flex-col" data-testid="pack-builder-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Package className="w-4 h-4 text-indigo-400" /> Data Pack Builder
          </DialogTitle>
          <p className="text-xs text-zinc-500">Select multiple occupations to create a combined machine-ready data bundle</p>
        </DialogHeader>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
            <Search className="w-4 h-4 text-zinc-500 mr-2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search occupations to add..."
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono"
              data-testid="pack-search-input"
            />
          </div>
          <Button type="submit" size="sm" disabled={searching} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs" data-testid="pack-search-btn">
            {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {/* Selected occupations */}
        <div className="border border-zinc-800/60 rounded-lg p-3 min-h-[80px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Selected ({selected.length})</span>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400">Clear all</button>
            )}
          </div>
          {selected.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">Search and add occupations to build your pack</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(occ => (
                <span key={occ.onet_code} className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-300">
                  {occ.onet_code}
                  <button onClick={() => removeOccupation(occ.onet_code)} className="hover:text-red-400 ml-0.5" data-testid={`remove-selected-${occ.onet_code}`}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto max-h-[300px] space-y-1">
          {searchResults.map(occ => {
            const isSelected = selected.some(s => s.onet_code === occ.onet_code);
            return (
              <button
                key={occ.onet_code}
                onClick={() => !isSelected && addOccupation(occ)}
                disabled={isSelected}
                className={`w-full text-left px-3 py-2.5 rounded-md flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-500/5 border border-indigo-500/20 opacity-50' : 'hover:bg-zinc-900/50 border border-transparent'}`}
                data-testid={`pack-result-${occ.onet_code}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-zinc-600">{occ.onet_code}</span>
                    {occ.noc_codes?.length > 0 && <Badge variant="outline" className="font-mono text-[8px] border-zinc-800 text-zinc-600">CA</Badge>}
                  </div>
                  <p className="text-xs text-zinc-300 truncate">{occ.title_en}</p>
                </div>
                {!isSelected && <Plus className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Export */}
        <DialogFooter className="flex items-center justify-between border-t border-zinc-800/60 pt-4">
          <span className="text-[10px] font-mono text-zinc-600">{selected.length} occupations selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportPack('json')} disabled={exporting || selected.length === 0} className="text-xs border-zinc-700 text-zinc-300" data-testid="pack-export-json-btn">
              <FileJson className="w-3.5 h-3.5 mr-1.5" /> Export JSON
            </Button>
            <Button size="sm" onClick={() => exportPack('csv')} disabled={exporting || selected.length === 0} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs" data-testid="pack-export-csv-btn">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
