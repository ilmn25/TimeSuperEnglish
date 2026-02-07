import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Course, CourseSchedule } from '../types';
import { useTranslation } from 'react-i18next';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTime = (timeStr: string) => {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

const getDatesInRange = (startStr: string, endStr: string) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const dates = [];
  const curr = new Date(Math.min(start.getTime(), end.getTime()));
  const last = new Date(Math.max(start.getTime(), end.getTime()));
  
  while (curr <= last) {
    dates.push(curr.toLocaleDateString('en-CA'));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const AdminCourseSchedule: React.FC = () => {
  const { orgId, courseId } = useParams<{ orgId: string, courseId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [course, setCourse] = useState<Course | null>(null);
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  // Form State
  const [scheduleType, setScheduleType] = useState<'recurring' | 'one-off'>('recurring');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    start_time: '09:00',
    end_time: '10:00',
    days_of_week: [] as number[],
    starts_on: new Date().toISOString().split('T')[0],
    biweekly: false
  });

  // Deletion State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);

  // Daily Timeline State (Integrated now)
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string | null>(new Date().toLocaleDateString('en-CA'));

  const fetchData = useCallback(async () => {
    if (!orgId || !courseId) return;
    setIsLoading(true);
    try {
      const [cData, sData] = await Promise.all([
        api.getCourse(orgId, courseId),
        api.getCourseSchedules(courseId)
      ]);
      setCourse(cData);
      setSchedules(sData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Drag event lifecycle
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragStart && dragEnd && scheduleType === 'one-off') {
        if (dragStart === dragEnd) {
          toggleDate(dragStart);
        } else {
          const range = getDatesInRange(dragStart, dragEnd);
          setSelectedDates(prev => Array.from(new Set([...prev, ...range])));
        }
      }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragStart, dragEnd, scheduleType]);

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    setSelectedTimelineDate(dateStr);
    if (scheduleType !== 'one-off') return;
    setIsDragging(true);
    setDragStart(dateStr);
    setDragEnd(dateStr);
  };

  const handleMouseEnter = (dateStr: string) => {
    if (isDragging && scheduleType === 'one-off') {
      setDragEnd(dateStr);
    }
  };

  const isDateInDragRange = (dateStr: string) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const d = new Date(dateStr).getTime();
    const s = new Date(dragStart).getTime();
    const e = new Date(dragEnd).getTime();
    return d >= Math.min(s, e) && d <= Math.max(s, e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setIsProcessing(true);
    try {
      if (editingId) {
        // Handle Update
        await api.updateCourseSchedule(editingId, {
          start_time: formData.start_time,
          end_time: formData.end_time,
          date: scheduleType === 'one-off' ? (selectedDates[0] || null) : null,
          days_of_week: scheduleType === 'recurring' ? formData.days_of_week : null,
          starts_on: scheduleType === 'recurring' ? formData.starts_on : null,
          biweekly: scheduleType === 'recurring' ? formData.biweekly : false
        });
        setEditingId(null);
        setSelectedDates([]);
      } else if (scheduleType === 'one-off') {
        // Batch creation for one-off dates
        for (const date of selectedDates) {
          await api.createCourseSchedule({
            course_id: courseId,
            start_time: formData.start_time,
            end_time: formData.end_time,
            date: date,
            days_of_week: null,
            starts_on: null,
            biweekly: false
          });
        }
        setSelectedDates([]);
      } else {
        // Single recurring creation
        await api.createCourseSchedule({
          course_id: courseId,
          start_time: formData.start_time,
          end_time: formData.end_time,
          date: null,
          days_of_week: formData.days_of_week,
          starts_on: formData.starts_on,
          biweekly: formData.biweekly
        });
        setFormData(prev => ({ ...prev, days_of_week: [] }));
      }
      fetchData();
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (schedule: CourseSchedule, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditingId(schedule.id);
    setScheduleType(schedule.date ? 'one-off' : 'recurring');
    setFormData({
      start_time: formatTime(schedule.start_time),
      end_time: formatTime(schedule.end_time),
      days_of_week: schedule.days_of_week || [],
      starts_on: schedule.starts_on || new Date().toISOString().split('T')[0],
      biweekly: schedule.biweekly
    });
    if (schedule.date) setSelectedDates([schedule.date]);
    else setSelectedDates([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      start_time: '09:00',
      end_time: '10:00',
      days_of_week: [],
      starts_on: new Date().toISOString().split('T')[0],
      biweekly: false
    });
    setSelectedDates([]);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsProcessing(true);
    try {
      await api.deleteCourseSchedule(deleteConfirmId);
      if (editingId === deleteConfirmId) cancelEdit();
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const getProjectionsForMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const projections: Record<string, CourseSchedule[]> = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toLocaleDateString('en-CA');
      const dayOfWeek = d.getDay();

      schedules.forEach(s => {
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
  }, [schedules, viewDate]);

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

  const timelineProjections = useMemo(() => {
    if (!selectedTimelineDate) return [];
    return getProjectionsForMonth[selectedTimelineDate] || [];
  }, [selectedTimelineDate, getProjectionsForMonth]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
           <button onClick={() => navigate(`/org/${orgId}/courses`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div 
             className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-lg"
             style={{ backgroundColor: course?.color || '#e2e8f0', color: getContrastColor(course?.color || '') }}
           >
             {course?.name?.charAt(0).toUpperCase()}
           </div>
           <div>
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">{course?.name} <span className="text-indigo-600">{t('course_schedule.title')}</span></h2>
             <p className="text-slate-500 font-medium text-xs">{t('course_schedule.subtitle')}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left (3 Cols): Schedule Builder */}
        <div className="lg:col-span-3 space-y-8">
           <section className={`bg-white border-2 rounded-[2.5rem] p-6 shadow-sm transition-colors ${editingId ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-100'}`}>
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <div className={`w-1.5 h-3 rounded-full ${editingId ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-600'}`} />
                  {editingId ? t('course_schedule.edit_entry') : t('course_schedule.new_schedule')}
                </h3>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-widest">{t('common.cancel')}</button>
                )}
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button type="button" onClick={() => { if (!editingId) setScheduleType('recurring'); }} className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${scheduleType === 'recurring' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t('course_schedule.routine')}</button>
                  <button type="button" onClick={() => { if (!editingId) setScheduleType('one-off'); }} className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${scheduleType === 'one-off' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t('course_schedule.one_off')}</button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('course_schedule.start_time')}</label>
                    <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('course_schedule.end_time')}</label>
                    <input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none" />
                  </div>
                </div>

                {scheduleType === 'recurring' ? (
                  <div className="space-y-5 pt-2 border-t border-slate-50">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('course_schedule.days')}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAYS.map((day, idx) => (
                          <button key={day} type="button" onClick={() => toggleDay(idx)} className={`w-8 h-8 rounded-lg text-[9px] font-black transition-all ${formData.days_of_week.includes(idx) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>
                            {day.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('course_schedule.starts_on')}</label>
                      <input type="date" value={formData.starts_on} onChange={e => setFormData({...formData, starts_on: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900" />
                    </div>
                    <label className="flex items-center space-x-2.5 cursor-pointer group">
                      <input type="checkbox" checked={formData.biweekly} onChange={e => setFormData({...formData, biweekly: e.target.checked})} className="w-4 h-4 rounded border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('course_schedule.bi_weekly')}</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('course_schedule.selected_dates', { count: selectedDates.length })}</label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 no-scrollbar">
                      {selectedDates.sort().map(d => (
                        <div key={d} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded-md flex items-center gap-1 shadow-sm">
                          {d}
                          {!editingId && <button type="button" onClick={() => setSelectedDates(prev => prev.filter(x => x !== d))} className="hover:text-indigo-900 transition-colors">×</button>}
                        </div>
                      ))}
                      {selectedDates.length === 0 && <span className="text-[9px] text-slate-400 italic">{t('course_schedule.select_on_calendar')}</span>}
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isProcessing || (scheduleType === 'recurring' && formData.days_of_week.length === 0) || (scheduleType === 'one-off' && selectedDates.length === 0)} 
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                   {isProcessing ? t('common.loading') : editingId ? t('common.update') : t('course_schedule.new_schedule')}
                </button>
             </form>
           </section>

           <section className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">{t('course_schedule.active_rules')}</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                {schedules.map((s) => (
                  <div key={s.id} className={`bg-slate-800/40 border p-3 rounded-xl flex items-center justify-between transition-all ${editingId === s.id ? 'border-indigo-500' : 'border-slate-700/50 hover:border-slate-600'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-white font-mono">{formatTime(s.start_time)}—{formatTime(s.end_time)}</p>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">
                        {s.date || s.days_of_week?.map(d => WEEKDAYS[d].slice(0, 3)).join(', ')}
                      </p>
                    </div>
                    <div className="flex space-x-1 shrink-0">
                      <button onClick={() => handleEdit(s)} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => setDeleteConfirmId(s.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                ))}
              </div>
           </section>
        </div>

        {/* Middle (6 Cols): Visualization Calendar */}
        <div className="lg:col-span-6 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
           <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg></button>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight w-28 text-center">{viewDate.toLocaleString(i18n.language, { month: 'short', year: 'numeric' })}</span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg></button>
              </div>
              <div className="flex items-center space-x-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                 <div className="flex items-center space-x-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: course?.color }} /><span>{t('course_schedule.regular')}</span></div>
                 <div className="flex items-center space-x-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-600" /><span>{t('course_schedule.one_off')}</span></div>
              </div>
           </div>

           <div className="p-6 flex-1 overflow-y-auto no-scrollbar select-none">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {WEEKDAYS.map(day => <div key={day} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">{day}</div>)}
              </div>
              <div className="space-y-2">
                 {calendarWeeks.map((week, wIdx) => (
                   <div key={wIdx} className="grid grid-cols-7 gap-2 h-24">
                     {week.map((dateObj, dIdx) => {
                       if (!dateObj) return <div key={dIdx} className="bg-slate-50/20 rounded-2xl" />;
                       const dateStr = dateObj.toLocaleDateString('en-CA');
                       const daySchedules = getProjectionsForMonth[dateStr] || [];
                       const isSelected = selectedDates.includes(dateStr);
                       const isPreviewed = isDateInDragRange(dateStr);
                       const isToday = dateStr === new Date().toLocaleDateString('en-CA');
                       const isViewing = selectedTimelineDate === dateStr;

                       return (
                         <div 
                           key={dateStr} 
                           onMouseDown={(e) => handleMouseDown(dateStr, e)}
                           onMouseEnter={() => handleMouseEnter(dateStr)}
                           className={`relative p-2 rounded-[1.25rem] border transition-all cursor-pointer ${
                             isViewing ? 'ring-2 ring-indigo-500 border-indigo-500' : 
                             (isSelected || isPreviewed) ? 'border-indigo-400 bg-indigo-50/50' : 
                             isToday ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 hover:border-slate-300'
                           }`}
                         >
                           <span className={`text-[10px] font-black ${isToday ? 'text-indigo-600' : (isSelected || isPreviewed) ? 'text-indigo-700' : 'text-slate-400'}`}>{dateObj.getDate()}</span>
                           <div className="mt-1 space-y-1 overflow-y-auto no-scrollbar max-h-[3rem]">
                             {daySchedules.slice(0, 2).map((s, idx) => (
                               <div key={idx} className="px-1 py-0.5 rounded text-[7px] font-black text-white truncate shadow-sm" style={{ backgroundColor: s.date ? '#475569' : (course?.color || '#6366f1') }}>
                                 {formatTime(s.start_time)}
                               </div>
                             ))}
                             {daySchedules.length > 2 && <div className="text-[6px] text-center font-black text-slate-300">+{daySchedules.length-2}</div>}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Right (3 Cols): Integrated Daily Timeline */}
        <div className="lg:col-span-3 bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl flex flex-col h-[600px] border border-slate-800">
            <div className="mb-6">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{t('course_schedule.inspection')}</span>
                <h4 className="text-xl font-black text-white mt-1 uppercase">{selectedTimelineDate || t('course_schedule.select_date')}</h4>
            </div>

            <div className="flex-1 relative overflow-y-auto no-scrollbar bg-[#0f172a] rounded-2xl p-4 border border-slate-800">
                <div className="absolute inset-x-4 top-4 bottom-4 flex flex-col justify-between opacity-10">
                  {Array.from({ length: 15 }, (_, i) => 8 + i).map(hour => (
                    <div key={hour} className="w-full border-t border-white h-0" />
                  ))}
                </div>

                <div className="relative h-full mx-auto w-full z-10">
                   {timelineProjections.map((s, idx) => {
                     const top = timeToPercent(s.start_time);
                     const bottom = timeToPercent(s.end_time);
                     const color = s.date ? '#475569' : (course?.color || '#6366f1');
                     
                     return (
                       <div 
                         key={idx} 
                         className="absolute left-0 right-0 rounded-lg border-l-4 shadow-xl flex flex-col p-2 group"
                         style={{ 
                           top: `${top}%`, 
                           height: `${bottom - top}%`,
                           backgroundColor: `${color}30`, 
                           borderLeftColor: color,
                           borderWidth: '1px',
                           borderLeftWidth: '4px',
                           borderColor: `${color}50`
                         }}
                       >
                          <span className="text-[7px] font-black text-white/40 uppercase tracking-tighter truncate">{s.date ? t('course_schedule.event') : t('course_schedule.routine')}</span>
                          <span className="text-[10px] font-mono font-black text-white truncate leading-none">{formatTime(s.start_time)}—{formatTime(s.end_time)}</span>
                       </div>
                     );
                   })}

                   {!selectedTimelineDate && (
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

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm overflow-hidden p-10 text-center animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
             <h3 className="text-xl font-black text-slate-900 mb-2">{t('course_schedule.delete_title')}</h3>
             <p className="text-slate-500 text-xs mb-8">{t('course_schedule.delete_msg')}</p>
             <div className="flex gap-4">
               <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-3 text-[10px] font-black text-slate-500 bg-slate-50 rounded-xl uppercase">{t('common.cancel')}</button>
               <button onClick={handleDelete} disabled={isProcessing} className="flex-1 px-4 py-3 text-[10px] font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-100 uppercase">
                 {isProcessing ? t('common.loading') : t('common.confirm')}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourseSchedule;