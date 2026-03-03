import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Check, X, Package, Users, Database, BarChart3, Activity } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [enrichmentStats, setEnrichmentStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      // For demo, allow all authenticated users
    }
    const token = localStorage.getItem('aod_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      axios.get(`${API}/admin/queue`, { headers }).then(r => setQueue(r.data.queue || [])).catch(() => {}),
      axios.get(`${API}/stats`).then(r => setStats(r.data)).catch(() => {}),
      axios.get(`${API}/admin/enrichment-stats`, { headers }).then(r => setEnrichmentStats(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user]);

  const moderate = async (packId, action) => {
    try {
      const token = localStorage.getItem('aod_token');
      await axios.post(`${API}/admin/moderate/${packId}?action=${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setQueue(prev => prev.filter(p => p.id !== packId));
      toast.success(`Pack ${action}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Moderation failed');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" data-testid="admin-panel-page">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Admin Panel</h1>
          <p className="text-sm text-zinc-500">Data management and moderation</p>
        </div>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Occupations', value: stats.total_occupations, icon: Database },
            { label: 'Tasks', value: stats.total_tasks, icon: Activity },
            { label: 'Skills', value: stats.total_skills, icon: BarChart3 },
            { label: 'Tools', value: stats.total_tools, icon: Package },
            { label: 'Crosswalks', value: stats.total_crosswalks, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4">
              <Icon className="w-4 h-4 text-indigo-400 mb-2" />
              <div className="text-lg font-bold font-mono text-zinc-100">{value?.toLocaleString() || 0}</div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Enrichment Stats */}
      {enrichmentStats && (
        <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-6 mb-8">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">LLM Enrichment Progress</h3>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-2xl font-bold font-mono text-indigo-400">{enrichmentStats.enriched_tasks}</div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Enriched</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-zinc-400">{enrichmentStats.total_tasks}</div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Total</div>
            </div>
            <div className="flex-1">
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${enrichmentStats.total_tasks > 0 ? (enrichmentStats.enriched_tasks / enrichmentStats.total_tasks) * 100 : 0}%` }} />
              </div>
              <div className="text-[10px] font-mono text-zinc-600 mt-1">
                {enrichmentStats.total_tasks > 0 ? ((enrichmentStats.enriched_tasks / enrichmentStats.total_tasks) * 100).toFixed(1) : 0}% complete
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {enrichmentStats.data_sources?.map(src => (
              <Badge key={src} variant="outline" className="font-mono text-[10px] border-zinc-700 text-zinc-500">{src}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Moderation Queue */}
      <Tabs defaultValue="queue">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-1 mb-6">
          <TabsTrigger value="queue" className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 px-3 py-1.5 rounded-md" data-testid="tab-moderation">
            Moderation Queue ({queue.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          {queue.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950/50 border border-zinc-800/60 rounded-lg">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No pending packs to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map(pack => (
                <div key={pack.id} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-5 flex items-start justify-between" data-testid={`queue-pack-${pack.id}`}>
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-[10px] border-yellow-500/30 text-yellow-400 bg-yellow-500/5">PENDING</Badge>
                      <span className="font-mono text-[10px] text-zinc-600">{new Date(pack.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-1">{pack.title}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2">{pack.description}</p>
                    {pack.occupation_codes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pack.occupation_codes.map(code => (
                          <span key={code} className="font-mono text-[10px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">{code}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] font-mono text-zinc-600 mt-2">By: {pack.user_name || 'Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => moderate(pack.id, 'approved')} className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" data-testid={`approve-${pack.id}`}>
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => moderate(pack.id, 'rejected')} className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid={`reject-${pack.id}`}>
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
