
import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { api } from './services/api';
import AdminAttendance from './pages/AdminAttendance';
import AdminCourses from './pages/AdminCourses';
import AdminCourseSchedule from './pages/AdminCourseSchedule';
import AdminStudents from './pages/AdminStudents';
import AdminBookings from './pages/AdminBookings';
import AdminIssues from './pages/AdminIssues';
import AdminExport from './pages/AdminExport';
import AdminBackup from './pages/AdminBackup';
import AdminImport from './pages/AdminImport';
import AdminOrgSelection from './pages/AdminOrgSelection';
import AdminSubscriptions from './pages/AdminSubscriptions';
import PortalDashboard from './pages/PortalDashboard';
import PortalCourses from './pages/PortalCourses';
import ContactUs from './pages/ContactUs';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import CounterAbout from './pages/CounterAbout';
import CounterPricing from './pages/CounterPricing';
import { useTranslation } from 'react-i18next';
import { Organization } from './types';

// Create a context to manage the global state of the import process.
interface ImportStatusContextType {
  isImporting: boolean;
  importProgress: number;
  importTotal: number;
  startImport: (total: number) => void;
  updateImportProgress: (progress: number) => void;
  finishImport: () => void;
}

const ImportStatusContext = createContext<ImportStatusContextType | undefined>(undefined);

export const useImportStatus = () => {
  const context = useContext(ImportStatusContext);
  if (!context) {
    throw new Error('useImportStatus must be used within an ImportStatusProvider');
  }
  return context;
};

const NavLink: React.FC<{ to: string; icon: React.ReactNode; children: React.ReactNode }> = ({ to, icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`relative flex items-center justify-center transition-all duration-300 group select-none ${
        isActive 
          ? "px-4 py-2 sm:px-5 sm:py-2.5 text-white bg-indigo-600 shadow-md sm:shadow-lg shadow-indigo-100 ring-2 ring-indigo-600 rounded-xl sm:rounded-2xl" 
          : "p-2 sm:p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent rounded-xl sm:rounded-2xl"
      }`}
    >
      <span className={`shrink-0 transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { 
          className: `h-4 w-4 sm:h-5 w-5 stroke-[2.5]` 
        })}
      </span>
      {isActive && (
        <span className="ml-2 sm:ml-3 text-[10px] sm:text-xs font-black tracking-[0.05em] sm:tracking-[0.1em] uppercase whitespace-nowrap animate-in fade-in slide-in-from-left-1 duration-300">
          {children}
        </span>
      )}
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
        className="appearance-none bg-white border-2 border-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-xl pl-2 pr-6 py-1.5 sm:pl-3 sm:pr-8 sm:py-2 focus:outline-none focus:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
      >
        <option value="en">EN</option>
        <option value="zh-CN">简</option>
        <option value="zh-TW">繁</option>
        <option value="ja">JP</option>
        <option value="ko">KR</option>
      </select>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
};

const UserProfile: React.FC<{ email: string; onLogout: () => void }> = ({ email, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 sm:space-x-2 p-1 bg-white border-2 border-slate-100 rounded-xl sm:rounded-2xl transition-all hover:border-indigo-200 hover:shadow-lg group"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="hidden lg:block text-[11px] font-black text-slate-600 px-1 truncate max-w-[120px] uppercase tracking-wider">
          {email.split('@')[0]}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-[2rem] shadow-2xl py-3 z-[100] animate-in fade-in zoom-in slide-in-from-top-2 duration-200 origin-top-right ring-1 ring-black/5">
          <div className="px-6 py-4 border-b border-slate-50 mb-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('user.signed_in')}</p>
            <p className="text-sm font-bold text-slate-900 break-all">{email}</p>
          </div>
          
          <Link 
            to="/subscriptions" 
            className="flex items-center space-x-3 px-6 py-3 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-black uppercase tracking-widest"
            onClick={() => setIsOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>{t('nav.subscriptions')}</span>
          </Link>

          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-6 py-4 text-red-500 hover:bg-red-50 transition-colors text-sm font-black uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{t('user.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode; userEmail?: string }> = ({ children, userEmail }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const { isImporting, importProgress, importTotal } = useImportStatus();
  
  const portalRoutes = ['/dashboard', '/portal/courses'];
  const homeRoutes = ['/', '/about', '/pricing', '/contact'];
  const counterPages = ['/about', '/pricing'];
  
  const isPortalView = portalRoutes.includes(location.pathname);
  const isHomeView = homeRoutes.includes(location.pathname);
  const isCounterPage = counterPages.includes(location.pathname);
  const isLandingRoot = location.pathname === '/';
  
  const match = location.pathname.match(/^\/org\/([^/]+)/);
  const orgId = match ? match[1] : null;

  useEffect(() => {
    if (orgId) {
      api.getOrganization(orgId).then(setCurrentOrg).catch(() => setCurrentOrg(null));
    } else {
      setCurrentOrg(null);
    }
  }, [orgId]);

  const getPageTitle = () => {
    if (isLandingRoot) return t('nav.home');
    if (location.pathname === '/dashboard') return t('parent.dashboard');
    if (location.pathname === '/portal/courses') return t('nav.courses');
    if (location.pathname === '/subscriptions') return t('nav.subscriptions');
    if (location.pathname === '/about') return t('nav.about');
    if (location.pathname === '/pricing') return t('nav.pricing');
    if (location.pathname === '/contact') return t('nav.contact');
    if (location.pathname.includes('/attendance')) return t('nav.attendance');
    if (location.pathname.includes('/bookings')) return t('nav.bookings');
    if (location.pathname.includes('/issues')) return t('nav.issues');
    if (location.pathname.includes('/export')) return t('nav.export');
    if (location.pathname.includes('/courses')) return t('nav.courses');
    if (location.pathname.includes('/students')) return t('nav.students');
    if (location.pathname.includes('/backup')) return t('nav.backup');
    if (location.pathname.includes('/import')) return t('nav.import');
    if (location.pathname === '/org') return t('nav.organizations');
    if (location.pathname === '/login') return t('auth.signin');
    return t('app.name');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white sticky top-0 z-[80] border-b border-slate-100 shadow-sm">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-16 xl:px-24">
          <div className="flex items-center justify-between h-16 sm:h-20 lg:h-24">
            <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
              {(!isLandingRoot) && (
                <Link 
                  to="/" 
                  className="p-2 sm:p-3 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl sm:rounded-2xl border-2 border-transparent hover:border-indigo-100 transition-all shrink-0 active:scale-90"
                  title={t('nav.back')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-80 leading-none mb-1 sm:mb-1.5 truncate">
                  {currentOrg ? currentOrg.name : (isCounterPage ? "Counter" : t('app.name'))}
                </span>
                <h1 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight truncate max-w-[120px] sm:text-nowrap sm:max-w-md">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-4 shrink-0">
              <LanguageSwitcher />

              {userEmail ? (
                <UserProfile email={userEmail} onLogout={handleLogout} />
              ) : (
                <Link 
                  to="/login"
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                  {t('auth.signin')}
                </Link>
              )}
            </div>
          </div>
          
          {(orgId || isPortalView || isHomeView) && (
            <div className="pb-3 sm:pb-6 lg:pb-8 overflow-hidden relative">
              <div className="flex items-center justify-between space-x-4">
                {/* Scrollable Nav Area */}
                <div className="flex-1 overflow-x-auto no-scrollbar mask-linear-right touch-pan-x pb-1 sm:pb-2">
                  <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-50/50 p-1 sm:p-1.5 rounded-2xl sm:rounded-[2rem] border-2 border-slate-100 min-w-max">
                    {orgId ? (
                      <>
                        <NavLink to={`/org/${orgId}/attendance`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                          {t('nav.attendance')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/bookings`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
                          {t('nav.bookings')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/issues`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>
                          {t('nav.issues')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/courses`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
                          {t('nav.courses')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/students`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" /></svg>}>
                          {t('nav.students')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/backup`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                          {t('nav.backup')}
                        </NavLink>
                      </>
                    ) : isPortalView ? (
                      <>
                        <NavLink to="/dashboard" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}>
                          {t('parent.dashboard')}
                        </NavLink>
                        <NavLink to="/portal/courses" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
                          {t('nav.courses')}
                        </NavLink>
                      </>
                    ) : (
                      <>
                        <NavLink to="/" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}>
                          {t('nav.home')}
                        </NavLink>
                        <NavLink to="/contact" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}>
                          {t('nav.contact')}
                        </NavLink>
                      </>
                    )}
                  </nav>
                </div>

                {/* Restore Portal Access Button for Home Views */}
                {isHomeView && (
                  <div className="shrink-0 pl-4">
                    <Link 
                      to="/dashboard"
                      className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
                      <span>{t('parent.dashboard')} Access</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-8 lg:px-16 xl:px-24 py-4 sm:py-8 lg:py-12">
        {children}
      </main>

      {/* Global Footer */}
      <footer className="max-w-[1700px] w-full mx-auto pt-12 border-t border-slate-100 flex flex-col items-center space-y-8 pb-12 px-4 mt-auto">
        <div className="flex flex-col items-center text-center space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
            &copy; {new Date().getFullYear()} {isCounterPage ? "Counter • Educational Intelligence" : "Time Super English • Academy Management"}
          </p>
          <div className="flex items-center space-x-6">
            <Link to="/about" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">About</Link>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <Link to="/pricing" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">Pricing</Link>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <Link to="/org" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
      
      {isImporting && (
        <div className="fixed bottom-6 right-6 z-[200] bg-white border-2 border-slate-100 rounded-2xl shadow-2xl p-5 w-full max-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-start space-x-4">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0 mt-1" />
                <div>
                    <h4 className="text-sm font-black text-slate-900">{t('import_page.in_progress_title')}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                        {t('import_page.warning_refresh')}
                    </p>
                    <div className="mt-4 text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit">
                        {importProgress} / {importTotal} {t('bookings.title')}
                    </div>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-linear-right {
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
        @media (max-width: 480px) {
          .xs\\:inline { display: inline; }
        }
      `}</style>
    </div>
  );
};

const ImportStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  const startImport = (total: number) => {
    setIsImporting(true);
    setImportTotal(total);
    setImportProgress(0);
  };

  const updateImportProgress = (progress: number) => {
    setImportProgress(progress);
  };

  const finishImport = () => {
    setIsImporting(false);
  };

  return (
    <ImportStatusContext.Provider value={{ isImporting, importProgress, importTotal, startImport, updateImportProgress, finishImport }}>
      {children}
    </ImportStatusContext.Provider>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ImportStatusProvider>
      <HashRouter>
        <Layout userEmail={user?.email}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<CounterAbout />} />
            <Route path="/pricing" element={<CounterPricing />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/" />} />
            <Route path="/dashboard" element={user ? <PortalDashboard /> : <Navigate to="/login" />} />
            <Route path="/portal/courses" element={user ? <PortalCourses /> : <Navigate to="/login" />} />
            <Route path="/subscriptions" element={user ? <AdminSubscriptions /> : <Navigate to="/login" />} />
            <Route path="/org" element={user ? <AdminOrgSelection /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/attendance" element={user ? <AdminAttendance /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/bookings" element={user ? <AdminBookings /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/issues" element={user ? <AdminIssues /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/courses" element={user ? <AdminCourses /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/courses/:courseId/schedule" element={user ? <AdminCourseSchedule /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/students" element={user ? <AdminStudents /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/backup" element={user ? <AdminBackup /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/import" element={user ? <AdminImport /> : <Navigate to="/login" />} />
            <Route path="/org/:orgId/export" element={user ? <AdminExport /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ImportStatusProvider>
  );
};

export default App;
