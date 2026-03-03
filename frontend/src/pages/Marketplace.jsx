import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Download, Plus, Search, ChevronRight, Star, Zap, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { marketplaceAPI, searchAPI } from '@/lib/api';
import { useAuth } from '@/App';
import { toast } from 'sonner';
import DataPackBuilder from '@/components/DataPackBuilder';

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPackBuilder, setShowPackBuilder] = useState(false);

  useEffect(() => {
    marketplaceAPI.list({ status: 'approved' })
      .then(r => setPacks(r.data.packs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" data-testid="marketplace-page">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-2">Marketplace</h1>
          <p className="text-sm text-zinc-500">Curated data packs for AI automation builders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPackBuilder(true)} className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800" data-testid="build-pack-btn">
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Build Pack
          </Button>
          {user && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs" data-testid="create-pack-btn">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Upload Pack
            </Button>
          )}
        </div>
      </div>

      {/* Data Pack Builder */}
      <DataPackBuilder open={showPackBuilder} onOpenChange={setShowPackBuilder} />

      {/* Pack list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-6 animate-pulse">
              <div className="h-4 w-32 bg-zinc-800 rounded mb-3" />
              <div className="h-3 w-full bg-zinc-800/50 rounded mb-2" />
              <div className="h-3 w-3/4 bg-zinc-800/50 rounded" />
            </div>
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="text-center py-20 bg-zinc-950/50 border border-zinc-800/60 rounded-lg">
          <Package className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-zinc-300 mb-2">No packs available yet</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">Be the first to create a data pack! Use the Pack Builder to combine multiple occupations into a machine-ready bundle.</p>
          <div className="flex items-center justify-center gap-3">
            <Button size="sm" onClick={() => setShowPackBuilder(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs" data-testid="empty-build-pack-btn">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Build a Pack
            </Button>
            {user && (
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="text-xs border-zinc-700 text-zinc-300" data-testid="empty-upload-pack-btn">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Upload Your Data
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map(pack => (
            <div key={pack.id} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-6 hover:border-zinc-700 transition-colors group" data-testid={`pack-${pack.id}`}>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5">FREE</Badge>
                <span className="font-mono text-[10px] text-zinc-600">{pack.occupation_codes?.length || 0} occupations</span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-2 group-hover:text-indigo-300 transition-colors">{pack.title}</h3>
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-4">{pack.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-zinc-600">{new Date(pack.created_at).toLocaleDateString()}</span>
                <Button size="sm" variant="ghost" className="text-xs text-indigo-400 hover:text-indigo-300">
                  <Download className="w-3 h-3 mr-1" /> Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Pack Dialog */}
      <CreatePackDialog open={showCreate} onOpenChange={setShowCreate} onCreated={(pack) => {
        setPacks(prev => [pack, ...prev]);
        setShowCreate(false);
      }} />
    </div>
  );
}

function CreatePackDialog({ open, onOpenChange, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [codes, setCodes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const codeList = codes.split(',').map(c => c.trim()).filter(Boolean);
      const res = await marketplaceAPI.create({ title, description, occupation_codes: codeList });
      toast.success('Pack submitted for review');
      onCreated(res.data);
      setTitle(''); setDescription(''); setCodes('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create pack');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg" data-testid="create-pack-dialog">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Upload Data Pack</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Pack Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Healthcare AI Automation Starter" className="bg-zinc-900/50 border-zinc-800 text-sm" data-testid="pack-title-input" required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's in this pack? What AI use cases does it enable?" className="bg-zinc-900/50 border-zinc-800 text-sm min-h-[80px]" data-testid="pack-desc-input" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Occupation Codes (comma-separated)</Label>
            <Input value={codes} onChange={e => setCodes(e.target.value)} placeholder="29-1141.00, 29-2061.00, 29-1215.00" className="bg-zinc-900/50 border-zinc-800 text-sm font-mono" data-testid="pack-codes-input" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm" data-testid="pack-submit-btn">
              {loading ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
