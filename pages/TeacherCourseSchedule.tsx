
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Course, CourseSchedule, Teacher } from '../types';
import { useTranslation } from 'react-i18next';

import UnifiedEditor, { type ScheduleFormState } from '../components/editors/UnifiedEditor';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ONE_OFF_COLOR = '#f59e0b'; // Amber 500 for One-off events

const formatTime = (timeStr: string) => {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

const getCycleWeekIndex = (anchorStr: string, targetDate: Date): number => {
  const anchor = new Date(anchorStr);
  const anchorSunday = new Date(anchor);
  anchorSunday.setDate(anchor.getDate() - anchor.getDay());
  anchorSunday.setHours(0, 0, 0, 0);

  const targetSunday = new Date(targetDate);
  targetSunday.setDate(targetDate.getDate() - targetDate.getDay());
  targetSunday.setHours(0, 0, 0, 0);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diffWeeks = Math.floor((targetSunday.getTime() - anchorSunday.getTime()) / msPerWeek);
  
  if (diffWeeks < 0) return -1;
  return (diffWeeks % 4) + 1;
};

const TeacherCourseSchedule: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const [scheduleType, setScheduleType] = useState<'recurring' | 'one-off'>('recurring');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ScheduleFormState>({
    start_time: '09:00',
    end_time: '10:00',
    is_recurring: true,
    is_fixed: true,
    is_in_person: true,
    price: 0,
    days_of_week: [] as number[],
    cycle_pattern: [1, 2, 3, 4] as number[],
    anchor_date: new Date().toLocaleDateString('en-CA'),
    one_off_dates: [] as string[]
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string | null>(new Date().toLocaleDateString('en-CA'));

  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const profile = await api.getTeacherByUserId(user.id);
      if (!profile) {
        setTeacher(null); setIsLoading(false); return;
      }
      setTeacher(profile);
      const [cData, sData] = await Promise.all([
        api.getCourse(profile.org_id!, courseId),
        api.getCourseSchedules(courseId)
      ]);
      setCourse(cData);
      setSchedules(sData || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const previewSchedules = useMemo(() => {
    if (editingId) return [];
    if (scheduleType === 'one-off') {
      if (selectedDates.length === 0) return [];
      return [{
        id: 'preview', is_recurring: false, is_fixed: formData.is_fixed, is_in_person: formData.is_in_person, one_off_dates: selectedDates, start_time: formData.start_time, end_time: formData.end_time, price: formData.price, isPreview: true
      }];
    } else {
      if (formData.days_of_week.length === 0 || formData.cycle_pattern.length === 0) return [];
      return [{
        id: 'preview', is_recurring: true, is_fixed: formData.is_fixed, is_in_person: formData.is_in_person, days_of_week: formData.days_of_week, cycle_pattern: formData.cycle_pattern, anchor_date: formData.anchor_date, start_time: formData.start_time, end_time: formData.end_time, price: formData.price, isPreview: true
      }];
    }
  }, [scheduleType, selectedDates, formData, editingId]);

  const validateRule = useCallback((newRule: Partial<CourseSchedule>, existingRules: CourseSchedule[]) => {
    if (newRule.start_time! >= newRule.end_time!) return false;
    const isTimeOverlapping = (s1: string, e1: string, s2: string, e2: string) => s1 < e2 && s2 < e1;
    for (const ex of existingRules) {
      if (editingId && ex.id === editingId) continue;
      const checkTimeOverlap = () => isTimeOverlapping(newRule.start_time!, newRule.end_time!, ex.start_time, ex.end_time);
      if (!newRule.is_recurring && !ex.is_recurring) {
        const intersection = newRule.one_off_dates?.filter(d => ex.one_off_dates?.includes(d)) || [];
        if (intersection.length > 0 && checkTimeOverlap()) return true;
      } else if (newRule.is_recurring && ex.is_recurring) {
        const commonDays = newRule.days_of_week?.filter(d => ex.days_of_week?.includes(d)) || [];
        const commonWeeks = newRule.cycle_pattern?.filter(w => ex.cycle_pattern?.includes(w)) || [];
        if (commonDays.length > 0 && commonWeeks.length > 0 && checkTimeOverlap()) return true;
      } else {
        const rec = newRule.is_recurring ? newRule : ex;
        const one = newRule.is_recurring ? ex : newRule;
        for (const dStr of (one.one_off_dates || [])) {
          const d = new Date(dStr);
          if (rec.days_of_week?.includes(d.getDay()) && rec.cycle_pattern?.includes(getCycleWeekIndex(rec.anchor_date!, d)) && checkTimeOverlap()) return true;
        }
      }
    }
    return false;
  }, [editingId]);

  const getProjectionsForMonth = useMemo(() => {
    const year = viewDate.getFullYear(), month = viewDate.getMonth(), projections: Record<string, any[]> = {}, daysInMonth = new Date(year, month + 1, 0).getDate();
    const allRules = [...schedules, ...previewSchedules];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day), dateStr = d.toLocaleDateString('en-CA'), dayOfWeek = d.getDay();
      allRules.forEach((s: any) => {
        let isIncluded = false;
        if (!s.is_recurring && s.one_off_dates?.includes(dateStr)) isIncluded = true;
        else if (s.is_recurring && s.days_of_week?.includes(dayOfWeek)) {
          const cycleWeek = getCycleWeekIndex(s.anchor_date, d);
          if (cycleWeek !== -1 && s.cycle_pattern?.includes(cycleWeek)) isIncluded = true;
        }
        if (isIncluded) {
          if (!projections[dateStr]) projections[dateStr] = [];
          let isOverlapping = false;
          if (s.isPreview) isOverlapping = validateRule({ ...s, one_off_dates: [dateStr] }, schedules);
          projections[dateStr].push({ ...s, isOverlapping });
        }
      });
    }
    return projections;
  }, [schedules, previewSchedules, viewDate, validateRule]);

  const hasOverlap = useMemo(() => {
    if (scheduleType === 'one-off') {
      if (selectedDates.length === 0) return false;
      return validateRule({ ...formData, is_recurring: false, one_off_dates: selectedDates }, schedules);
    } else {
      if (formData.days_of_week.length === 0 || formData.cycle_pattern.length === 0) return false;
      return validateRule({ ...formData, is_recurring: true }, schedules);
    }
  }, [scheduleType, selectedDates, formData, schedules, validateRule]);

  const calendarWeeks = useMemo(() => {
    const year = viewDate.getFullYear(), month = viewDate.getMonth(), firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = Array(7).fill(null), dayPointer = firstDay.getDay();
    for (let i = 1; i <= lastDay.getDate(); i++) {
      currentWeek[dayPointer] = new Date(year, month, i); dayPointer++;
      if (dayPointer === 7 || i === lastDay.getDate()) { weeks.push(currentWeek); currentWeek = Array(7).fill(null); dayPointer = 0; }
    }
    return weeks;
  }, [viewDate]);

  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    setSelectedTimelineDate(dateStr); if (scheduleType !== 'one-off') return;
    setIsDragging(true); setDragStart(dateStr); setDragEnd(dateStr);
  };

  const handleMouseEnter = (dateStr: string) => { if (isDragging && scheduleType === 'one-off') setDragEnd(dateStr); };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragStart && dragEnd && scheduleType === 'one-off') {
        const start = new Date(dragStart), end = new Date(dragEnd), dates: string[] = [];
        const curr = new Date(Math.min(start.getTime(), end.getTime()));
        const last = new Date(Math.max(start.getTime(), end.getTime()));
        while (curr <= last) { dates.push(curr.toLocaleDateString('en-CA')); curr.setDate(curr.getDate() + 1); }
        setSelectedDates(prev => Array.from(new Set([...prev, ...dates])));
      }
      setIsDragging(false); setDragStart(null); setDragEnd(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragStart, dragEnd, scheduleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!courseId || hasOverlap || !teacher) return;
    setIsProcessing(true);
    try {
      const payload = {
        org_id: teacher.org_id!,
        course_id: courseId, start_time: formData.start_time, end_time: formData.end_time, price: formData.price,
        is_recurring: scheduleType === 'recurring', is_fixed: formData.is_fixed, is_in_person: formData.is_in_person,
        days_of_week: scheduleType === 'recurring' ? formData.days_of_week : null,
        cycle_pattern: scheduleType === 'recurring' ? formData.cycle_pattern : null,
        anchor_date: scheduleType === 'recurring' ? formData.anchor_date : null,
        one_off_dates: scheduleType === 'one-off' ? selectedDates : null
      };
      if (editingId) await api.updateCourseSchedule(editingId, payload);
      else await api.createCourseSchedule(payload);
      setEditingId(null); setSelectedDates([]);
      if (scheduleType === 'recurring') setFormData(prev => ({ ...prev, days_of_week: [] }));
      fetchData();
    } catch (err) { alert(t('common.error')); }
    finally { setIsProcessing(false); }
  };

  const handleEdit = (s: CourseSchedule) => {
    setEditingId(s.id); setScheduleType(s.is_recurring ? 'recurring' : 'one-off');
    setFormData({
      start_time: formatTime(s.start_time), end_time: formatTime(s.end_time), price: s.price || 0,
      is_recurring: s.is_recurring, is_fixed: s.is_fixed, is_in_person: s.is_in_person,
      days_of_week: s.days_of_week || [], cycle_pattern: s.cycle_pattern || [1,2,3,4],
      anchor_date: s.anchor_date || new Date().toLocaleDateString('en-CA'),
      one_off_dates: s.one_off_dates || []
    });
    if (!s.is_recurring) setSelectedDates(s.one_off_dates || []);
    else setSelectedDates([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsProcessing(true);
    try { await api.deleteCourseSchedule(deleteConfirmId); setDeleteConfirmId(null); fetchData(); }
    catch (err) { alert(t('common.error')); }
    finally { setIsProcessing(false); }
  };

  const timeToPercent = (timeStr: string) => {
    const parts = timeStr.split(':'), h = Number(parts[0]), m = Number(parts[1]) || 0, totalMinutes = h * 60 + m;
    const startMinutes = 8 * 60, endMinutes = 22 * 60;
    return Math.max(0, Math.min(100, ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100));
  };

  const timelineProjections = useMemo(() => selectedTimelineDate ? getProjectionsForMonth[selectedTimelineDate] || [] : [], [selectedTimelineDate, getProjectionsForMonth]);

  if (!isLoading && !teacher) return <div className="text-center py-20 bg-white border border-slate-200 rounded-[3rem] shadow-sm"><h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('teacher_portal.not_linked_title')}</h2></div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center space-x-4">
         <button onClick={() => navigate('/teacher/courses')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
         <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">{course?.name} <span className="text-indigo-600">{t('course_schedule.title')}</span></h2><p className="text-slate-500 font-medium text-xs">{t('course_schedule.subtitle')}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-8">
           <section className={`bg-white border-2 rounded-[2.5rem] p-6 shadow-sm ${editingId ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-100'}`}>
             <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6"><div className="w-1.5 h-3 rounded-full bg-indigo-600" />{editingId ? t('course_schedule.edit_entry') : t('common.new_rule')}</h3>
             <UnifiedEditor formData={formData} setFormData={setFormData} scheduleType={scheduleType} setScheduleType={setScheduleType} selectedDates={selectedDates} setSelectedDates={setSelectedDates} onSubmit={handleSubmit} isProcessing={isProcessing} editingId={editingId} hasOverlap={hasOverlap} t={t} />
             {editingId && <button type="button" onClick={() => { setEditingId(null); setSelectedDates([]); }} className="mt-4 w-full py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('common.cancel')}</button>}
           </section>

           <section className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">{t('course_schedule.active_rules')}</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                {schedules.map((s) => (
                  <div key={s.id} className={`bg-slate-800/40 border p-3 rounded-xl flex items-center justify-between transition-all ${editingId === s.id ? 'border-indigo-500' : 'border-slate-700/50 hover:border-slate-600'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-white font-mono">{formatTime(s.start_time)}—{formatTime(s.end_time)}</p>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{s.is_recurring ? (s.days_of_week?.map(d => WEEKDAYS[d].slice(0, 3)).join(', ')) : `${s.one_off_dates?.length || 0} dates`}</p>
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

        <div className="lg:col-span-5 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
           <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg></button>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight w-28 text-center">{viewDate.toLocaleString(i18n.language, { month: 'short', year: 'numeric' })}</span>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg></button>
              </div>
           </div>
           <div className="p-6 flex-1 overflow-y-auto no-scrollbar select-none">
              <div className="grid grid-cols-7 gap-2 mb-4">{WEEKDAYS.map(day => <div key={day} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">{day}</div>)}</div>
              <div className="space-y-2">
                 {calendarWeeks.map((week, wIdx) => (
                   <div key={wIdx} className="grid grid-cols-7 gap-2 h-24">
                     {week.map((dateObj, dIdx) => {
                       if (!dateObj) return <div key={dIdx} className="bg-slate-50/20 rounded-2xl" />;
                       const dateStr = dateObj.toLocaleDateString('en-CA'), daySchedules = getProjectionsForMonth[dateStr] || [], isSelected = selectedDates.includes(dateStr), isPreviewed = isDragging && scheduleType === 'one-off' && (()=>{const d=new Date(dateStr).getTime(),s=new Date(dragStart!).getTime(),e=new Date(dragEnd!).getTime();return d>=Math.min(s,e)&&d<=Math.max(s,e);})(), isToday = dateStr === new Date().toLocaleDateString('en-CA'), isViewing = selectedTimelineDate === dateStr;
                       return (
                         <div key={dateStr} onMouseDown={(e) => handleMouseDown(dateStr, e)} onMouseEnter={() => handleMouseEnter(dateStr)} className={`relative p-2 rounded-[1.25rem] border transition-all cursor-pointer ${isViewing ? 'ring-2 ring-indigo-500 border-indigo-500' : (isSelected || isPreviewed) ? 'border-indigo-400 bg-indigo-50/50' : isToday ? 'bg-slate-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                           <span className={`text-[10px] font-black ${isToday ? 'text-indigo-600' : (isSelected || isPreviewed) ? 'text-indigo-700' : 'text-slate-400'}`}>{dateObj.getDate()}</span>
                           <div className="mt-1 space-y-1 overflow-y-auto no-scrollbar max-h-[3rem]">
                             {daySchedules.map((s, idx) => {
                               const baseColor = s.isOverlapping ? '#ef4444' : (!s.is_recurring ? ONE_OFF_COLOR : (course?.color || '#6366f1'));
                               return <div key={idx} className={`px-1 py-0.5 rounded text-[7px] font-black truncate shadow-sm transition-opacity ${s.isPreview ? 'opacity-40 border-dashed' : 'opacity-100'}`} style={{ backgroundColor: !s.is_fixed ? `${baseColor}20` : baseColor, color: !s.is_fixed ? baseColor : '#fff', border: !s.is_fixed ? `1px solid ${baseColor}` : 'none' }}>{formatTime(s.start_time)}</div>;
                             })}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="lg:col-span-3 bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl flex flex-col h-[600px] border border-slate-800">
            <div className="mb-6"><span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{t('course_schedule.inspect_date')}</span><h4 className="text-xl font-black text-white mt-1 uppercase">{selectedTimelineDate || 'N/A'}</h4></div>
            <div className="flex-1 relative overflow-y-auto no-scrollbar bg-[#0f172a] rounded-2xl p-4 border border-slate-800">
              <div className="absolute inset-x-4 top-4 bottom-4 flex flex-col justify-between opacity-10">{Array.from({ length: 15 }, (_, i) => 8 + i).map(hour => <div key={hour} className="w-full border-t border-white h-0" />)}</div>
              <div className="relative h-full mx-auto w-full z-10">
                {timelineProjections.map((s, idx) => { 
                  const top = timeToPercent(s.start_time), bottom = timeToPercent(s.end_time), color = s.isOverlapping ? '#ef4444' : (!s.is_recurring ? ONE_OFF_COLOR : (course?.color || '#6366f1')); 
                  return (
                    <div key={idx} className={`absolute left-0 right-0 rounded-lg border-l-4 shadow-xl flex flex-col p-2 transition-all ${s.isPreview ? 'opacity-40 animate-pulse' : ''}`} style={{ top: `${top}%`, height: `${bottom - top}%`, backgroundColor: !s.is_fixed ? `${color}15` : `${color}30`, borderLeftColor: color, borderWidth: '1px', borderLeftWidth: '4px', borderColor: color, borderStyle: s.isPreview ? 'dashed' : 'solid' }}>
                      <span className="text-[7px] font-black uppercase tracking-tighter truncate" style={{ color: s.isOverlapping ? '#fecaca' : 'rgba(255,255,255,0.4)' }}>{s.isOverlapping ? 'OVERLAP' : (!s.is_recurring ? 'One-off' : 'Recurring')}</span>
                      <span className={`text-[10px] font-mono font-black truncate leading-none ${!s.is_fixed ? 'text-white/70' : 'text-white'}`}>{formatTime(s.start_time)}—{formatTime(s.end_time)}</span>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">{t('teacher_portal.cycle_position')}: {getCycleWeekIndex(s.anchor_date!, new Date(selectedTimelineDate!))}</span>
                      </div>
                    </div>
                  ); 
                })}
              </div>
            </div>
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-sm overflow-hidden p-8 animate-in fade-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-2">{t('course_schedule.delete_title')}</h3>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed">{t('course_schedule.delete_msg')}</p>
            <div className="flex space-x-3"><button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2.5 text-[10px] font-black text-slate-500 bg-slate-50 rounded-xl uppercase tracking-widest">{t('common.cancel')}</button><button onClick={handleDelete} className="flex-1 px-4 py-2.5 text-[10px] font-black text-white rounded-xl bg-red-600 hover:bg-red-700 uppercase tracking-widest shadow-lg transition-all active:scale-95">{t('common.delete')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherCourseSchedule;