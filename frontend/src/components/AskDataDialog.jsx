import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Loader2, Database } from 'lucide-react';
import { askAPI } from '@/lib/api';

export default function AskDataDialog({ open, onOpenChange }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    
    const q = question.trim();
    setLoading(true);
    setHistory(prev => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    
    try {
      const res = await askAPI.ask(q);
      const ans = res.data.answer || 'No answer available';
      setHistory(prev => [...prev, { role: 'assistant', text: ans, occupations: res.data.context_occupations }]);
    } catch {
      setHistory(prev => [...prev, { role: 'assistant', text: 'Failed to get response. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[80vh] flex flex-col" data-testid="ask-data-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100 text-base">
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Ask the Data
          </DialogTitle>
          <p className="text-xs text-zinc-500">Query across 1,016 occupations and 18,000+ tasks using natural language</p>
        </DialogHeader>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-[200px] max-h-[400px]">
          {history.length === 0 && (
            <div className="text-center py-8">
              <Database className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-4">Ask anything about occupations, tasks, skills, or tools</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'What tasks do registered nurses perform?',
                  'Which occupations use Python?',
                  'Compare plumber vs electrician skills',
                ].map(s => (
                  <button key={s} onClick={() => setQuestion(s)} className="text-[10px] font-mono px-2.5 py-1.5 text-zinc-500 border border-zinc-800 rounded hover:border-zinc-700 hover:text-zinc-400 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-3 ${msg.role === 'user' ? 'bg-indigo-500/10 border border-indigo-500/20 text-zinc-200' : 'bg-zinc-900/50 border border-zinc-800/60 text-zinc-300'}`}>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.occupations && msg.occupations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.occupations.map((o, j) => (
                      <span key={j} className="font-mono text-[10px] px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400">{o.onet_code}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg px-4 py-3">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleAsk} className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about occupations, tasks, skills..."
            className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 font-mono"
            data-testid="ask-data-input"
          />
          <Button type="submit" disabled={loading || !question.trim()} size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white" data-testid="ask-data-submit-btn">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
