import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { occupationAPI } from '@/lib/api';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RelatedTab({ onetCode }) {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    occupationAPI.related(onetCode)
      .then(r => setRelated(r.data.related || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onetCode]);

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-zinc-800/30 rounded animate-pulse" />)}</div>;

  return (
    <div data-testid="related-tab">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-4">{related.length} Related Occupations</h3>
      <div className="space-y-2">
        {related.map((rel, i) => (
          <button
            key={i}
            onClick={() => navigate(`/occupation/${encodeURIComponent(rel.related_code)}`)}
            className="w-full text-left bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4 hover:border-zinc-700 transition-all duration-200 flex items-center justify-between group"
            data-testid={`related-${rel.related_code}`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-zinc-600">{rel.related_code}</span>
                <Badge variant="outline" className="font-mono text-[10px] border-zinc-800 text-zinc-600">{rel.tier}</Badge>
              </div>
              <p className="text-sm text-zinc-300 group-hover:text-indigo-300 transition-colors">{rel.related_title || rel.related_code}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-indigo-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
