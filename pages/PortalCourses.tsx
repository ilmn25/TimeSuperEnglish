
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course } from '../types';
import { useTranslation } from 'react-i18next';
import { SUPABASE_ORG_ID } from '../services/supabaseClient';

const PortalCourses: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<(Course & { org_name: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const orgId = SUPABASE_ORG_ID;
      const [orgCourses, org] = await Promise.all([
        api.getCourses(orgId),
        api.getOrganization(orgId)
      ]);
      
      const mappedCourses = (orgCourses || []).map((c: Course) => ({
        ...c,
        org_name: org?.name || 'Academy'
      }));

      setCourses(mappedCourses.sort((a: Course, b: Course) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to load portal courses", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.org_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-0.5 sm:space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('courses.title')}</h2>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">{t('courses.explore_classes')}</p>
        </div>
        <div className="relative w-full sm:w-64">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            type="text" 
            placeholder={t('courses.search_classes')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white border border-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCourses.map(course => (
            <Link 
              to={`/portal/parent/courses/${course.id}`}
              key={course.id}
              className="group bg-white border border-slate-100 rounded-xl p-4 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex items-center gap-4"
            >
              <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{course.name}</h3>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{course.org_name}</p>
              </div>
              
              <div className="flex items-center text-slate-400 font-black text-[8px] uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                <span className="hidden sm:inline mr-2">Details</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
          ))}
          {filteredCourses.length === 0 && (
            <div className="py-12 text-center bg-white border border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest italic">{t('bookings.no_match')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortalCourses;
