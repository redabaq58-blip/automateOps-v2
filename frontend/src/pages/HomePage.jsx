import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Database, Code2, Download, Zap, ChevronRight, MessageSquare, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { statsAPI } from '@/lib/api';
import { useLang } from '@/App';
import { t } from '@/lib/translations';
import AskDataDialog from '@/components/AskDataDialog';
import ROICalculator from '@/components/ROICalculator';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [topGoldmine, setTopGoldmine] = useState(null);
  const [showAsk, setShowAsk] = useState(false);
  const { lang } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    statsAPI.get().then(r => setStats(r.data)).catch(() => {});
    statsAPI.featured().then(r => setFeatured(r.data.featured || [])).catch(() => {});
    // Fetch top goldmine
    axios.get(`${BACKEND_URL}/api/automation-goldmines?limit=1`)
      .then(r => setTopGoldmine(r.data.goldmines?.[0]))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="relative" data-testid="home-page">
      {/* Hero */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 glow-spot opacity-60" />
        <div className="relative max-w-[1400px] mx-auto">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-2.5 py-1">
                O*NET 30.2
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-2.5 py-1">
                NOC 2021
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-zinc-700 text-zinc-500 px-2.5 py-1">
                {stats?.total_occupations?.toLocaleString() || '1,016'} {t('stats.occupations', lang).toLowerCase()}
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.1] mb-4" data-testid="hero-title">
              {t('hero.title.line1', lang)}<br />
              <span className="text-indigo-400">{t('hero.title.line2', lang)}</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl mb-10">
              {t('hero.subtitle', lang)}
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-2xl" data-testid="hero-search-form">
              <div className="relative glow-indigo rounded-xl">
                <div className="flex items-center bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl rounded-xl px-4 py-3 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all duration-300">
                  <Search className="w-5 h-5 text-zinc-500 mr-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('hero.search.placeholder', lang)}
                    className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono"
                    data-testid="hero-search-input"
                  />
                  <Button type="submit" size="sm" className="ml-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-4" data-testid="hero-search-btn">
                    Search <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </form>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <button onClick={() => setShowAsk(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 border border-indigo-500/20 rounded-md hover:bg-indigo-500/5 hover:border-indigo-500/40 transition-colors font-mono" data-testid="ask-data-btn">
                <MessageSquare className="w-3 h-3" /> {t('hero.ask', lang)}
              </button>
              <button onClick={() => navigate('/industries')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 border border-zinc-800 rounded-md hover:bg-zinc-800/50 hover:text-zinc-300 transition-colors font-mono" data-testid="browse-industries-btn">
                {t('hero.browse', lang)}
              </button>
              {['nurse', 'plumber', 'developer', 'accountant'].map(term => (
                <button key={term} onClick={() => navigate(`/search?q=${term}`)} className="px-2.5 py-1 text-[10px] font-mono text-zinc-600 hover:text-zinc-400 border border-zinc-800/60 rounded hover:border-zinc-700 transition-colors">
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-zinc-800/60 bg-zinc-950/50">
        <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Occupations', value: stats?.total_occupations, icon: Database },
            { label: 'Task Statements', value: stats?.total_tasks, icon: Code2 },
            { label: 'Skills Mapped', value: stats?.total_skills, icon: Zap },
            { label: 'Tools & Tech', value: stats?.total_tools, icon: Download },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight text-zinc-100 font-mono">{value?.toLocaleString() || '...'}</div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Featured Goldmine + ROI Calculator */}
      {topGoldmine && (
        <section className="py-16 px-6 bg-gradient-to-b from-zinc-950 to-zinc-900/50">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400 font-semibold">Top Automation Goldmine</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Build a Product in 5 Days</h2>
              <p className="text-zinc-400">Complete implementation guide with working code</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Featured Goldmine Card */}
              <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950/40 to-purple-950/40 rounded-xl p-8 border border-indigo-500/30">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold">
                        #1
                      </span>
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded border border-amber-500/30">
                        {topGoldmine.task.automation_type}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-100 mb-2">
                      {topGoldmine.task.statement}
                    </h3>
                    <p className="text-zinc-400">{topGoldmine.occupation.title}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-400">
                      {Math.round(topGoldmine.task.automation_score * 100)}%
                    </div>
                    <div className="text-xs text-zinc-500">Automatable</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                    <DollarSign className="w-5 h-5 text-green-400 mb-2" />
                    <div className="text-lg font-bold text-zinc-100">
                      {topGoldmine.implementation.business_metrics.arr_potential}
                    </div>
                    <div className="text-xs text-zinc-500">ARR Potential</div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                    <TrendingUp className="w-5 h-5 text-indigo-400 mb-2" />
                    <div className="text-lg font-bold text-zinc-100">
                      {topGoldmine.implementation.business_metrics.potential_users}
                    </div>
                    <div className="text-xs text-zinc-500">Potential Users</div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                    <Zap className="w-5 h-5 text-amber-400 mb-2" />
                    <div className="text-lg font-bold text-zinc-100">
                      {topGoldmine.implementation.build_timeline.mvp}
                    </div>
                    <div className="text-xs text-zinc-500">Build Time</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/goldmines')}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    View Implementation Guide <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-lg transition-all"
                  >
                    Pricing
                  </button>
                </div>
              </div>

              {/* ROI Calculator */}
              <div>
                <ROICalculator />
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Featured Occupations */}
      <section className="py-16 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Featured Occupations</h2>
              <p className="text-sm text-zinc-500 mt-1">Popular datasets for AI automation builders</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/search')} className="text-zinc-500 hover:text-zinc-300 text-sm" data-testid="view-all-btn">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {featured.map(occ => (
              <button
                key={occ.onet_code}
                onClick={() => navigate(`/occupation/${encodeURIComponent(occ.onet_code)}`)}
                className="text-left bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-5 hover:border-zinc-700 transition-all duration-200 group"
                data-testid={`featured-occ-${occ.onet_code}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">{occ.onet_code}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-2 group-hover:text-indigo-300 transition-colors">{occ.title_en}</h3>
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-3">{occ.definition_en?.substring(0, 120)}...</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">{occ.task_count || 0} tasks</span>
                  <span className="font-mono text-[10px] text-indigo-400/60 bg-indigo-500/5 px-1.5 py-0.5 rounded">JSON/CSV</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Value Prop */}
      <section className="py-16 px-6 border-t border-zinc-800/60">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Database, title: 'Real Government Data', desc: '1,016 occupations from O*NET 30.2 with tasks, skills, tools, work context, and education data. Verified, structured, and attribution-compliant.' },
              { icon: Code2, title: 'Machine-Ready Exports', desc: 'Download clean JSON or CSV per occupation. Every file includes schema documentation and mandatory attribution. Ready for LLM fine-tuning or agent workflows.' },
              { icon: Sparkles, title: 'Ask the Data', desc: 'Use natural language to query across all occupations. Find invoice-related tasks across accounting and legal, or compare automation potential across industries.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-6">
                <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-zinc-200 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AskDataDialog open={showAsk} onOpenChange={setShowAsk} />
    </div>
  );
}
