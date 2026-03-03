'use client';

import React, { createContext, useContext, useState } from 'react';

const LangContext = createContext(null);

export function useLang() {
  return useContext(LangContext);
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en');
  const toggle = () => setLang(l => l === 'en' ? 'fr' : 'en');
  return (
    <LangContext.Provider value={{ lang, setLang, toggle }}>
      {children}
    </LangContext.Provider>
  );
}
