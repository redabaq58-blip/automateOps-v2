import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { authAPI } from '@/lib/api';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import SearchResults from '@/pages/SearchResults';
import OccupationDetail from '@/pages/OccupationDetail';
import IndustryBrowser from '@/pages/IndustryBrowser';
import Marketplace from '@/pages/Marketplace';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import AdminPanel from '@/pages/AdminPanel';
import AutomationHeatmap from '@/pages/AutomationHeatmap';
import AutomationBuilder from '@/pages/AutomationBuilder';
import '@/App.css';

// Auth Context
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aod_token');
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('aod_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('aod_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('aod_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Language Context
const LangContext = createContext(null);
export const useLang = () => useContext(LangContext);

function LangProvider({ children }) {
  const [lang, setLang] = useState('en');
  const toggle = () => setLang(l => l === 'en' ? 'fr' : 'en');
  return (
    <LangContext.Provider value={{ lang, setLang, toggle }}>
      {children}
    </LangContext.Provider>
  );
}

function App() {
  return (
    <AuthProvider>
      <LangProvider>
        <BrowserRouter>
          <Toaster position="top-right" theme="dark" richColors />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/occupation/:code" element={<OccupationDetail />} />
              <Route path="/industries" element={<IndustryBrowser />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/heatmap" element={<AutomationHeatmap />} />
              <Route path="/automation-builder" element={<AutomationBuilder />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/auth" element={<AuthPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LangProvider>
    </AuthProvider>
  );
}

export default App;
