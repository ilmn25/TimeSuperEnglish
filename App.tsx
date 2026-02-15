import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { api } from './services/api';
import AdminAttendance from './pages/AdminAttendance';
import AdminCourses from './pages/AdminCourses';
import AdminCourseSchedule from './pages/AdminCourseSchedule';
import AdminStudents from './pages/AdminStudents';
import AdminBookings from './pages/AdminBookings';
import AdminBookingRequests from './pages/AdminBookingRequests';
import AdminPayments from './pages/AdminPayments';
import AdminInvoices from './pages/AdminInvoices';
import AdminInvoiceDetail from './pages/AdminInvoiceDetail';
import AdminInvoiceCreate from './pages/AdminInvoiceCreate';
import AdminExport from './pages/AdminExport';
import AdminBackup from './pages/AdminBackup';
import AdminImport from './pages/AdminImport';
import AdminOrgSelection from './pages/AdminOrgSelection';
import AdminTeachers from './pages/AdminTeachers';
import PortalAttendance from './pages/PortalAttendance';
import PortalBookings from './pages/PortalBookings';
import PortalPayments from './pages/PortalPayments';
import PortalInvoices from './pages/PortalInvoices';
import PortalInvoiceDetail from './pages/PortalInvoiceDetail';
import PortalInvoiceSuccess from './pages/PortalInvoiceSuccess';
import PortalStudents from './pages/PortalStudents';
import PortalCourses from './pages/PortalCourses';
import PortalCourseDetail from './pages/PortalCourseDetail';
import PortalBookingRequests from './pages/PortalBookingRequests';
import TeacherAttendance from './pages/TeacherAttendance';
import TeacherBookings from './pages/TeacherBookings';
import TeacherStudents from './pages/TeacherStudents';
import TeacherCourses from './pages/TeacherCourses';
import TeacherCourseSchedule from './pages/TeacherCourseSchedule';
import ContactUs from './pages/ContactUs';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import CounterAbout from './pages/CounterAbout';
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
          ? "px-3.5 py-1.5 sm:px-4 sm:py-2 text-white bg-indigo-600 shadow-md sm:shadow-lg shadow-indigo-100 ring-1 sm:ring-2 ring-indigo-600 rounded-lg sm:rounded-xl" 
          : "p-2 sm:p-2 text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent rounded-lg sm:rounded-xl"
      }`}
    >
      <span className={`shrink-0 transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { 
          className: `h-4 w-4 sm:h-4.5 w-4.5 stroke-[2.5]` 
        })}
      </span>
      {isActive && (
        <span className="ml-2 sm:ml-2.5 text-[9px] sm:text-[10px] font-black tracking-tight sm:tracking-[0.05em] uppercase whitespace-nowrap animate-in fade-in slide-in-from-left-1 duration-300">
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
        className="appearance-none bg-white border border-slate-200 text-slate-600 text-[10px] sm:text-[11px] font-black uppercase rounded-lg pl-2 pr-5 py-1.5 sm:pl-3 sm:pr-6 sm:py-2 focus:outline-none focus:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm min-w-[50px] sm:min-w-[60px]"
      >
        <option value="en">EN</option>
        <option value="zh-TW">繁</option>
        <option value="zh-CN">简</option>
      </select>
      <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
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
        className="flex items-center p-1 sm:p-1 bg-white border border-slate-200 rounded-lg sm:rounded-xl transition-all hover:border-indigo-200 group"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-4.5 sm:w-4.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="hidden lg:block text-[10px] font-black text-slate-600 px-1.5 truncate max-w-[100px] uppercase tracking-wider">
          {email.split('@')[0]}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-400 transition-transform duration-300 ml-0.5 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-2xl py-1.5 z-[100] animate-in fade-in zoom-in slide-in-from-top-1 duration-200 origin-top-right ring-1 ring-black/5">
          <div className="px-4 py-2 border-b border-slate-50 mb-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('user.signed_in')}</p>
            <p className="text-[12px] font-bold text-slate-900 break-all">{email}</p>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-2.5 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors text-[11px] font-black uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  
  const portalRoutes = ['/portal/attendance', '/portal/bookings', '/portal/payments', '/portal/invoices', '/portal/courses', '/portal/students', '/portal/requests'];
  const teacherRoutes = ['/teacher/attendance', '/teacher/bookings', '/teacher/students', '/teacher/courses'];
  const homeRoutes = ['/', '/about', '/contact'];
  const counterPages = ['/about'];
  
  const isPortalView = portalRoutes.some(route => location.pathname.startsWith(route));
  const isTeacherView = teacherRoutes.some(route => location.pathname.startsWith(route));
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
    if (location.pathname === '/portal/attendance') return t('nav.attendance');
    if (location.pathname === '/portal/bookings') return t('nav.bookings');
    if (location.pathname === '/portal/payments') return t('nav.payments');
    if (location.pathname.startsWith('/portal/invoices/success')) return t('common.success');
    if (location.pathname.startsWith('/portal/invoices')) return t('nav.invoices');
    if (location.pathname.startsWith('/portal/courses')) return t('nav.courses');
    if (location.pathname === '/portal/students') return t('nav.students');
    if (location.pathname === '/portal/requests') return t('bookings.pending_requests');
    
    if (location.pathname === '/teacher/attendance') return t('nav.attendance');
    if (location.pathname === '/teacher/bookings') return t('nav.bookings');
    if (location.pathname === '/teacher/students') return t('nav.students');
    if (location.pathname === '/teacher/courses') return t('nav.courses');
    if (location.pathname.match(/\/teacher\/courses\/[^/]+\/schedule/)) return t('course_schedule.title');

    if (location.pathname === '/about') return t('nav.about');
    if (location.pathname === '/contact') return t('nav.contact');
    if (location.pathname.includes('/attendance')) return t('nav.attendance');
    if (location.pathname.includes('/booking-requests')) return t('bookings.pending_requests');
    if (location.pathname.includes('/bookings')) return t('nav.bookings');
    if (location.pathname.includes('/payments')) return t('nav.payments'); 
    if (location.pathname.match(/\/org\/[^/]+\/invoices\/new/)) return t('invoices.detail_title');
    if (location.pathname.match(/\/org\/[^/]+\/invoices\/[^/]+/)) return t('invoices.detail_title');
    if (location.pathname.includes('/invoices')) return t('nav.invoices');
    if (location.pathname.includes('/export')) return t('nav.export');
    if (location.pathname.includes('/courses')) return t('nav.courses');
    if (location.pathname.includes('/students')) return t('nav.students');
    if (location.pathname.includes('/teachers')) return t('nav.teachers');
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
          {/* Top Row: Branding and Profile */}
          <div className="flex items-center justify-between py-3 sm:py-3 lg:py-4 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              {(!isLandingRoot) && (
                <Link 
                  to="/" 
                  className="p-2 sm:p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-all shrink-0 active:scale-90"
                  title={t('nav.back')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] sm:text-[9px] font-black text-indigo-600 uppercase tracking-widest sm:tracking-[0.2em] opacity-80 leading-none mb-0.5 truncate">
                  {currentOrg ? currentOrg.name : (isCounterPage ? t('app.educational_intelligence') : t('app.name'))}
                </span>
                <h1 className="text-sm sm:text-lg lg:text-xl font-black text-slate-900 tracking-tight truncate max-w-full leading-tight">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
              <LanguageSwitcher />

              {userEmail ? (
                <UserProfile email={userEmail} onLogout={handleLogout} />
              ) : (
                <Link 
                  to="/login"
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-slate-900 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-md shadow-slate-200"
                >
                  {t('auth.signin')}
                </Link>
              )}
            </div>
          </div>
          
          {/* Bottom Row: Navigation Tabs */}
          {(orgId || isPortalView || isTeacherView || isHomeView) && (
            <div className="pb-3 sm:pb-3 lg:pb-4 overflow-hidden relative border-t border-slate-50 pt-2 sm:pt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 overflow-x-auto no-scrollbar mask-linear-right touch-pan-x">
                  <nav className="flex items-center space-x-1.5 sm:space-x-1.5 bg-slate-50/50 p-1.5 rounded-lg sm:rounded-2xl border border-slate-100 min-w-max">
                    {orgId ? (
                      <>
                        <NavLink to={`/org/${orgId}/attendance`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                          {t('nav.attendance')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/bookings`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
                          {t('nav.bookings')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/payments`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>
                          {t('nav.audit')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/invoices`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
                          {t('nav.invoices')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/courses`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
                          {t('nav.courses')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/students`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" /></svg>}>
                          {t('nav.students')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/teachers`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
                          {t('nav.teachers')}
                        </NavLink>
                        <NavLink to={`/org/${orgId}/backup`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                          {t('nav.backup')}
                        </NavLink>
                      </>
                    ) : isPortalView ? (
                      <>
                        <NavLink to="/portal/attendance" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                          {t('nav.attendance')}
                        </NavLink>
                        <NavLink to="/portal/bookings" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
                          {t('nav.bookings')}
                        </NavLink>
                        <NavLink to="/portal/payments" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>
                          {t('nav.audit')}
                        </NavLink>
                        <NavLink to="/portal/invoices" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
                          {t('nav.invoices')}
                        </NavLink>
                        <NavLink to="/portal/courses" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
                          {t('nav.courses')}
                        </NavLink>
                        <NavLink to="/portal/students" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" /></svg>}>
                          {t('nav.students')}
                        </NavLink>
                      </>
                    ) : isTeacherView ? (
                      <>
                        <NavLink to="/teacher/attendance" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                          {t('nav.attendance')}
                        </NavLink>
                        <NavLink to="/teacher/bookings" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
                          {t('nav.bookings')}
                        </NavLink>
                        <NavLink to="/teacher/courses" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
                          {t('nav.courses')}
                        </NavLink>
                        <NavLink to="/teacher/students" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" /></svg>}>
                          {t('nav.students')}
                        </NavLink>
                      </>
                    ) : (
                      <>
                        <NavLink to="/" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}>
                          {t('nav.home')}
                        </NavLink>
                        <NavLink to="/contact" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}>
                          {t('nav.contact')}
                        </NavLink>
                      </>
                    )}
                  </nav>
                </div>

                {isHomeView && (
                  <div className="shrink-0 flex items-center space-x-2">
                    <Link 
                      to="/portal/attendance"
                      className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg sm:rounded-xl text-[9px] font-black uppercase tracking-tight sm:tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
                      title={t('nav.parent_dashboard_access')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                      <span className="hidden xs:inline">Portal</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-8 lg:px-16 xl:px-24 py-4 sm:py-6 lg:py-10">
        {children}
      </main>

      <footer className="max-w-[1700px] w-full mx-auto pt-6 border-t border-slate-100 flex flex-col items-center space-y-3 sm:space-y-4 pb-8 px-4 mt-auto">
        <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
          <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest sm:tracking-[0.4em]">
            &copy; {new Date().getFullYear()} {isCounterPage ? t('app.educational_intelligence') : t('app.academy_management')}
          </p>
          <div className="flex items-center space-x-4 sm:space-x-5">
            <Link to="/teacher/attendance" className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">{t('footer.teacher')}</Link>
            <span className="w-0.5 h-0.5 bg-slate-200 rounded-full" />
            <Link to="/org" className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">{t('footer.admin')}</Link>
          </div>
        </div>
      </footer>
      
      {isImporting && (
        <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[200] bg-white border border-slate-100 rounded-xl shadow-2xl p-3 sm:p-4 w-[calc(100%-1.5rem)] sm:w-64 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start space-x-2.5 sm:space-x-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                <div className="min-w-0">
                    <h4 className="text-[11px] sm:text-xs font-black text-slate-900 truncate">{t('import_page.in_progress_title')}</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                        {t('import_page.warning_refresh')}
                    </p>
                    <div className="mt-2 text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">
                        {importProgress} / {importTotal}
                    </div>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-linear-right {
          mask-image: linear-gradient(to right, black 90%, transparent 100%);
        }
        @media (max-width: 380px) {
          .xs\\:inline { display: none !important; }
        }
      `}</style>
    </div>
  );
};

// Added ImportStatusProvider to wrap the layout and provide import state globally
const ImportStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  const startImport = (total: number) => {
    setIsImporting(true);
    setImportProgress(0);
    setImportTotal(total);
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

// Main App component with defined routes
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/login" element={user ? <Navigate to="/org" replace /> : <AuthPage />} />
            
            {/* Admin Routes */}
            <Route path="/org" element={user ? <AdminOrgSelection /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/attendance" element={user ? <AdminAttendance /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/bookings" element={user ? <AdminBookings /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/booking-requests" element={user ? <AdminBookingRequests /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/payments" element={user ? <AdminPayments /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/invoices" element={user ? <AdminInvoices /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/invoices/new" element={user ? <AdminInvoiceCreate /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/invoices/:invoiceId" element={user ? <AdminInvoiceDetail /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/courses" element={user ? <AdminCourses /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/courses/:courseId/schedule" element={user ? <AdminCourseSchedule /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/students" element={user ? <AdminStudents /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/teachers" element={user ? <AdminTeachers /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/backup" element={user ? <AdminBackup /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/import" element={user ? <AdminImport /> : <Navigate to="/login" replace />} />
            <Route path="/org/:orgId/export" element={user ? <AdminExport /> : <Navigate to="/login" replace />} />

            {/* Portal Routes */}
            <Route path="/portal/attendance" element={user ? <PortalAttendance /> : <Navigate to="/login" replace />} />
            <Route path="/portal/bookings" element={user ? <PortalBookings /> : <Navigate to="/login" replace />} />
            <Route path="/portal/payments" element={user ? <PortalPayments /> : <Navigate to="/login" replace />} />
            <Route path="/portal/invoices" element={user ? <PortalInvoices /> : <Navigate to="/login" replace />} />
            <Route path="/portal/invoices/:invoiceId" element={user ? <PortalInvoiceDetail /> : <Navigate to="/login" replace />} />
            <Route path="/portal/invoices/success" element={user ? <PortalInvoiceSuccess /> : <Navigate to="/login" replace />} />
            <Route path="/portal/students" element={user ? <PortalStudents /> : <Navigate to="/login" replace />} />
            <Route path="/portal/courses" element={user ? <PortalCourses /> : <Navigate to="/login" replace />} />
            <Route path="/portal/courses/:courseId" element={user ? <PortalCourseDetail /> : <Navigate to="/login" replace />} />
            <Route path="/portal/requests" element={user ? <PortalBookingRequests /> : <Navigate to="/login" replace />} />

            {/* Teacher Routes */}
            <Route path="/teacher/attendance" element={user ? <TeacherAttendance /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/bookings" element={user ? <TeacherBookings /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/students" element={user ? <TeacherStudents /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/courses" element={user ? <TeacherCourses /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/courses/:courseId/schedule" element={user ? <TeacherCourseSchedule /> : <Navigate to="/login" replace />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ImportStatusProvider>
  );
};

export default App;