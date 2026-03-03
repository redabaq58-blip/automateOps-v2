import React, { useState, useEffect } from 'react';
import { occupationAPI } from '@/lib/api';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function TasksTab({ onetCode }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('importance');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    setLoading(true);
    occupationAPI.tasks(onetCode, { sort: sortField, order: sortOrder })
      .then(r => setTasks(r.data.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onetCode, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-zinc-700" />;
    return sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-indigo-400" /> : <ArrowUp className="w-3 h-3 text-indigo-400" />;
  };

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-zinc-800/30 rounded animate-pulse" />)}</div>;

  return (
    <div data-testid="tasks-tab">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{tasks.length} Tasks</h3>
      </div>
      <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th className="text-left px-4 py-3 w-12">#</th>
              <th className="text-left px-4 py-3">Task Statement</th>
              <th className="text-left px-4 py-3 w-20">
                <button onClick={() => toggleSort('importance')} className="flex items-center gap-1 hover:text-zinc-400 transition-colors" data-testid="sort-importance">
                  IMP <SortIcon field="importance" />
                </button>
              </th>
              <th className="text-left px-4 py-3 w-24">
                <button onClick={() => toggleSort('automatable_score')} className="flex items-center gap-1 hover:text-zinc-400 transition-colors" data-testid="sort-automation">
                  AUTO <SortIcon field="automatable_score" />
                </button>
              </th>
              <th className="text-left px-4 py-3 w-16">Type</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => (
              <tr key={task.task_id || i} className="border-b border-zinc-800/30 hover:bg-zinc-900/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-[10px] text-zinc-600">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="text-xs text-zinc-300 leading-relaxed">{task.statement_en}</div>
                  {task.edge_cases && (
                    <div className="mt-1 text-[10px] text-zinc-500 italic">Edge cases: {task.edge_cases}</div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {task.importance != null ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(task.importance / 5) * 100}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500">{Number(task.importance).toFixed(1)}</span>
                    </div>
                  ) : <span className="text-zinc-700 text-[10px]">-</span>}
                </td>
                <td className="px-4 py-2.5">
                  {task.automatable_score != null ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${task.automatable_score >= 0.7 ? 'bg-emerald-500' : task.automatable_score >= 0.4 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${task.automatable_score * 100}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500">{Number(task.automatable_score).toFixed(2)}</span>
                    </div>
                  ) : <span className="text-zinc-700 text-[10px]">-</span>}
                </td>
                <td className="px-4 py-2.5">
                  {task.automation_type ? (
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${task.automation_type === 'LLM' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : task.automation_type === 'RPA' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : task.automation_type === 'Hybrid' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                      {task.automation_type}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                      {task.task_type || 'Core'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
