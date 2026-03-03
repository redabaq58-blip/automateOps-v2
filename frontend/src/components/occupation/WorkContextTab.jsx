import React, { useState, useEffect } from 'react';
import { occupationAPI } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function WorkContextTab({ onetCode }) {
  const [context, setContext] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    occupationAPI.workContext(onetCode)
      .then(r => setContext(r.data.work_context || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onetCode]);

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-zinc-800/30 rounded animate-pulse" />)}</div>;

  // Filter to items with values
  const withValues = context.filter(c => c.value != null).sort((a, b) => (b.value || 0) - (a.value || 0));

  const chartData = withValues.slice(0, 20).map(c => ({
    name: c.name?.length > 30 ? c.name.substring(0, 30) + '...' : c.name,
    fullName: c.name,
    value: Number(c.value) || 0,
  }));

  return (
    <div data-testid="work-context-tab">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-4">{context.length} Work Context Metrics</h3>

      {chartData.length > 0 && (
        <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4 mb-6">
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 28)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 160, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={{ stroke: '#27272a' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} width={160} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', fontSize: '11px' }}
                labelStyle={{ color: '#f4f4f5', fontWeight: 600 }}
                formatter={(val) => [Number(val).toFixed(2), 'Value']}
              />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={16}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#3b82f6' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th className="text-left px-4 py-3">Context Metric</th>
              <th className="text-left px-4 py-3 w-24">Value</th>
              <th className="text-left px-4 py-3 w-32">Visual</th>
            </tr>
          </thead>
          <tbody>
            {withValues.map((item, i) => (
              <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-900/30 transition-colors">
                <td className="px-4 py-2.5 text-xs text-zinc-300">{item.name}</td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-zinc-500">{Number(item.value).toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (item.value / 5) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
