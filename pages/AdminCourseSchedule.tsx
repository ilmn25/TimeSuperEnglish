
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Course, CourseSchedule } from '../types';
import { useTranslation } from 'react-i18next';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const { t } = useTranslation();

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

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);

  // Daily Timeline State
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string | null>(null);

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
      alert('Failed to save open hours.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (schedule: CourseSchedule) => {
    setEditingId(schedule.id);
    setScheduleType(schedule.date ? 'one-off' : 'recurring');
    setFormData({
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove these open hours?')) return;
    try {
      await api.deleteCourseSchedule(id);
      if (editingId === id) cancelEdit();
      fetchData();
    } catch (err) {
      alert('Failed to delete.');
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
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + (m || 0);
    const startMinutes = 8 * 60; // Start timeline at 8:00
    const endMinutes = 22 * 60;  // End timeline at 22:00
    const percent = ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className={`space-y-10 animate-in fade-in duration-500 pb-20 transition-all ${selectedTimelineDate ? 'xl:pr-80' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
           <button onClick={() => navigate(`/org/${orgId}/courses`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">{course?.name} <span className="text-indigo-600">Open Hours</span></h2>
             <p className="text-slate-500 font-medium text-sm">Define and visualize automatic class availability.</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Schedule Builder */}
        <div className="lg:col-span-4 space-y-8">
           <section className={`bg-white border-2 rounded-[2.5rem] p-8 shadow-sm transition-colors ${editingId ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-100'}`}>
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <div className={`w-1.5 h-4 rounded-full ${editingId ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-600'}`} />
                  {editingId ? 'Edit Open Hours' : 'New Open Hours'}
                </h3>
                {editingId && (
                  <button onClick={cancelEdit} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">Cancel Edit</button>
                )}
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                  <button type="button" onClick={() => { if (!editingId) setScheduleType('recurring'); }} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${scheduleType === 'recurring' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${editingId ? 'cursor-not-allowed' : ''}`}>Weekly</button>
                  <button type="button" onClick={() => { if (!editingId) setScheduleType('one-off'); }} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${scheduleType === 'one-off' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${editingId ? 'cursor-not-allowed' : ''}`}>One-off</button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Start Time</label>
                    <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black font-mono text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">End Time</label>
                    <input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black font-mono text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none" />
                  </div>
                </div>

                {scheduleType === 'recurring' ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Repeat Days</label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day, idx) => (
                          <button key={day} type="button" onClick={() => toggleDay(idx)} className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${formData.days_of_week.includes(idx) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-200'}`}>
                            {day.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Starts On</label>
                      <input type="date" value={formData.starts_on} onChange={e => setFormData({...formData, starts_on: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900" />
                    </div>
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="checkbox" checked={formData.biweekly} onChange={e => setFormData({...formData, biweekly: e.target.checked})} className="w-5 h-5 rounded border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Bi-Weekly Repeat</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{editingId ? 'Selected Date' : 'Selected Dates'}</label>
                      {!editingId && selectedDates.length > 0 && (
                        <button type="button" onClick={() => setSelectedDates([])} className="text-[10px] font-bold text-red-500 hover:underline">Clear All</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200 no-scrollbar">
                      {selectedDates.sort().map(d => (
                        <div key={d} className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 shadow-sm">
                          {d}
                          {!editingId && (
                            <button type="button" onClick={() => setSelectedDates(prev => prev.filter(x => x !== d))} className="hover:text-indigo-900 transition-colors">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {selectedDates.length === 0 && <span className="text-[10px] text-slate-400 italic py-2 px-1">Click or drag on the calendar to select dates</span>}
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isProcessing || (scheduleType === 'recurring' && formData.days_of_week.length === 0) || (scheduleType === 'one-off' && selectedDates.length === 0)} 
                  className={`w-full py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 text-xs uppercase tracking-[0.2em] disabled:opacity-50 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'}`}
                >
                   {isProcessing ? 'Processing...' : editingId ? 'Update Open Hours' : 'Add Open Hours'}
                </button>
             </form>
           </section>

           <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 relative z-10">Active Open Hours</h3>
              <div className="space-y-3 relative z-10 max-h-[400px] overflow-y-auto no-scrollbar">
                {schedules.map((s) => (
                  <div key={s.id} className={`bg-slate-800/50 border p-4 rounded-2xl flex items-center justify-between group/item transition-all ${editingId === s.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-700/50 hover:border-indigo-500/50'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[10px] font-mono font-black text-white">{s.start_time.slice(0,5)}—{s.end_time.slice(0,5)}</span>
                        {s.biweekly && <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[8px] font-black uppercase rounded">2w</span>}
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                        {s.date ? s.date : s.days_of_week?.map(d => WEEKDAYS[d]).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(s)} className="p-2 text-slate-400 hover:text-indigo-400 transition-all">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-400 transition-all">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
                {schedules.length === 0 && <p className="text-[10px] text-slate-500 font-bold italic text-center py-6">No hours defined.</p>}
              </div>
           </section>
        </div>

        {/* Right: Visualization Calendar */}
        <div className="lg:col-span-8 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
           <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-lg font-black text-slate-900 uppercase tracking-tight w-32 text-center">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <div className="flex items-center space-x-4">
                 <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course?.color }} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                 </div>
                 <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full border border-indigo-500 border-dashed" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected</span>
                 </div>
              </div>
           </div>

           <div className="p-8 flex-1 overflow-y-auto no-scrollbar select-none">
              <div className="grid grid-cols-7 gap-3 mb-4">
                {WEEKDAYS.map(day => (
                  <div key={day} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{day}</div>
                ))}
              </div>
              <div className="space-y-3">
                 {calendarWeeks.map((week, wIdx) => (
                   <div key={wIdx} className="grid grid-cols-7 gap-3 h-32">
                     {week.map((dateObj, dIdx) => {
                       if (!dateObj) return <div key={`empty-${dIdx}`} className="bg-slate-50/30 rounded-3xl border border-transparent" />;
                       const dateStr = dateObj.toLocaleDateString('en-CA');
                       const daySchedules = getProjectionsForMonth[dateStr] || [];
                       const isToday = dateStr === new Date().toLocaleDateString('en-CA');
                       const isSelected = selectedDates.includes(dateStr);
                       const isPreviewed = isDateInDragRange(dateStr);
                       const isInspecting = selectedTimelineDate === dateStr;

                       return (
                         <div 
                           key={dateStr} 
                           onMouseDown={(e) => handleMouseDown(dateStr, e)}
                           onMouseEnter={() => handleMouseEnter(dateStr)}
                           className={`relative p-3 rounded-[1.75rem] border transition-all cursor-pointer ${
                             isInspecting ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                           } ${
                             isSelected || isPreviewed 
                               ? 'border-indigo-500 bg-indigo-50 shadow-inner scale-[0.98]' 
                               : isToday ? 'bg-slate-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-300'
                           }`}
                         >
                           <div className="flex items-center justify-between mb-2">
                             <span className={`text-xs font-black ${isToday ? 'text-indigo-600' : (isSelected || isPreviewed) ? 'text-indigo-700' : 'text-slate-400'}`}>{dateObj.getDate()}</span>
                             {daySchedules.length > 0 && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: course?.color }} />}
                           </div>
                           <div className="space-y-1 overflow-y-auto no-scrollbar max-h-[4.5rem]">
                             {daySchedules.slice(0, 3).map((s, idx) => (
                               <div key={idx} className="px-2 py-1 rounded-lg text-[8px] font-black text-white shadow-sm flex flex-col" style={{ backgroundColor: course?.color || '#6366f1' }}>
                                 <span className="leading-tight opacity-80 uppercase tracking-tighter truncate">{s.start_time.slice(0,5)}</span>
                               </div>
                             ))}
                             {daySchedules.length > 3 && (
                               <div className="text-[7px] font-black text-slate-400 uppercase text-center">+{daySchedules.length - 3} more</div>
                             )}
                             {(isSelected || isPreviewed) && (
                               <div className="px-2 py-1 rounded-lg text-[8px] font-black text-indigo-500 border border-indigo-300 border-dashed flex flex-col items-center justify-center min-h-[1.5rem]">
                                 <span>{formData.start_time}-{formData.end_time}</span>
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Daily Timeline Sidebar */}
      {selectedTimelineDate && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 text-white shadow-2xl z-50 transform transition-transform animate-in slide-in-from-right duration-500 flex flex-col border-l border-slate-800">
           <div className="p-8 border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Daily Timeline</span>
                 <button onClick={() => setSelectedTimelineDate(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <h4 className="text-2xl font-black tracking-tight">{selectedTimelineDate}</h4>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Open Hours for {course?.name}</p>
           </div>

           <div className="flex-1 overflow-y-auto no-scrollbar bg-[#0f172a] relative p-8">
              {/* Hour Lines */}
              <div className="absolute inset-x-8 top-8 bottom-8 flex flex-col justify-between">
                {Array.from({ length: 15 }, (_, i) => 8 + i).map(hour => (
                  <div key={hour} className="relative h-0">
                    <div className="absolute -top-3 -left-12 text-[10px] font-mono font-black text-slate-600">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="w-full border-t border-slate-800" />
                  </div>
                ))}
              </div>

              {/* Projection Blocks */}
              <div className="relative h-full mx-auto w-full">
                 {timelineProjections.map((s, idx) => {
                   const top = timeToPercent(s.start_time);
                   const bottom = timeToPercent(s.end_time);
                   const height = bottom - top;
                   
                   return (
                     <div 
                       key={idx} 
                       className="absolute left-2 right-2 rounded-xl border-l-4 shadow-2xl transition-all group"
                       style={{ 
                         top: `${top}%`, 
                         height: `${height}%`,
                         backgroundColor: `${course?.color}20`, // 20% opacity
                         borderLeftColor: course?.color,
                         borderTopColor: `${course?.color}40`,
                         borderRightColor: `${course?.color}40`,
                         borderBottomColor: `${course?.color}40`,
                         borderWidth: '1px',
                         borderLeftWidth: '4px'
                       }}
                     >
                       <div className="p-3">
                         <span className="block text-[8px] font-black uppercase tracking-widest text-white/50 mb-1">{course?.name}</span>
                         <span className="block text-xs font-mono font-black text-white">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                       </div>
                     </div>
                   );
                 })}

                 {timelineProjections.length === 0 && (
                   <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No Hours Scheduled</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="p-8 border-t border-slate-800 bg-slate-900 shrink-0">
             <div className="flex items-center space-x-3">
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course?.color }} />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{timelineProjections.length} active slots</span>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourseSchedule;
