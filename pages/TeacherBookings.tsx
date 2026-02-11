import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Booking, Course, Student, Teacher } from '../types';
import TimelinePanel from '../components/TimelinePanel';
import { useTranslation } from 'react-i18next';

type SortField = 'date' | 'time' | 'student' | 'course' | 'status';
type SortOrder = 'asc' | 'desc';
type BookingStatus = 'blue' | 'green' | 'yellow' | 'red';

const getHKTNow = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));
};

const TeacherBookings: React.FC = () => {
  const { t, i18n } = useTranslation();

  const weekdays = useMemo(() => {
    const base = new Date(2021, 0, 3); // A Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(i18n.language, { weekday: 'short' });
    });
  }, [i18n.language]);
  
  // Data State
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewDate, setViewDate] = useState(new Date()); 
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [filterStudent, setFilterStudent] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);

  // Timeline State
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [selectedTimelineInfo, setSelectedTimelineInfo] = useState<{ studentId: string; studentName: string; date: string } | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    date: new Date().toISOString().split('T')[0],
    start: '09:00',
    end: '10:00'
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const monthName = viewDate.toLocaleString(i18n.language, { month: 'short', year: 'numeric' });

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

  const getBookingStatus = useCallback((booking: Booking): BookingStatus => {
    if (booking.check_in) return 'green';
    const hktNow = getHKTNow();
    const bookingDate = new Date(booking.date);
    const [bStartH, bStartM] = booking.start.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(bStartH, bStartM, 0, 0);
    if (startDateTime > hktNow) return 'blue';
    return 'red';
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profile = await api.getTeacherByUserId(user.id);
      if (!profile) {
        setTeacher(null);
        setIsLoading(false);
        return;
      }
      setTeacher(profile);

      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const startDate = new Date(year, month, 1).toLocaleDateString('en-CA');
      const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

      const [bookingsData, coursesData, studentsData] = await Promise.all([
        api.getAllBookings(profile.org_id!, { teacher_id: profile.id, startDate, endDate }),
        api.getCourses(profile.org_id!),
        api.getStudents(profile.org_id!)
      ]);

      setMonthBookings(bookingsData || []);
      setCourses(coursesData || []);
      setStudents(studentsData || []);
    } catch (err) {
      setError(t('common.error'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [viewDate, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateClick = useCallback((dateStr: string) => {
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) return prev.filter(d => d !== dateStr);
      return [...prev, dateStr];
    });
  }, []);

  // Fix: Added missing changeMonth function
  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
    setSelectedDates([]); 
    setIsTimelineExpanded(false);
    setSelectedTimelineInfo(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragStart && dragEnd) {
        if (dragStart === dragEnd) {
          handleDateClick(dragStart);
        } else {
          const start = new Date(dragStart);
          const end = new Date(dragEnd);
          const dates = [];
          const curr = new Date(Math.min(start.getTime(), end.getTime()));
          const last = new Date(Math.max(start.getTime(), end.getTime()));
          while (curr <= last) {
            dates.push(curr.toLocaleDateString('en-CA'));
            curr.setDate(curr.getDate() + 1);
          }
          setSelectedDates(prev => Array.from(new Set([...prev, ...dates])));
        }
      }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragStart, dragEnd, handleDateClick]);

  const processedBookings = useMemo(() => {
    let result = monthBookings.filter(b => {
      const matchesStudent = !filterStudent || b.student_id === filterStudent;
      const matchesCourse = !filterCourse || b.course_id === filterCourse;
      const matchesDate = selectedDates.length === 0 || selectedDates.includes(b.date);
      return matchesStudent && matchesCourse && matchesDate;
    }).map(b => ({ ...b, calculatedStatus: getBookingStatus(b) }));

    if (filterStatus) {
      result = result.filter(b => b.calculatedStatus === filterStatus);
    }

    return result.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      const timeCompare = a.start.localeCompare(b.start);
      const studentCompare = (a.students?.name || '').localeCompare(b.students?.name || '');
      const courseCompare = (a.courses?.name || '').localeCompare(b.courses?.name || '');
      const statusPriority = { red: 0, yellow: 1, green: 2, blue: 3 };
      const statusCompare = (statusPriority[a.calculatedStatus] || 0) - (statusPriority[b.calculatedStatus] || 0);

      let comparison = 0;
      switch (sortField) {
        case 'date': comparison = dateCompare !== 0 ? dateCompare : timeCompare; break;
        case 'time': comparison = timeCompare !== 0 ? timeCompare : dateCompare; break;
        case 'student': comparison = studentCompare !== 0 ? studentCompare : (dateCompare !== 0 ? dateCompare : timeCompare); break;
        case 'course': comparison = courseCompare !== 0 ? courseCompare : (dateCompare !== 0 ? dateCompare : timeCompare); break;
        case 'status': comparison = statusCompare !== 0 ? statusCompare : (dateCompare !== 0 ? dateCompare : timeCompare); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [monthBookings, filterStudent, filterCourse, selectedDates, filterStatus, sortField, sortOrder, getBookingStatus]);

  const summaryStats = useMemo(() => {
    let totalMinutes = 0;
    let attended = 0, missed = 0, future = 0;
    processedBookings.forEach(b => {
      const [sH, sM] = b.start.split(':').map(Number);
      const [eH, eM] = b.end.split(':').map(Number);
      totalMinutes += (eH * 60 + eM) - (sH * 60 + sM);
      if (b.calculatedStatus === 'green' || b.calculatedStatus === 'yellow') attended++;
      else if (b.calculatedStatus === 'red') missed++;
      else if (b.calculatedStatus === 'blue') future++;
    });
    return { totalEntries: processedBookings.length, totalTime: `${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m`, attended, missed, future };
  }, [processedBookings]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    if (!e.shiftKey) setSelectedDates([]);
    setIsDragging(true);
    setDragStart(dateStr);
    setDragEnd(dateStr);
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
    if (!teacher) return;
    setIsProcessing(true);
    try {
      const payload = { ...formData, teacher_id: teacher.id };
      if (editingBooking) await api.updateBooking(teacher.org_id!, editingBooking.id, payload);
      else await api.createBooking(teacher.org_id!, payload);
      setIsFormOpen(false);
      setEditingBooking(null);
      fetchData();
    } catch (err) { alert(t('common.error')); }
    finally { setIsProcessing(false); }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !teacher) return;
    setIsProcessing(true);
    try {
      await api.deleteBooking(teacher.org_id!, confirmDeleteId);
      setConfirmDeleteId(null);
      fetchData();
    } catch (err) { alert(t('common.error')); }
    finally { setIsProcessing(false); }
  };

  const getDayStatus = (dateStr: string): BookingStatus | null => {
    const dayBookings = monthBookings.filter(b => b.date === dateStr && (!filterStudent || b.student_id === filterStudent) && (!filterCourse || b.course_id === filterCourse));
    if (dayBookings.length === 0) return null;
    const statuses = dayBookings.map(b => getBookingStatus(b));
    if (statuses.every(s => s === 'blue')) return 'blue';
    if (statuses.some(s => s === 'red')) return 'red';
    return 'green';
  };

  const getStudentDetailedStatusesForDay = (dateStr: string) => {
    const dayBookings = monthBookings.filter(b => b.date === dateStr && (!filterStudent || b.student_id === filterStudent) && (!filterCourse || b.course_id === filterCourse));
    const studentMap = new Map<string, { name: string; status: BookingStatus }>();
    dayBookings.forEach(b => {
      const student = b.students as Student;
      if (!student) return;
      const status = getBookingStatus(b);
      const current = studentMap.get(student.id);
      if (!current || (status === 'red' && current.status !== 'red')) {
        studentMap.set(student.id, { name: student.name, status });
      }
    });
    return Array.from(studentMap.values());
  };

  if (!isLoading && !teacher) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-[3rem] shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Teacher Profile Not Linked</h2>
      </div>
    );
  }

  const statusColors = { blue: 'bg-blue-400', green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

  return (
    <div className={`space-y-6 pb-10 transition-all duration-500 ease-in-out ${(selectedTimelineInfo && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Teacher Portal: {t('bookings.title')}</h2>
          <p className="text-slate-500 text-xs font-medium">Monthly schedule overview for <span className="text-indigo-600 font-bold">{teacher?.name}</span></p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
            {t('bookings.new_entry')}
          </button>
        </div>
      </div>

      <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 ${isCalendarMaximized ? 'max-w-none' : 'max-w-3xl mx-auto'}`}>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
           <div className="flex items-center space-x-1">
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="px-2">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter text-center block w-20">{monthName}</span>
              </div>
              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
              </button>
           </div>

           <div className="flex items-center space-x-2">
              <button onClick={() => setIsCalendarMaximized(!isCalendarMaximized)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
              </button>
              <button onClick={() => setSelectedDates(calendarWeeks.flat().filter(d => d !== null).map(d => d!.toLocaleDateString('en-CA')))} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:bg-indigo-50 transition-all">{t('bookings.select_month')}</button>
              <button onClick={() => { setSelectedDates([]); setFilterStudent(''); setFilterCourse(''); setFilterStatus(''); }} className="px-3 py-1.5 bg-white text-slate-400 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-red-500 hover:bg-red-50 transition-all">{t('bookings.reset')}</button>
           </div>
        </div>

        <div className="px-6 py-5 bg-white select-none">
          <div className="mx-auto">
            <div className="grid grid-cols-[24px_repeat(7,1fr)] gap-1 mb-2">
              <div />
              {weekdays.map(day => <div key={day} className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">{day}</div>)}
            </div>
            <div className="space-y-1">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-[24px_repeat(7,1fr)] gap-1 items-stretch">
                   <button onClick={() => { const vd = week.filter(d => d !== null).map(d => d!.toLocaleDateString('en-CA')); setSelectedDates(prev => Array.from(new Set([...prev, ...vd]))); }} className="h-7 w-5 mt-1 rounded-md flex items-center justify-center text-slate-200 hover:text-indigo-400 transition-all"><svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
                   {week.map((dateObj, dIdx) => {
                      if (!dateObj) return <div key={`empty-${dIdx}`} />;
                      const dateStr = dateObj.toLocaleDateString('en-CA');
                      const isSelected = selectedDates.includes(dateStr);
                      const isPreviewed = isDateInDragRange(dateStr);
                      const isToday = dateStr === getHKTNow().toLocaleDateString('en-CA');
                      const dayStatus = getDayStatus(dateStr);
                      const studentStatuses = getStudentDetailedStatusesForDay(dateStr);
                      return (
                        <button
                          key={dateStr}
                          onMouseDown={(e) => handleMouseDown(dateStr, e)}
                          onMouseEnter={() => isDragging && setDragEnd(dateStr)}
                          className={`flex flex-col items-center justify-start p-1.5 rounded-lg transition-all border font-black relative ${isCalendarMaximized ? 'min-h-[7.5rem]' : 'h-10'} ${isSelected || isPreviewed ? 'bg-indigo-600 border-indigo-600 text-white z-10 shadow-lg' : isToday ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                        >
                          <span className={`text-[11px] ${isCalendarMaximized ? 'mb-1 self-start ml-0.5' : ''}`}>{dateObj.getDate()}</span>
                          {isCalendarMaximized ? (
                            <div className="w-full flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar max-h-[5.5rem]">
                              {studentStatuses.map((s, i) => (
                                <div key={i} className="flex items-center space-x-1.5 min-w-0 bg-white/5 rounded px-1 py-0.5">
                                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10 ${statusColors[s.status]}`} />
                                  <span className={`text-[9px] font-black truncate leading-none uppercase tracking-tight ${isSelected || isPreviewed ? 'text-indigo-100' : 'text-slate-50'}`}>{s.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            dayStatus && <div className={`w-1 h-1 rounded-full mt-0.5 ${statusColors[dayStatus]}`} />
                          )}
                        </button>
                      );
                   })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/40 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">{t('bookings.filter_student')}</label>
              <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer"><option value="">{t('bookings.all_students')}</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">{t('bookings.filter_course')}</label>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer"><option value="">{t('bookings.all_courses')}</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">{t('bookings.filter_status')}</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer"><option value="">{t('bookings.all_statuses')}</option><option value="red">{t('status.missed')}</option><option value="green">{t('status.attended')}</option><option value="blue">{t('status.future')}</option></select>
            </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">{t('bookings.summary_title')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('bookings.total_entries')}</span><span className="text-2xl font-black text-slate-900">{summaryStats.totalEntries}</span></div>
           <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('bookings.total_time')}</span><span className="text-2xl font-black text-indigo-600">{summaryStats.totalTime}</span></div>
           <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl flex flex-col justify-between"><span className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">{t('status.attended')}</span><span className="text-2xl font-black text-green-600">{summaryStats.attended}</span></div>
           <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex flex-col justify-between"><span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">{t('status.missed')}</span><span className="text-2xl font-black text-red-600">{summaryStats.missed}</span></div>
           <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{t('status.future')}</span><span className="text-2xl font-black text-blue-600">{summaryStats.future}</span></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-20 flex justify-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th onClick={() => toggleSort('date')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white">{t('bookings.date')} {sortField==='date' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th onClick={() => toggleSort('time')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white">{t('bookings.time')} {sortField==='time' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th onClick={() => toggleSort('student')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white">{t('bookings.student')} {sortField==='student' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th onClick={() => toggleSort('course')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white">{t('bookings.course')} {sortField==='course' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th onClick={() => toggleSort('status')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white">{t('bookings.status')} {sortField==='status' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('bookings.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedBookings.map(b => (
                  <tr key={b.id} onClick={() => { setSelectedTimelineInfo({ studentId: b.student_id, studentName: b.students?.name || '', date: b.date }); setIsTimelineExpanded(true); }} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-5 whitespace-nowrap"><span className="text-xs font-black text-slate-900">{b.date}</span></td>
                    <td className="px-6 py-5 whitespace-nowrap"><span className="text-xs text-indigo-600 font-mono font-black">{b.start.slice(0, 5)} — {b.end.slice(0, 5)}</span></td>
                    <td className="px-6 py-5 whitespace-nowrap"><span className="text-xs text-slate-900 font-bold group-hover:text-indigo-600 transition-colors">{b.students?.name}</span></td>
                    <td className="px-6 py-5 whitespace-nowrap"><div className="flex items-center space-x-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 w-fit"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.courses?.color }} /><span className="text-[9px] text-slate-600 font-black uppercase tracking-tight">{b.courses?.name}</span></div></td>
                    <td className="px-6 py-5 whitespace-nowrap"><div className="flex items-center space-x-2"><div className={`w-2 h-2 rounded-full ${statusColors[b.calculatedStatus]}`} /><span className={`text-[10px] font-black uppercase tracking-widest ${b.calculatedStatus==='red'?'text-red-500':b.calculatedStatus==='green'?'text-green-600':'text-blue-500'}`}>{t(`status.${{red:'missed',yellow:'partial',green:'attended',blue:'future'}[b.calculatedStatus]}`)}</span></div></td>
                    <td className="px-6 py-5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                       <button onClick={() => { setEditingBooking(b); setFormData({ student_id: b.student_id, course_id: b.course_id, date: b.date, start: b.start.slice(0,5), end: b.end.slice(0,5) }); setIsFormOpen(true); }} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all rounded-lg hover:bg-indigo-50"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                       <button onClick={() => setConfirmDeleteId(b.id)} className="p-1.5 text-slate-300 hover:text-red-600 transition-all rounded-lg hover:bg-red-50"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-lg overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 tracking-tight">{editingBooking ? t('bookings.edit') : t('bookings.new')}</h3></div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.student')}</label><select required value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold"><option value="">{t('students.select')}</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.course')}</label><select required value={formData.course_id} onChange={e => setFormData({ ...formData, course_id: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold"><option value="">{t('students.select')}</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.date')}</label><input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.start')}</label><input type="time" required value={formData.start} onChange={e => setFormData({ ...formData, start: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-black font-mono" /></div>
                <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.end')}</label><input type="time" required value={formData.end} onChange={e => setFormData({ ...formData, end: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-black font-mono" /></div>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4"><button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.cancel')}</button><button type="submit" disabled={isProcessing} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg text-[10px] uppercase tracking-widest flex items-center">{isProcessing && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}{editingBooking ? t('common.save') : t('common.create')}</button></div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm overflow-hidden p-8 animate-in zoom-in duration-300 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-2">{t('bookings.delete_title')}</h3>
            <p className="text-slate-500 text-xs mb-6">{t('bookings.delete_msg')}</p>
            <div className="flex space-x-3"><button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2.5 text-[10px] font-black text-slate-500 bg-slate-50 rounded-xl uppercase">{t('common.cancel')}</button><button onClick={handleDelete} disabled={isProcessing} className="flex-1 px-4 py-2.5 text-[10px] font-black text-white rounded-xl bg-red-600 flex items-center justify-center uppercase shadow-lg">{isProcessing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('common.delete')}</button></div>
          </div>
        </div>
      )}
      
      {selectedTimelineInfo && (
        <TimelinePanel studentName={selectedTimelineInfo.studentName} bookings={monthBookings.filter(b => b.student_id === selectedTimelineInfo.studentId && b.date === selectedTimelineInfo.date)} date={selectedTimelineInfo.date} isExpanded={isTimelineExpanded} onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)} />
      )}
    </div>
  );
};

export default TeacherBookings;