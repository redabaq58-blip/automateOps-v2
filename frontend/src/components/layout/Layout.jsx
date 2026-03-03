import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { useLang } from '@/App';
import { Search, Database, FolderTree, User, LogOut, Globe, LayoutDashboard, Package, Shield, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';

function Header() {
  const { user, logout } = useAuth();
  const { lang, toggle } = useLang();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/60" data-testid="main-header">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="logo-link">
            <div className="w-7 h-7 rounded bg-indigo-500 flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-100">automateOps<span className="text-indigo-400 ml-0.5">data</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/search" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-md transition-colors flex items-center gap-1.5" data-testid="nav-search">
              <Search className="w-3.5 h-3.5" /> {t('nav.search', lang)}
            </Link>
            <Link to="/industries" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-md transition-colors flex items-center gap-1.5" data-testid="nav-industries">
              <FolderTree className="w-3.5 h-3.5" /> {t('nav.industries', lang)}
            </Link>
            <Link to="/marketplace" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-md transition-colors flex items-center gap-1.5" data-testid="nav-marketplace">
              <Package className="w-3.5 h-3.5" /> {t('nav.marketplace', lang)}
            </Link>
            <Link to="/heatmap" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-md transition-colors flex items-center gap-1.5" data-testid="nav-heatmap">
              <Flame className="w-3.5 h-3.5" /> Heatmap
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-md transition-colors flex items-center gap-1.5" data-testid="nav-dashboard">
                  <LayoutDashboard className="w-3.5 h-3.5" /> {t('nav.dashboard', lang)}
                </Link>
                <Link to="/admin" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-md transition-colors flex items-center gap-1.5" data-testid="nav-admin">
                  <Shield className="w-3.5 h-3.5" /> {t('nav.admin', lang)}
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="px-2.5 py-1 text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-md hover:border-zinc-700 transition-colors flex items-center gap-1.5" data-testid="lang-toggle">
            <Globe className="w-3 h-3" /> {lang.toUpperCase()}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-mono hidden sm:block">{user.email}</span>
              <button onClick={() => { logout(); navigate('/'); }} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-md transition-colors" data-testid="logout-btn">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-zinc-400 hover:text-zinc-100 text-sm" data-testid="login-btn">
              <User className="w-3.5 h-3.5 mr-1.5" /> Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 mt-auto" data-testid="main-footer">
      <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-500" />
          <span className="text-xs text-zinc-500">automateOps data</span>
        </div>
        <p className="text-[10px] font-mono text-zinc-600 text-center max-w-2xl leading-relaxed">
          Includes O*NET 30.2 data, U.S. Department of Labor/Employment and Training Administration (USDOL/ETA). Licensed under CC BY 4.0.
        </p>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">v1.0</span>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col noise-bg">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
