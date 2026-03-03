import React, { useState, useEffect } from 'react';
import { occupationAPI } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function KSAChart({ data, label }) {
  const chartData = data.slice(0, 15).map(d => ({
    name: d.name?.length > 25 ? d.name.substring(0, 25) + '...' : d.name,
    fullName: d.name,
    importance: Number(d.importance) || 0,
    level: Number(d.level) || 0,
  }));

  return (
    <div>
      <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">{label} ({data.length} items)</h4>
      {chartData.length > 0 && (
        <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-4 mb-4">
          <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 28)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: '#52525b' }} axisLine={{ stroke: '#27272a' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} width={120} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', fontSize: '11px' }}
                labelStyle={{ color: '#f4f4f5', fontWeight: 600 }}
                formatter={(val, name) => [Number(val).toFixed(2), name === 'importance' ? 'Importance' : 'Level']}
              />
              <Bar dataKey="importance" radius={[0, 3, 3, 0]} maxBarSize={16}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i < 5 ? '#6366f1' : '#3f3f46'} />
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
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3 w-28">Importance</th>
              <th className="text-left px-4 py-3 w-28">Level</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-900/30 transition-colors">
                <td className="px-4 py-2.5 text-xs text-zinc-300">{item.name}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${((item.importance || 0) / 5) * 100}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">{item.importance != null ? Number(item.importance).toFixed(2) : '-'}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${((item.level || 0) / 7) * 100}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">{item.level != null ? Number(item.level).toFixed(2) : '-'}</span>
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

export default function SkillsKnowledgeTab({ onetCode }) {
  const [skills, setSkills] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [abilities, setAbilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      occupationAPI.skills(onetCode).then(r => setSkills(r.data.skills || [])),
      occupationAPI.knowledge(onetCode).then(r => setKnowledge(r.data.knowledge || [])),
      occupationAPI.abilities(onetCode).then(r => setAbilities(r.data.abilities || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [onetCode]);

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-zinc-800/30 rounded animate-pulse" />)}</div>;

  return (
    <div data-testid="skills-tab">
      <Tabs defaultValue="skills">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-1 mb-6">
          <TabsTrigger value="skills" className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 px-3 py-1.5 rounded-md">Skills ({skills.length})</TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 px-3 py-1.5 rounded-md">Knowledge ({knowledge.length})</TabsTrigger>
          <TabsTrigger value="abilities" className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 px-3 py-1.5 rounded-md">Abilities ({abilities.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="skills"><KSAChart data={skills} label="Skills" /></TabsContent>
        <TabsContent value="knowledge"><KSAChart data={knowledge} label="Knowledge" /></TabsContent>
        <TabsContent value="abilities"><KSAChart data={abilities} label="Abilities" /></TabsContent>
      </Tabs>
    </div>
  );
}
