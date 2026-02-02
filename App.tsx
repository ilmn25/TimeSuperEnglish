
import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { api } from './services/api';
import AttendancePage from './pages/AttendancePage';
import CoursesPage from './pages/CoursesPage';
import StudentsPage from './pages/StudentsPage';
import BookingsPage from './pages/BookingsPage';
import BackupPage from './pages/BackupPage';
import ImportPage from './pages/ImportPage';
import AuthPage from './pages/AuthPage';
import OrgSelectionPage from './pages/OrgSelectionPage';
import ParentDashboard from './pages/ParentDashboard';
import { useTranslation } from 'react-i18next';
import { Organization } from './types';

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
          className: `h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]` 
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
  
  const isDashboardView = location.pathname === '/dashboard';
  const match = location.pathname.match(/^\/org\/([^/]+)/);
  const orgId = match ? match[1] : null;

  useEffect(() => {
    if (orgId) {
      api.getOrganization(orgId).then(setCurrentOrg).catch(() => setCurrentOrg(null));
    } else {
      setCurrentOrg(null);
    }
  }, [orgId]);

  // Determine the display name for the header
  const getPageTitle = () => {
    if (isDashboardView) return t('parent.dashboard');
    if (location.pathname.includes('/attendance')) return t('nav.attendance');
    if (location.pathname.includes('/bookings')) return t('nav.bookings');
    if (location.pathname.includes('/courses')) return t('nav.courses');
    if (location.pathname.includes('/students')) return t('nav.students');
    if (location.pathname.includes('/backup')) return t('nav.backup');
    if (location.pathname.includes('/import')) return t('nav.import');
    if (location.pathname === '/org') return t('nav.organizations');
    return t('app.name');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white sticky top-0 z-[60] border-b border-slate-100">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-16 xl:px-24">
          <div className="flex items-center justify-between h-16 sm:h-20 lg:h-24">
            {/* Left Section: Branding & Page Title */}
            <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
              {(orgId || location.pathname === '/org') && (
                <Link 
                  to="/dashboard" 
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
                  {currentOrg ? currentOrg.name : t('app.name')}
                </span>
                <h1 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight truncate max-w-[120px] sm:text-nowrap sm:max-w-md">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
            
            {/* Right Section: Global Actions */}
            <div className="flex items-center space-x-1.5 sm:space-x-4 shrink-0">
              {isDashboardView && (
                <Link 
                  to="/org" 
                  className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="hidden xs:inline">{t('nav.organizations')}</span>
                </Link>
              )}
              
              <LanguageSwitcher />

              {userEmail && (
                <UserProfile email={userEmail} onLogout={handleLogout} />
              )}
            </div>
          </div>
          
          {/* Main Control Bar (Only for specific Org) */}
          {orgId && (
            <div className="pb-3 sm:pb-6 lg:pb-8 overflow-hidden relative">
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1 sm:pb-2 mask-linear-right touch-pan-x">
                <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-50/50 p-1 sm:p-1.5 rounded-2xl sm:rounded-[2rem] border-2 border-slate-100 min-w-max">
                  <NavLink to={`/org/${orgId}/attendance`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                    {t('nav.attendance')}
                  </NavLink>
                  <NavLink to={`/org/${orgId}/bookings`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
                    {t('nav.bookings')}
                  </NavLink>
                  <NavLink to={`/org/${orgId}/courses`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
                    {t('nav.courses')}
                  </NavLink>
                  <NavLink to={`/org/${orgId}/students`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" /></svg>}>
                    {t('nav.students')}
                  </NavLink>
                  <NavLink to={`/org/${orgId}/import`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12" /></svg>}>
                    {t('nav.import')}
                  </NavLink>
                  <NavLink to={`/org/${orgId}/backup`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                    {t('nav.backup')}
                  </NavLink>
                </nav>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-8 lg:px-16 xl:px-24 py-4 sm:py-8 lg:py-12">
        {children}
      </main>
      
      {/* Visual edge fade for horizontal nav scroll indicating more content */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-linear-right {
          mask-image: linear-gradient(to right, black 88%, transparent 100%);
        }
        @media (max-width: 480px) {
          .xs\\:inline { display: inline; }
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-[5px] sm:border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initializing System</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Layout userEmail={session?.user?.email}>
        <Routes>
          <Route path="/dashboard" element={<ParentDashboard />} />
          <Route path="/org" element={<OrgSelectionPage />} />
          
          <Route path="/org/:orgId">
            <Route index element={<Navigate to="attendance" replace />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="backup" element={<BackupPage />} />
          </Route>

          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
