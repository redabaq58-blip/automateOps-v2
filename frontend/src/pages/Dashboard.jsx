import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { libraryAPI, apiKeysAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bookmark, Key, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [library, setLibrary] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    Promise.all([
      libraryAPI.list().then(r => setLibrary(r.data.library || [])).catch(() => {}),
      apiKeysAPI.list().then(r => setApiKeys(r.data.keys || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user, navigate]);

  const generateKey = async () => {
    try {
      const res = await apiKeysAPI.generate();
      setApiKeys(prev => [...prev, { key: res.data.key, created_at: new Date().toISOString(), active: true }]);
      toast.success('API key generated');
    } catch {
      toast.error('Failed to generate key');
    }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    toast.success('Copied to clipboard');
  };

  const removeFromLibrary = async (code) => {
    try {
      await libraryAPI.save(code);
      setLibrary(prev => prev.filter(i => i.onet_code !== code));
      toast.success('Removed from library');
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Welcome back, {user.name || user.email}</p>
      </div>

      <Tabs defaultValue="library">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-1 mb-6">
          <TabsTrigger value="library" className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 px-3 py-1.5 rounded-md" data-testid="tab-library">
            <Bookmark className="w-3 h-3 mr-1.5" /> Library ({library.length})
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 px-3 py-1.5 rounded-md" data-testid="tab-api-keys">
            <Key className="w-3 h-3 mr-1.5" /> API Keys ({apiKeys.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          {library.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950/50 border border-zinc-800/60 rounded-lg">
              <Bookmark className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No saved occupations yet</p>
              <Button variant="ghost" size="sm" className="mt-3 text-indigo-400 text-xs" onClick={() => navigate('/search')}>Browse occupations</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {library.map(item => (
                <div key={item.onet_code} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4 flex items-center justify-between group">
                  <button onClick={() => navigate(`/occupation/${encodeURIComponent(item.onet_code)}`)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-zinc-600">{item.onet_code}</span>
                      <span className="font-mono text-[10px] text-zinc-700">{new Date(item.saved_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-zinc-300 group-hover:text-indigo-300 transition-colors truncate">{item.title_en}</p>
                  </button>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => removeFromLibrary(item.onet_code)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors" data-testid={`remove-lib-${item.onet_code}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="api-keys">
          <div className="mb-4">
            <Button size="sm" onClick={generateKey} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs" data-testid="generate-api-key-btn">
              <Plus className="w-3 h-3 mr-1.5" /> Generate API Key
            </Button>
          </div>
          {apiKeys.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950/50 border border-zinc-800/60 rounded-lg">
              <Key className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No API keys yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k, i) => (
                <div key={i} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <code className="text-xs font-mono text-zinc-300">{k.key}</code>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">{new Date(k.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => copyKey(k.key)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" data-testid={`copy-key-${i}`}>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
