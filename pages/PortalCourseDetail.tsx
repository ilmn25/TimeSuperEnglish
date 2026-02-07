
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, CourseSchedule, Student } from '../types';
import { useTranslation } from 'react-i18next';
import { SUPABASE_ORG_ID } from '../services/supabaseClient';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTime = (timeStr: string) => {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

const PortalCourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [course, setCourse] = useState<(Course & { org_name: string }) | null>(null);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [courseSchedules, setCourseSchedules] = useState<CourseSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // View State
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Request Form State
  const [requestingSlot, setRequestingSlot] = useState<{
    course: Course;
    date: string;
    start: string;
    end: string;
  } | null>(null);
  const [requestFormData, setRequestFormData] = useState({
    student_id: '',
    message: ''
  });
  const [isRequesting, setIsRequesting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const orgId = SUPABASE_ORG_ID;
      const [cData, orgData, students, schedules] = await Promise.all([
        api.getCourse(orgId, courseId),
        api.getOrganization(orgId),
        api.getParentStudents(),
        api.getCourseSchedules(courseId)
      ]);
      
      if (cData) {
        setCourse({ ...cData, org_name: orgData?.name || 'Academy' });
      }
      setMyStudents(students || []);
      setCourseSchedules(schedules || []);
    } catch (err) {
      console.error("Failed to load course details", err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const timeToPercent = (timeStr: string) => {
    const parts = timeStr.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]) || 0;
    const totalMinutes = h * 60 + m;
    const startMinutes = 8 * 60; // Start timeline at 8:00
    const endMinutes = 22 * 60;  // End timeline at 22:00
    const percent = ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  const getProjectionsForMonth = useMemo(() => {
    if (!course) return {};
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
  }, [courseSchedules, viewDate, course]);

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

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingSlot || !requestFormData.student_id) return;
    setIsRequesting(true);
    try {
      await api.createBookingRequest({
        student_id: requestFormData.student_id,
        course_id: requestingSlot.course.id,
        date: requestingSlot.date,
        start_time: requestingSlot.start,
        end_time: requestingSlot.end,
        message: requestFormData.message,
        org_id: SUPABASE_ORG_ID
      });
      alert(t('bookings.request_success'));
      setRequestingSlot(null);
      setRequestFormData({ student_id: '', message: '' });
    } catch (err) {
      alert(t('bookings.request_fail'));
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) return <div className="text-center py-20 font-black text-slate-400 uppercase tracking-widest">Course Not Found</div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex items-center space-x-6">
         <Link to="/portal/courses" className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
         </Link>
         <div 
           className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shrink-0"
           style={{ backgroundColor: course.color, color: getContrastColor(course.color) }}
         >
           {course.name.charAt(0).toUpperCase()}
         </div>
         <div>
           <h3 className="text-2xl font-black text-slate-900 tracking-tight">{course.name}</h3>
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{course.org_name}</p>
         </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3rem] shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[750px]">
          {/* Calendar Side */}
          <div className="flex-1 p-8 md:p-12 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-6">
                  <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg></button>
                  <span className="text-2xl font-black text-slate-900 uppercase tracking-tight w-48 text-center">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                  <button onClick={() => changeMonth(1)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg></button>
                </div>
                <div className="hidden sm:flex items-center space-x-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: course.color }} /><span>Projected Class</span></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-7 gap-4 mb-6">
                  {WEEKDAYS.map(day => <div key={day} className="text-center text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">{day}</div>)}
                </div>
                <div className="space-y-4">
                  {calendarWeeks.map((week, wIdx) => (
                      <div key={wIdx} className="grid grid-cols-7 gap-4">
                        {week.map((dateObj, dIdx) => {
                            if (!dateObj) return <div key={dIdx} className="h-24" />;
                            const dateStr = dateObj.toLocaleDateString('en-CA');
                            const daySchedules = getProjectionsForMonth[dateStr] || [];
                            const isSelected = selectedDate === dateStr;
                            const hasClass = daySchedules.length > 0;

                            return (
                              <button
                                  key={dateStr}
                                  onClick={() => setSelectedDate(dateStr)}
                                  className={`h-28 p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-between group ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200' : hasClass ? 'bg-indigo-50/40 border-indigo-100 hover:border-indigo-300' : 'bg-slate-50/30 border-slate-50 opacity-40 grayscale pointer-events-none'}`}
                              >
                                  <span className={`text-xs font-black self-start ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{dateObj.getDate()}</span>
                                  {hasClass && !isSelected && <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: course.color }} />}
                                  <span className={`text-[9px] font-black uppercase tracking-tighter ${isSelected ? 'text-indigo-50' : 'text-indigo-400'}`}>
                                    {hasClass ? `${daySchedules.length} Sessions` : ''}
                                  </span>
                              </button>
                            );
                        })}
                      </div>
                  ))}
                </div>
            </div>
          </div>

          {/* Details Side - Matches Admin Timeline Aesthetics */}
          <div className="w-full lg:w-[420px] bg-slate-900 border-l border-slate-800 p-8 md:p-10 flex flex-col shrink-0">
            <div className="mb-8">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Inspection</span>
                <h4 className="text-xl font-black text-white mt-1 uppercase tracking-tight">{selectedDate || 'Select a date'}</h4>
            </div>

            <div className="flex-1 relative overflow-y-auto no-scrollbar bg-[#0f172a] rounded-2xl p-6 border border-slate-800 shadow-inner">
                {/* Time Axis Grid Lines */}
                <div className="absolute inset-x-6 top-6 bottom-6 flex flex-col justify-between opacity-10 pointer-events-none">
                  {Array.from({ length: 15 }, (_, i) => 8 + i).map(hour => (
                    <div key={hour} className="w-full border-t border-white h-0" />
                  ))}
                </div>

                <div className="relative h-full mx-auto w-full z-10 min-h-[500px]">
                   {selectedDate && (getProjectionsForMonth[selectedDate] || []).map((s, idx) => {
                     const top = timeToPercent(s.start_time);
                     const bottom = timeToPercent(s.end_time);
                     const color = course.color || '#6366f1';
                     
                     return (
                       <div 
                         key={idx} 
                         className="absolute left-0 right-0 rounded-xl border-l-4 shadow-2xl flex flex-col p-3 group transition-all hover:brightness-110 cursor-pointer"
                         onClick={() => setRequestingSlot({ 
                           course: course, 
                           date: selectedDate, 
                           start: s.start_time, 
                           end: s.end_time 
                         })}
                         style={{ 
                           top: `${top}%`, 
                           height: `${bottom - top}%`,
                           backgroundColor: `${color}20`, 
                           borderLeftColor: color,
                           borderWidth: '1px',
                           borderLeftWidth: '4px',
                           borderColor: `${color}40`
                         }}
                       >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-white/50 uppercase tracking-tighter truncate">{s.date ? 'Special' : 'Routine'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white/40 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          </div>
                          <span className="text-[11px] font-mono font-black text-white truncate leading-none mt-1">{formatTime(s.start_time)}—{formatTime(s.end_time)}</span>
                       </div>
                     );
                   })}

                   {!selectedDate && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-700 opacity-50 space-y-4">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-700">
                          {/* Fix: Added missing closing quote after h-8 w-8 and separated attributes correctly */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center max-w-[150px]">Select a date to view timeline</p>
                      </div>
                   )}
                </div>
            </div>

            <div className="mt-8 flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }} />
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available Slots</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                  Click on any block in the timeline to send a booking request for your child.
                </p>
            </div>
          </div>
      </div>

      {/* Request Booking Modal */}
      {requestingSlot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden animate-in fade-in zoom-in duration-300">
             <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('bookings.request_session')}</h3>
                <div className="flex items-center space-x-2 mt-2">
                   <div className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest">{requestingSlot.course.name}</div>
                   <div className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest">{requestingSlot.date}</div>
                </div>
             </div>

             <form onSubmit={handleSendRequest} className="p-10 space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Student</label>
                   <select 
                     required
                     value={requestFormData.student_id}
                     onChange={e => setRequestFormData({ ...requestFormData, student_id: e.target.value })}
                     className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-slate-900"
                   >
                      <option value="">Choose a child</option>
                      {myStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Proposed Time</label>
                   <div className="flex items-center space-x-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <span className="text-sm font-black font-mono text-indigo-600">{formatTime(requestingSlot.start)} — {formatTime(requestingSlot.end)}</span>
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Optional Message</label>
                   <textarea 
                     value={requestFormData.message}
                     onChange={e => setRequestFormData({ ...requestFormData, message: e.target.value })}
                     placeholder="Any special notes for the academy..."
                     rows={3}
                     className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-medium transition-all resize-none text-slate-900"
                   />
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4">
                   <button type="button" onClick={() => setRequestingSlot(null)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                   <button 
                     type="submit" 
                     disabled={isRequesting || !requestFormData.student_id}
                     className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl text-xs uppercase tracking-widest flex items-center space-x-3 disabled:opacity-50"
                   >
                      {isRequesting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                          <span>{t('common.send')}</span>
                        </>
                      )}
                   </button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default PortalCourseDetail;
