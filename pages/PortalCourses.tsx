
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

  const getContrastColor = (hexcolor: string) => {
    if (!hexcolor) return '#ffffff';
    const hex = hexcolor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#ffffff';
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('courses.title')}</h2>
          <p className="text-slate-500 mt-1 font-medium">Explore available classes and send requests to your school.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-white border border-slate-100 rounded-[2.5rem] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredCourses.map(course => (
            <Link 
              to={`/portal/courses/${course.id}`}
              key={course.id}
              className="group relative bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col"
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700"
                style={{ backgroundColor: course.color || '#e2e8f0' }}
              />
              <div className="flex-1">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner mb-6 transition-transform group-hover:rotate-6"
                  style={{ backgroundColor: course.color || '#e2e8f0', color: getContrastColor(course.color) }}
                >
                  {course.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-1">
                  {course.name}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{course.org_name}</p>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-slate-400 font-black text-[9px] uppercase tracking-[0.1em] group-hover:text-indigo-600 transition-colors">
                <span>View Schedule & Create Booking Request</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
          ))}
          {filteredCourses.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
              <p className="text-slate-400 font-bold italic">No matching courses found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortalCourses;
