
import React, { useEffect, useState, createContext, useContext, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ContactUs from './pages/ContactUs';
import PortalPage from './pages/PortalPage';
import "./index.css"
import { useTranslation } from 'react-i18next';

// Create context for tracking global import status
export const ImportStatusContext = createContext<any>(null);

// Custom hook to consume the import status context
export const useImportStatus = () => {
  const context = useContext(ImportStatusContext);
  if (!context) {
    // Return safe defaults if context provider is missing
    return {
      status: { isImporting: false, total: 0, current: 0 },
      startImport: () => {},
      updateImportProgress: () => {},
      finishImport: () => { }
    };
  }
  return context;
};

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`relative flex items-center justify-center transition-all duration-300 group select-none ${
        isActive 
          ? "px-4 py-2 text-white bg-indigo-600 shadow-md shadow-indigo-100 ring-2 ring-indigo-600 rounded-xl" 
          : "p-2 text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent rounded-xl"
      }`}
    >
      <span className={`text-[10px] font-black tracking-[0.05em] uppercase whitespace-nowrap`}>
        {children}
      </span>
    </Link>
  );
};

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  return (
    <div className="relative group">
      <select 
        value={i18n.language} 
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="appearance-none bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase rounded-lg pl-3 pr-6 py-2 focus:outline-none focus:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm min-w-[60px]"
      >
        <option value="en">EN</option>
        <option value="zh-TW">繁</option>
        <option value="zh-CN">简</option>
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const isPortal = location.pathname.startsWith('/portal');

  if (isPortal) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white sticky top-0 z-[80] border-b border-slate-100 shadow-sm">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-16 xl:px-24">
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center space-x-4 min-w-0">
              <Link to="/" className="flex flex-col min-w-0">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] opacity-80 leading-none mb-0.5">
                  Time Super
                </span>
                <h1 className="text-sm sm:text-xl font-black text-slate-900 tracking-tight truncate max-w-full leading-tight">
                  English Academy
                </h1>
              </Link>
            </div>
            
            <nav className="hidden md:flex items-center space-x-2">
              <NavLink to="/">{t('nav.home')}</NavLink>
              <NavLink to="/contact">{t('nav.contact')}</NavLink>
            </nav>
            
            <div className="flex items-center space-x-3 shrink-0">
              <LanguageSwitcher />
              <Link 
                to="/portal/parent"
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-md shadow-slate-200"
              >
                Portal
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-8 lg:px-16 xl:px-24 py-6">
        {children}
      </main>

      <footer className="max-w-[1700px] w-full mx-auto pt-6 border-t border-slate-100 flex flex-col items-center space-y-4 pb-8 px-4 mt-auto">
        <div className="flex flex-col items-center text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
            &copy; {new Date().getFullYear()} Time Super English Academy
          </p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Global state for long-running CSV import operations
  const [importStatus, setImportStatus] = useState({ isImporting: false, total: 0, current: 0 });

  const importValue = useMemo(() => ({
    status: importStatus,
    startImport: (total: number) => setImportStatus({ isImporting: true, total, current: 0 }),
    updateImportProgress: (current: number) => setImportStatus(prev => ({ ...prev, current })),
    finishImport: () => setImportStatus({ isImporting: false, total: 0, current: 0 })
  }), [importStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ImportStatusContext.Provider value={importValue}>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/contact" element={<ContactUs />} />

            <Route path="/portal/parent" element={<PortalPage role="parent" />} />
            <Route path="/portal/teacher" element={<PortalPage role="teacher" />} />
            <Route path="/portal/admin" element={<PortalPage role="admin" />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ImportStatusContext.Provider>
  );
};

export default App;
