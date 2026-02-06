
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Course, CourseSchedule, Student } from '../types';
import { useTranslation } from 'react-i18next';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PortalCourses: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<(Course & { org_name: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Schedule View State
  const [selectedCourse, setSelectedCourse] = useState<(Course & { org_name: string }) | null>(null);
  const [courseSchedules, setCourseSchedules] = useState<CourseSchedule[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const students = await api.getParentStudents();
      const orgIds = Array.from(new Set(students.map((s: any) => s.org_id).filter(Boolean)));
      
      const allCourses: (Course & { org_name: string })[] = [];
      
      await Promise.all(orgIds.map(async (orgId: any) => {
        const orgCourses = await api.getCourses(orgId);
        const org = await api.getOrganization(orgId);
        orgCourses.forEach((c: Course) => {
          allCourses.push({ ...c, org_name: org?.name || 'Unknown School' });
        });
      }));

      setCourses(allCourses.sort((a, b) => a.name.localeCompare(b.name)));
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

  const openSchedule = async (course: Course & { org_name: string }) => {
    setSelectedCourse(course);
    setIsScheduleLoading(true);
    setSelectedDate(null);
    try {
      const schedules = await api.getCourseSchedules(course.id);
      setCourseSchedules(schedules || []);
    } catch (err) {
      console.error("Failed to load schedules", err);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const getProjectionsForMonth = useMemo(() => {
    if (!selectedCourse) return {};
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const projections: Record<string, CourseSchedule[]> = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toLocaleDateString('en-CA');
      const dayOfWeek = d.getDay();

      courseSchedules.forEach(s => {
        if (s.date && s.date === dateStr) {
          if (!projections[dateStr]) projections[dateStr] = [];
          projections[dateStr].push(s);
        }
        if (s.days_of_week && s.days_of_week.includes(dayOfWeek)) {
          const startLimit = s.starts_on ? new Date(s.starts_on) : null;
          if (!startLimit || d >= startLimit) {
            let isIncluded = true;
            if (s.biweekly && startLimit) {
              const diffTime = Math.abs(d.getTime() - startLimit.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const weekNum = Math.floor(diffDays / 7);
              if (weekNum % 2 !== 0) isIncluded = false;
            }
            if (isIncluded) {
              if (!projections[dateStr]) projections[dateStr] = [];
              projections[dateStr].push(s);
            }
          }
        }
      });
    }
    return projections;
  }, [courseSchedules, viewDate, selectedCourse]);

  const calendarWeeks = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = Array(7).fill(null);
    let dayPointer = firstDay.getDay();
    for (let i = 1; i <= lastDay.getDate(); i++) {
      currentWeek[dayPointer] = new Date(year, month, i);
      dayPointer++;
      if (dayPointer === 7 || i === lastDay.getDate()) {
        weeks.push(currentWeek);
        currentWeek = Array(7).fill(null);
        dayPointer = 0;
      }
    }
    return weeks;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
  };

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
          <p className="text-slate-500 mt-1 font-medium">Explore available classes and schedules at your schools.</p>
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
            <div 
              key={course.id}
              onClick={() => openSchedule(course)}
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
              <div className="mt-8 flex items-center text-indigo-600 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                View Schedule <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))}
          {filteredCourses.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
              <p className="text-slate-400 font-bold italic">No matching courses found.</p>
            </div>
          )}
        </div>
      )}

      {/* Schedule Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-10 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl h-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between shrink-0">
               <div className="flex items-center space-x-6">
                 <div 
                   className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-lg"
                   style={{ backgroundColor: selectedCourse.color, color: getContrastColor(selectedCourse.color) }}
                 >
                   {selectedCourse.name.charAt(0).toUpperCase()}
                 </div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCourse.name}</h3>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{selectedCourse.org_name}</p>
                 </div>
               </div>
               <button onClick={() => setSelectedCourse(null)} className="p-4 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
               {/* Calendar Side */}
               <div className="flex-1 p-8 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center space-x-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                        <span className="text-xl font-black text-slate-900 uppercase tracking-tight w-40 text-center">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
                     </div>
                     <div className="flex items-center space-x-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                       <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCourse.color }} /><span>Projected Class</span></div>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar">
                     <div className="grid grid-cols-7 gap-3 mb-4">
                        {WEEKDAYS.map(day => <div key={day} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">{day}</div>)}
                     </div>
                     <div className="space-y-3">
                        {calendarWeeks.map((week, wIdx) => (
                           <div key={wIdx} className="grid grid-cols-7 gap-3">
                              {week.map((dateObj, dIdx) => {
                                 if (!dateObj) return <div key={dIdx} className="h-20" />;
                                 const dateStr = dateObj.toLocaleDateString('en-CA');
                                 const daySchedules = getProjectionsForMonth[dateStr] || [];
                                 const isSelected = selectedDate === dateStr;
                                 const hasClass = daySchedules.length > 0;

                                 return (
                                    <button
                                       key={dateStr}
                                       onClick={() => setSelectedDate(dateStr)}
                                       className={`h-24 p-3 rounded-[1.5rem] border-2 transition-all flex flex-col items-center justify-between group ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : hasClass ? 'bg-indigo-50/30 border-indigo-100 hover:border-indigo-300' : 'bg-white border-slate-50 opacity-40 grayscale pointer-events-none'}`}
                                    >
                                       <span className="text-xs font-black self-start">{dateObj.getDate()}</span>
                                       {hasClass && !isSelected && <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: selectedCourse.color }} />}
                                       <span className={`text-[8px] font-black uppercase tracking-tighter ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                          {hasClass ? `${daySchedules.length} Classes` : ''}
                                       </span>
                                    </button>
                                 );
                              })}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Details Side */}
               <div className="w-full lg:w-96 bg-slate-50 border-l border-slate-100 p-8 flex flex-col shrink-0">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Daily Timeline</h4>
                  <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
                     {selectedDate ? (
                        <>
                           <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Date</p>
                              <p className="text-xl font-black text-slate-900">{selectedDate}</p>
                           </div>
                           <div className="space-y-4">
                              {(getProjectionsForMonth[selectedDate] || []).map((s, idx) => (
                                 <div key={idx} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between shadow-sm group hover:border-indigo-300 transition-all">
                                    <div className="flex flex-col">
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.date ? 'Special Class' : 'Regular Class'}</span>
                                       <span className="text-lg font-mono font-black text-indigo-600 leading-none">{s.start_time.slice(0,5)}—{s.end_time.slice(0,5)}</span>
                                    </div>
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCourse.color }} />
                                 </div>
                              ))}
                           </div>
                        </>
                     ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 shadow-sm">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                           </div>
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-[140px]">Select a highlighted date to see times</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalCourses;
