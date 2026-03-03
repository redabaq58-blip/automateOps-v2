import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, FileJson, FileSpreadsheet, Bookmark, BookmarkCheck, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { occupationAPI, libraryAPI } from '@/lib/api';
import { useAuth } from '@/App';
import { toast } from 'sonner';
import TasksTab from '@/components/occupation/TasksTab';
import SkillsKnowledgeTab from '@/components/occupation/SkillsKnowledgeTab';
import ToolsTab from '@/components/occupation/ToolsTab';
import WorkContextTab from '@/components/occupation/WorkContextTab';
import WorkActivitiesTab from '@/components/occupation/WorkActivitiesTab';
import RelatedTab from '@/components/occupation/RelatedTab';

export default function OccupationDetail() {
  const { code } = useParams();
  const { user } = useAuth();
  const [occ, setOcc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    occupationAPI.get(code)
      .then(r => setOcc(r.data))
      .catch(() => toast.error('Occupation not found'))
      .finally(() => setLoading(false));
    
    if (user) {
      libraryAPI.check(code).then(r => setSaved(r.data.saved)).catch(() => {});
    }
  }, [code, user]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await occupationAPI.export(occ.onet_code, format);
      const blob = format === 'csv' ? res.data : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${occ.onet_code}_data.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
    setExporting(false);
  };

  const handleSave = async () => {
    if (!user) { toast.error('Sign in to save'); return; }
    try {
      const res = await libraryAPI.save(occ.onet_code);
      setSaved(res.data.saved);
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to update library');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="h-8 w-96 bg-zinc-800 rounded" />
          <div className="h-4 w-full bg-zinc-800/50 rounded" />
        </div>
      </div>
    );
  }

  if (!occ) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-20 text-center">
        <p className="text-zinc-500">Occupation not found</p>
        <Link to="/search" className="text-indigo-400 text-sm mt-2 inline-block">Back to search</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" data-testid="occupation-detail-page">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/search" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1" data-testid="back-to-search">
          <ArrowLeft className="w-3 h-3" /> Search
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-xs font-mono text-zinc-600">{occ.onet_code}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-indigo-500/30 text-indigo-400 bg-indigo-500/5">{occ.onet_code}</Badge>
            {occ.noc_codes?.length > 0 && occ.noc_codes.map(nc => (
              <Badge key={nc} variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-emerald-500/30 text-emerald-400 bg-emerald-500/5">NOC {nc}</Badge>
            ))}
            {occ.job_zone && <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-zinc-700 text-zinc-500">Zone {occ.job_zone}</Badge>}
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-zinc-700 text-zinc-500">{occ.country_scope?.join(', ')}</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 mb-2" data-testid="occupation-title">{occ.title_en}</h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl" data-testid="occupation-definition">{occ.definition_en}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleSave} className={saved ? "text-indigo-400" : "text-zinc-500"} data-testid="save-btn">
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-800 border-zinc-700 text-xs">{saved ? 'Saved' : 'Save to library'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" variant="outline" onClick={() => handleExport('json')} disabled={exporting} className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800" data-testid="export-json-btn">
            <FileJson className="w-3.5 h-3.5 mr-1.5" /> JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('csv')} disabled={exporting} className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800" data-testid="export-csv-btn">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4">
          <div className="text-lg font-bold font-mono text-zinc-100">{occ.task_count || 0}</div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Tasks</div>
        </div>
        <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4">
          <div className="text-lg font-bold font-mono text-zinc-100">{occ.tool_count || 0}</div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Tools & Tech</div>
        </div>
        <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4">
          <div className="text-lg font-bold font-mono text-zinc-100">{occ.job_zone || '-'}</div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Job Zone</div>
        </div>
        <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4">
          <div className="text-lg font-bold font-mono text-zinc-100">O*NET</div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Source</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="w-full" data-testid="occupation-tabs">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-1 mb-6 flex flex-wrap gap-0.5">
          {['tasks', 'skills', 'tools', 'activities', 'context', 'related'].map(tab => (
            <TabsTrigger key={tab} value={tab} className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 px-3 py-1.5 rounded-md capitalize" data-testid={`tab-${tab}`}>
              {tab === 'activities' ? 'Work Activities' : tab === 'context' ? 'Work Context' : tab === 'skills' ? 'Skills & Knowledge' : tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tasks"><TasksTab onetCode={occ.onet_code} /></TabsContent>
        <TabsContent value="skills"><SkillsKnowledgeTab onetCode={occ.onet_code} /></TabsContent>
        <TabsContent value="tools"><ToolsTab onetCode={occ.onet_code} /></TabsContent>
        <TabsContent value="activities"><WorkActivitiesTab onetCode={occ.onet_code} /></TabsContent>
        <TabsContent value="context"><WorkContextTab onetCode={occ.onet_code} /></TabsContent>
        <TabsContent value="related"><RelatedTab onetCode={occ.onet_code} /></TabsContent>
      </Tabs>

      {/* Attribution */}
      <div className="mt-8 p-4 bg-zinc-950/50 border border-zinc-800/60 rounded-lg">
        <p className="text-[10px] font-mono text-zinc-600 leading-relaxed" data-testid="attribution-notice">
          {occ.attribution || "Includes O*NET 30.2 data, U.S. Department of Labor/Employment and Training Administration (USDOL/ETA). Licensed under CC BY 4.0."}
          {occ.noc_codes?.length > 0 && " | Contains information from the National Occupational Classification (NOC) 2021, Statistics Canada. Licensed under the Open Government Licence - Canada."}
        </p>
      </div>
    </div>
  );
}
