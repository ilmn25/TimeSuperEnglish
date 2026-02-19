
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Student, Booking, Course } from '../types';
import TimelinePanel from '../components/TimelinePanel';
import { useTranslation } from 'react-i18next';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getHKTNow = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));
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

type BookingStatus = 'blue' | 'green' | 'yellow' | 'red';
type SortField = 'date' | 'time' | 'student' | 'course' | 'status';
type SortOrder = 'asc' | 'desc';

interface StudentDetailedData {
  student: Student & { organization_name?: string };
  bookings: Booking[];
  isLoading: boolean;
}

const PortalBookings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date()); 
  const [childrenData, setChildrenData] = useState<StudentDetailedData[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
  const [isLoadingMain, setIsLoadingMain] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Filters & Sorting
  const [filterStudent, setFilterStudent] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Timeline
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [selectedTimelineInfo, setSelectedTimelineInfo] = useState<{ studentId: string; studentName: string; date: string } | null>(null);

  const monthName = viewDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

  const getBookingStatus = useCallback((booking: Booking): BookingStatus => {
    if (booking.check_in) return 'green';
    const hktNow = getHKTNow();
    const bookingDate = new Date(booking.date);
    const [startH, startM] = booking.start.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startH, startM, 0, 0);
    if (startDateTime > hktNow) return 'blue';
    return 'red';
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setIsLoadingMain(true);
    try {
      const [students, requests] = await Promise.all([
        api.getParentStudents(),
        api.getPortalBookingRequests('pending')
      ]);
      setPendingRequestsCount(requests?.length || 0);

      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const startDate = new Date(year, month, 1).toLocaleDateString('en-CA');
      const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');
      
      const detailedStudents: StudentDetailedData[] = students.map((s: any) => ({
        student: s,
        bookings: [],
        isLoading: true
      }));
      setChildrenData(detailedStudents);

      await Promise.all(detailedStudents.map(async (item) => {
        try {
          const bookings = await api.getStudentBookings(item.student.id, { startDate, endDate });
          setChildrenData(prev => prev.map(p => p.student.id === item.student.id ? { ...p, bookings, isLoading: false } : p));
        } catch (err) {
          setChildrenData(prev => prev.map(p => p.student.id === item.student.id ? { ...p, isLoading: false } : p));
        }
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMain(false);
    }
  }, [viewDate]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragStart && dragEnd) {
        if (dragStart === dragEnd) {
          setSelectedDates(prev => prev.includes(dragStart) ? prev.filter(d => d !== dragStart) : [...prev, dragStart]);
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
  }, [isDragging, dragStart, dragEnd]);

  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(dateStr);
    setDragEnd(dateStr);
  };

  const handleMouseEnter = (dateStr: string) => {
    if (isDragging) {
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

  const uniqueCourses = useMemo(() => {
    const coursesMap = new Map<string, Course>();
    childrenData.forEach(c => c.bookings.forEach(b => { if (b.courses) coursesMap.set(b.course_id, b.courses); }));
    return Array.from(coursesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [childrenData]);

  const processedAllBookings = useMemo(() => {
    const all = childrenData.flatMap(c => c.bookings.map(b => ({ ...b, students: c.student, calculatedStatus: getBookingStatus(b) })));
    let result = all.filter(b => {
      const matchesStudent = !filterStudent || b.student_id === filterStudent;
      const matchesCourse = !filterCourse || b.course_id === filterCourse;
      const matchesDate = selectedDates.length === 0 || selectedDates.includes(b.date);
      return matchesStudent && matchesCourse && matchesDate;
    });
    if (filterStatus) result = result.filter(b => b.calculatedStatus === filterStatus);
    
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
  }, [childrenData, filterStudent, filterCourse, selectedDates, filterStatus, sortField, sortOrder, getBookingStatus]);

  const summaryStats = useMemo(() => {
    let totalMinutes = 0;
    let attended = 0, missed = 0, future = 0;
    processedAllBookings.forEach(b => {
      const [sH, sM] = b.start.split(':').map(Number);
      const [eH, eM] = b.end.split(':').map(Number);
      totalMinutes += (eH * 60 + eM) - (sH * 60 + sM);
      if (b.calculatedStatus === 'green' || b.calculatedStatus === 'yellow') attended++;
      else if (b.calculatedStatus === 'red') missed++;
      else if (b.calculatedStatus === 'blue') future++;
    });
    return { totalEntries: processedAllBookings.length, totalTime: `${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m`, attended, missed, future };
  }, [processedAllBookings]);

  const calendarWeeks = useMemo(() => {
    const year = viewDate.getFullYear(), month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = Array(7).fill(null), dayPointer = firstDay.getDay();
    for (let i = 1; i <= lastDay.getDate(); i++) {
      currentWeek[dayPointer] = new Date(year, month, i);
      dayPointer++;
      if (dayPointer === 7 || i === lastDay.getDate()) { weeks.push(currentWeek); currentWeek = Array(7).fill(null); dayPointer = 0; }
    }
    return weeks;
  }, [viewDate]);

  const getDayStatusOverall = (dateStr: string): BookingStatus | null => {
    const dayBookings = childrenData.flatMap(child => child.bookings.filter(b => b.date === dateStr));
    if (dayBookings.length === 0) return null;
    const statuses = dayBookings.map(b => getBookingStatus(b));
    if (statuses.every(s => s === 'blue')) return 'blue';
    const pastStatuses = statuses.filter(s => s !== 'blue');
    if (pastStatuses.length === 0) return 'blue';
    if (pastStatuses.some(s => s === 'red') && pastStatuses.some(s => s === 'green')) return 'yellow';
    if (pastStatuses.some(s => s === 'red')) return 'red';
    return 'green';
  };

  const getStudentDetailedStatusesForDay = (dateStr: string) => {
    const dayBookings = childrenData.flatMap(child => child.bookings.filter(b => b.date === dateStr));
    const studentMap = new Map<string, { name: string; status: BookingStatus }>();
    dayBookings.forEach(b => {
      const student = childrenData.find(c => c.student.id === b.student_id)?.student;
      if (!student) return;
      const current = studentMap.get(student.id);
      const status = getBookingStatus(b);
      if (!current || (status === 'red' && current.status !== 'red')) {
        studentMap.set(student.id, { name: student.name, status });
      }
    });
    return Array.from(studentMap.values());
  };

  const handleSelectWeek = (week: (Date | null)[]) => {
    const validDates = week.filter(d => d !== null).map(d => d!.toLocaleDateString('en-CA'));
    const allSelected = validDates.every(d => selectedDates.includes(d));
    if (allSelected) {
      setSelectedDates(selectedDates.filter(d => !validDates.includes(d)));
    } else {
      setSelectedDates(Array.from(new Set([...selectedDates, ...validDates])));
    }
  };

  const handleSelectMonth = () => {
    const allDates = calendarWeeks.flat().filter(d => d !== null).map(d => d!.toLocaleDateString('en-CA'));
    const alreadySelected = allDates.every(d => selectedDates.includes(d));
    if (alreadySelected) {
      setSelectedDates(selectedDates.filter(d => !allDates.includes(d)));
    } else {
      setSelectedDates(Array.from(new Set([...selectedDates, ...allDates])));
    }
  };

  const clearFilters = () => {
    setSelectedDates([]);
    setFilterStudent('');
    setFilterCourse('');
    setFilterStatus('');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const timelineData = useMemo(() => {
    if (!selectedTimelineInfo) return { bookings: [] };
    const child = childrenData.find(c => c.student.id === selectedTimelineInfo.studentId);
    return { bookings: child?.bookings.filter(b => b.date === selectedTimelineInfo.date) || [] };
  }, [selectedTimelineInfo, childrenData]);

  const statusColors = { blue: 'bg-blue-400', green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

  return (
    <div className={`space-y-6 pb-20 transition-all duration-500 ease-in-out ${(selectedTimelineInfo && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0'}`}>
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('bookings.title')}</h2>
          <p className="text-slate-500 text-xs font-medium">{t('bookings.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/portal/parent/requests')}
            className="relative flex items-center space-x-2 px-6 py-2.5 bg-indigo-50 border-2 border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span>{t('bookings.pending_requests')}</span>
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-md">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <Link 
            to="/portal/parent/courses"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
            {t('bookings.request_session')}
          </Link>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 ${isCalendarMaximized ? 'max-none' : 'max-w-2xl mx-auto'}`}>
          <div className="px-5 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between bg-white gap-y-2">
            <div className="flex items-center space-x-1">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="px-2">
                <span className="text-sm font-black text-slate-800 w-20 text-center uppercase tracking-tighter block">{monthName}</span>
              </div>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button onClick={() => setIsCalendarMaximized(!isCalendarMaximized)} className="p-1 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
              </button>
              <button onClick={handleSelectMonth} className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all">{t('bookings.select_month')}</button>
              <button onClick={clearFilters} className="px-2 py-1 bg-white text-slate-400 border border-slate-100 rounded-lg text-[8px] font-black uppercase tracking-widest hover:text-red-500 hover:bg-red-50 transition-all">{t('bookings.reset')}</button>
            </div>
          </div>

          <div className="px-4 py-3 bg-white select-none">
            <div className="grid grid-cols-[20px_repeat(7,1fr)] gap-1 mb-2">
              <div />
              {WEEKDAYS.map(d => <div key={d} className="text-center text-[7px] font-black text-slate-300 uppercase tracking-widest">{d}</div>)}
            </div>
            <div className="space-y-1">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-[20px_repeat(7,1fr)] gap-1 items-stretch">
                   <button onClick={() => handleSelectWeek(week)} className={`h-6 w-4 mt-0.5 rounded-md flex items-center justify-center transition-all ${week.filter(d => d !== null).every(d => selectedDates.includes(d!.toLocaleDateString('en-CA'))) ? 'text-indigo-600 bg-indigo-50' : 'text-slate-200 hover:text-indigo-400'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                   </button>
                   {week.map((dateObj, dIdx) => {
                     if (!dateObj) return <div key={dIdx} />;
                     const dateStr = dateObj.toLocaleDateString('en-CA');
                     const isSelected = selectedDates.includes(dateStr);
                     const isPreviewed = isDateInDragRange(dateStr);
                     const isToday = dateStr === getHKTNow().toLocaleDateString('en-CA');
                     const dayStatus = getDayStatusOverall(dateStr);
                     const studentStatuses = getStudentDetailedStatusesForDay(dateStr);
                     return (
                       <button 
                         key={dateStr} 
                         onMouseDown={(e) => handleMouseDown(dateStr, e)} 
                         onMouseEnter={() => handleMouseEnter(dateStr)} 
                         className={`rounded-lg transition-all border font-black flex flex-col items-center justify-start p-1 ${isCalendarMaximized ? 'min-h-[7.5rem]' : 'h-8'} ${isSelected || isPreviewed ? 'bg-indigo-600 border-indigo-600 text-white z-10 shadow-lg shadow-indigo-100' : isToday ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                       >
                         <span className={`text-[10px] ${isCalendarMaximized ? 'mb-1 self-start ml-0.5' : ''}`}>{dateObj.getDate()}</span>
                         {isCalendarMaximized ? (
                           <div className="w-full flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar max-h-[5.5rem]">
                             {studentStatuses.map((s, i) => (
                               <div key={i} className={`flex items-center space-x-1.5 min-w-0 rounded px-1 py-0.5 ${isSelected || isPreviewed ? 'bg-white/10' : 'bg-slate-50'}`}>
                                 <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20 ${statusColors[s.status]}`} />
                                 <span className={`text-[9px] font-black truncate leading-none uppercase tracking-tight ${isSelected || isPreviewed ? 'text-indigo-50' : 'text-slate-900'}`}>{s.name}</span>
                               </div>
                             ))}
                           </div>
                         ) : (
                           dayStatus && <div className={`w-0.5 h-0.5 rounded-full mt-0.5 ${statusColors[dayStatus]}`} />
                         )}
                       </button>
                     );
                   })}
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50/40 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1 block">{t('bookings.filter_student')}</label>
              <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"><option value="">{t('bookings.all_students')}</option>{childrenData.map(c => <option key={c.student.id} value={c.student.id}>{c.student.name}</option>)}</select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1 block">{t('bookings.filter_course')}</label>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"><option value="">{t('bookings.all_courses')}</option>{uniqueCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1 block">{t('bookings.filter_status')}</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"><option value="">{t('bookings.all_statuses')}</option><option value="red">{t('status.missed')}</option><option value="green">{t('status.attended')}</option><option value="blue">{t('status.future')}</option></select>
            </div>
          </div>
      </div>

      {/* Filtered Summary Section */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('bookings.summary_title')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between group hover:border-indigo-100 transition-colors">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('bookings.total_entries')}</span>
              <span className="text-2xl font-black text-slate-900 leading-none">{summaryStats.totalEntries}</span>
           </div>
           <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between group hover:border-indigo-100 transition-colors">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('bookings.total_time')}</span>
              <span className="text-2xl font-black text-indigo-600 leading-none">{summaryStats.totalTime}</span>
           </div>
           <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">{t('status.attended')}</span>
              <span className="text-2xl font-black text-green-600 leading-none">{summaryStats.attended}</span>
           </div>
           <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">{t('status.missed')}</span>
              <span className="text-2xl font-black text-red-600 leading-none">{summaryStats.missed}</span>
           </div>
           <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{t('status.future')}</span>
              <span className="text-2xl font-black text-blue-600 leading-none">{summaryStats.future}</span>
           </div>
        </div>
      </div>

      {/* Main Data Grid */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        {isLoadingMain ? (
          <div className="p-24 flex flex-col items-center justify-center space-y-6">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] animate-pulse">{t('bookings.syncing')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[1000px] border-collapse">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('date')}>{t('bookings.date')} {sortField==='date' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('time')}>{t('bookings.time')} {sortField==='time' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('nav.attendance')}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('student')}>{t('bookings.student')} {sortField==='student' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('course')}>{t('bookings.course')} {sortField==='course' && (sortOrder==='asc'?'↑':'↓')}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.teacher')}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('status')}>{t('bookings.status')} {sortField==='status' && (sortOrder==='asc'?'↑':'↓')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedAllBookings.map((b, index) => {
                  const prev = index > 0 ? processedAllBookings[index-1] : null;
                  const getGroupKey = (booking: any) => {
                    switch (sortField) {
                      case 'date': return booking.date;
                      case 'student': return booking.student_id;
                      case 'course': return booking.course_id;
                      default: return booking.id;
                    }
                  };
                  const isNewGroup = !prev || getGroupKey(b) !== getGroupKey(prev);
                  const isInspected = selectedTimelineInfo?.studentId === b.student_id && selectedTimelineInfo?.date === b.date && isTimelineExpanded;
                  
                  return (
                    <tr 
                      key={b.id} 
                      onClick={() => { setSelectedTimelineInfo({ studentId: b.student_id, studentName: b.students?.name || '', date: b.date }); setIsTimelineExpanded(true); }} 
                      className={`group cursor-pointer transition-colors duration-200 ${isInspected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'} ${isNewGroup ? 'border-t-4 border-slate-200' : ''}`}
                    >
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className={`flex flex-col transition-opacity duration-300 ${(sortField==='date' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                          <span className="text-sm font-black text-slate-900 leading-none">{b.date}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{new Date(b.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="text-sm text-indigo-600 font-mono font-black">{b.start.slice(0, 5)} — {b.end.slice(0, 5)}</span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-[10px] font-mono font-bold text-slate-500">
                         {b.check_in ? `${b.check_in.slice(0, 5)} — ${b.check_out ? b.check_out.slice(0, 5) : '--:--'}` : '-'}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className={`text-sm text-slate-900 font-bold group-hover:text-indigo-600 transition-colors duration-300 ${(sortField==='student' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>{b.students?.name}</span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className={`flex items-center space-x-3 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 w-fit transition-opacity duration-300 ${(sortField==='course' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.courses?.color }} />
                          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest truncate max-w-[150px]">{b.courses?.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="text-sm text-slate-800 font-bold">{b.teachers?.name || '-'}</span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${statusColors[b.calculatedStatus]} shadow-sm`} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${
                            b.calculatedStatus === 'red' ? 'text-red-500' : 
                            b.calculatedStatus === 'yellow' ? 'text-yellow-600' :
                            b.calculatedStatus === 'green' ? 'text-emerald-600' : 'text-blue-500'
                          }`}>
                            {t(`status.${{red:'missed',yellow:'partial',green:'attended',blue:'future'}[b.calculatedStatus]}`)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {processedAllBookings.length === 0 && !isLoadingMain && (
                  <tr><td colSpan={7} className="px-8 py-24 text-center text-slate-400 font-bold italic text-base bg-slate-50/50">{t('bookings.no_match')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTimelineInfo && (
        <TimelinePanel 
          studentName={selectedTimelineInfo.studentName} 
          bookings={timelineData.bookings} 
          date={selectedTimelineInfo.date} 
          isExpanded={isTimelineExpanded} 
          onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)} 
        />
      )}
    </div>
  );
};

export default PortalBookings;
