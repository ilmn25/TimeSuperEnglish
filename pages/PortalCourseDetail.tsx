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
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toLocaleDateString('en-CA'));

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

  if (!course) return <div className="text-center py-20 font-black text-slate-400 uppercase tracking-widest">{t('courses.not_found')}</div>;

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4 sm:space-x-6">
           <Link to="/portal/courses" className="p-3 sm:p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </Link>
           <div 
             className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl font-black shadow-lg shrink-0"
             style={{ backgroundColor: course.color, color: getContrastColor(course.color) }}
           >
             {course.name.charAt(0).toUpperCase()}
           </div>
           <div className="min-w-0">
             <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{course.name}</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest truncate">{course.org_name}</p>
           </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] sm:rounded-[3rem] shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[600px] lg:min-h-[750px]">
          {/* Calendar Side */}
          <div className="flex-1 p-6 sm:p-8 md:p-12 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg></button>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight w-28 text-center">{viewDate.toLocaleString(t('locale'), { month: 'short', year: 'numeric' })}</span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg></button>
              </div>
              <button 
                onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA'))} 
                className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                {t('parent.go_today')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar select-none">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {WEEKDAYS.map(day => <div key={day} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">{day.slice(0,3)}</div>)}
              </div>
              <div className="space-y-2">
                 {calendarWeeks.map((week, wIdx) => (
                   <div key={wIdx} className="grid grid-cols-7 gap-2 h-24">
                     {week.map((dateObj, dIdx) => {
                       if (!dateObj) return <div key={dIdx} className="bg-slate-50/20 rounded-2xl" />;
                       const dateStr = dateObj.toLocaleDateString('en-CA');
                       const daySchedules = getProjectionsForMonth[dateStr] || [];
                       const isSelected = selectedDate === dateStr;
                       const isToday = dateStr === new Date().toLocaleDateString('en-CA');

                       return (
                         <button 
                           key={dateStr} 
                           onClick={() => setSelectedDate(dateStr)}
                           className={`relative p-2 rounded-[1.25rem] border transition-all cursor-pointer ${
                             isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 
                             isToday ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 hover:border-slate-300'
                           }`}
                         >
                           <span className={`text-[10px] font-black ${isToday ? 'text-indigo-600' : isSelected ? 'text-indigo-700' : 'text-slate-400'}`}>{dateObj.getDate()}</span>
                           <div className="mt-1 space-y-1 overflow-y-auto no-scrollbar max-h-[3rem]">
                             {daySchedules.slice(0, 2).map((s, idx) => (
                               <div key={idx} className="px-1 py-0.5 rounded text-[7px] font-black text-white truncate shadow-sm" style={{ backgroundColor: s.date ? '#475569' : (course.color || '#6366f1') }}>
                                 {formatTime(s.start_time)}
                               </div>
                             ))}
                             {daySchedules.length > 2 && <div className="text-[6px] text-center font-black text-slate-300">+{daySchedules.length-2}</div>}
                           </div>
                         </button>
                       );
                     })}
                   </div>
                 ))}
              </div>
            </div>
          </div>

          {/* Schedule Slots Timeline */}
          <div className="lg:w-96 p-6 sm:p-8 md:p-12 bg-slate-900 border-l border-slate-800 rounded-r-[2rem] sm:rounded-r-[3rem] flex flex-col">
            <div className="mb-8">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('course_schedule.available_slots')}</span>
              <h4 className="text-xl font-black text-white mt-1 uppercase">{selectedDate || t('course_schedule.select_date')}</h4>
            </div>
            <div className="flex-1 relative overflow-y-auto no-scrollbar bg-[#0f172a] rounded-2xl p-4 border border-slate-800">
              <div className="absolute inset-x-4 top-4 bottom-4 flex flex-col justify-between opacity-10">
                {Array.from({ length: 15 }, (_, i) => 8 + i).map(hour => (
                  <div key={hour} className="w-full border-t border-white h-0" />
                ))}
              </div>

              <div className="relative h-full mx-auto w-full z-10">
                {selectedDate && (getProjectionsForMonth[selectedDate] || []).map((s, idx) => {
                  const top = timeToPercent(s.start_time);
                  const bottom = timeToPercent(s.end_time);
                  const slotDuration = (new Date(`2000-01-01T${s.end_time}`).getTime() - new Date(`2000-01-01T${s.start_time}`).getTime()) / (1000 * 60);

                  return (
                    <button 
                      key={idx} 
                      onClick={() => setRequestingSlot({ course: course, date: selectedDate, start: s.start_time, end: s.end_time })}
                      className="absolute left-0 right-0 rounded-lg border-l-4 shadow-xl flex flex-col p-2 group transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      style={{ 
                        top: `${top}%`, 
                        height: `${bottom - top}%`,
                        backgroundColor: `${course.color}30`, 
                        borderLeftColor: course.color,
                        borderColor: `${course.color}50`,
                        borderWidth: '1px',
                        borderLeftWidth: '4px',
                      }}
                    >
                        <span className="text-[7px] font-black text-white/40 uppercase tracking-tighter truncate">{t('course_schedule.slot_available')}</span>
                        <span className="text-[10px] font-mono font-black text-white truncate leading-none">{formatTime(s.start_time)}—{formatTime(s.end_time)}</span>
                        <span className="text-[8px] font-bold text-white/60 truncate leading-none mt-1">{slotDuration} {t('common.minutes_short')}</span>
                    </button>
                  );
                })}
                 {!selectedDate && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700 opacity-50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      <p className="text-[9px] font-black uppercase">{t('course_schedule.inspect_date')}</p>
                    </div>
                 )}
              </div>
            </div>
            
            <div className="mt-4 flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: course?.color }} />
                   <span className="text-[8px] font-black text-slate-500 uppercase">{t('course_schedule.regular')}</span>
                </div>
                <div className="flex items-center space-x-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                   <span className="text-[8px] font-black text-slate-500 uppercase">{t('course_schedule.one_off')}</span>
                </div>
            </div>
          </div>
      </div>

      {requestingSlot && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('bookings.request_session')}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                {t('bookings.for')} <span className="text-indigo-600">{requestingSlot.course.name}</span> on <span className="text-indigo-600">{requestingSlot.date}</span> at <span className="text-indigo-600">{formatTime(requestingSlot.start)}</span>
              </p>
            </div>
            
            <form onSubmit={handleSendRequest} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('bookings.select_student')}</label>
                <select 
                  required
                  value={requestFormData.student_id}
                  onChange={(e) => setRequestFormData({ ...requestFormData, student_id: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-slate-900"
                >
                  <option value="">{t('students.select')}</option>
                  {myStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('bookings.optional_message')}</label>
                <textarea 
                  value={requestFormData.message}
                  onChange={(e) => setRequestFormData({ ...requestFormData, message: e.target.value })}
                  rows={4} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-medium transition-all resize-none text-slate-900" 
                  placeholder={t('bookings.message_placeholder')}
                />
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <button type="button" onClick={() => setRequestingSlot(null)} className="px-4 py-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button type="submit" disabled={isRequesting} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center">
                  {isRequesting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  {t('bookings.send_request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Added default export
export default PortalCourseDetail;