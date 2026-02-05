import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { Student, Booking, Course } from '../types';
import TimelinePanel from '../components/TimelinePanel';
import { useTranslation } from 'react-i18next';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

const getHKTNow = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));
};

const getHKTDateString = (baseDate: Date = new Date()) => {
  return baseDate.toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" }); 
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

const ParentDashboard: React.FC = () => {
  const hktToday = getHKTDateString();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'attendance' | 'bookings'>('attendance');
  const [viewDate, setViewDate] = useState(new Date()); 
  const [childrenData, setChildrenData] = useState<StudentDetailedData[]>([]);
  const [isLoadingMain, setIsLoadingMain] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<string>(hktToday);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);

  // Filters
  const [filterStudent, setFilterStudent] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Modals & Panels
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [selectedTimelineInfo, setSelectedTimelineInfo] = useState<{ studentId: string; studentName: string; date: string } | null>(null);
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);

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
    setError(null);
    try {
      const students = await api.getParentStudents();
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
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setIsLoadingMain(false);
    }
  }, [viewDate]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleDateClick = useCallback((dateStr: string) => {
    if (activeTab === 'attendance') {
      setSelectedDate(dateStr);
    } else {
      setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragStart && dragEnd) {
        if (dragStart === dragEnd) {
          handleDateClick(dragStart);
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
  }, [isDragging, dragStart, dragEnd, handleDateClick]);

  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    if (activeTab === 'attendance') {
      handleDateClick(dateStr);
      return;
    }
    if (!e.shiftKey) setSelectedDates([]);
    setIsDragging(true);
    setDragStart(dateStr);
    setDragEnd(dateStr);
  };

  const handleMouseEnter = (dateStr: string) => {
    if (isDragging) setDragEnd(dateStr);
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
    childrenData.forEach(c => c.bookings.forEach(b => {
      if (b.courses) coursesMap.set(b.course_id, b.courses);
    }));
    return Array.from(coursesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [childrenData]);

  const processedAllBookings = useMemo(() => {
    const all = childrenData.flatMap(c => c.bookings.map(b => ({ 
      ...b, 
      students: c.student,
      calculatedStatus: getBookingStatus(b) 
    })));
    let result = all.filter(b => {
      const matchesStudent = !filterStudent || b.student_id === filterStudent;
      const matchesCourse = !filterCourse || b.course_id === filterCourse;
      const matchesDate = activeTab === 'attendance' ? b.date === selectedDate : (selectedDates.length === 0 || selectedDates.includes(b.date));
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
        case 'date': comparison = dateCompare || timeCompare; break;
        case 'time': comparison = timeCompare || dateCompare; break;
        case 'student': comparison = studentCompare || dateCompare || timeCompare; break;
        case 'course': comparison = courseCompare || dateCompare || timeCompare; break;
        case 'status': comparison = statusCompare || dateCompare || timeCompare; break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [childrenData, filterStudent, filterCourse, selectedDates, selectedDate, filterStatus, sortField, sortOrder, getBookingStatus, activeTab]);

  const summaryStats = useMemo(() => {
    let totalMinutes = 0;
    let attendedCount = 0;
    let missedCount = 0;
    let futureCount = 0;
    processedAllBookings.forEach(b => {
      const [sH, sM] = b.start.split(':').map(Number);
      const [eH, eM] = b.end.split(':').map(Number);
      totalMinutes += (eH * 60 + eM) - (sH * 60 + sM);
      if (b.calculatedStatus === 'green' || b.calculatedStatus === 'yellow') attendedCount++;
      else if (b.calculatedStatus === 'red') missedCount++;
      else if (b.calculatedStatus === 'blue') futureCount++;
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return {
      totalEntries: processedAllBookings.length,
      totalTime: `${hours}h ${mins}m`,
      attended: attendedCount,
      missed: missedCount,
      future: futureCount
    };
  }, [processedAllBookings]);

  const attendanceDayStats = useMemo(() => {
    const dayBookings = childrenData.flatMap(child => child.bookings.filter(b => b.date === selectedDate));
    const studentIds = new Set(dayBookings.map(b => b.student_id));
    const arrivedCount = dayBookings.filter(b => b.check_in && !b.check_out).length;
    return {
      totalBooked: studentIds.size,
      currentlyHere: arrivedCount
    };
  }, [childrenData, selectedDate]);

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

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingStudent(true);
    try {
      await api.updateStudent(editingStudent.org_id!, editingStudent.id, editingStudent.name, editingStudent.contact, editingStudent.level);
      setEditingStudent(null);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update student profile.");
    } finally {
      setIsSavingStudent(false);
    }
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

  // Mapping from internal color identifier to i18n translation key
  const getTranslatedStatus = (status: BookingStatus) => {
    const mapping: Record<BookingStatus, string> = {
      red: 'missed',
      yellow: 'partial',
      green: 'attended',
      blue: 'future'
    };
    return t(`status.${mapping[status]}`);
  };

  return (
    <div className={`space-y-8 pb-20 transition-all duration-500 ease-in-out ${(selectedTimelineInfo && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0'}`}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('parent.dashboard')}</h2>
          <p className="text-slate-500 mt-1">{t('parent.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-slate-100/50 p-1.5 rounded-[2rem] border-2 border-slate-100 w-fit">
        <button onClick={() => setActiveTab('attendance')} className={`flex items-center space-x-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>{t('nav.attendance')}</button>
        <button onClick={() => setActiveTab('bookings')} className={`flex items-center space-x-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bookings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>{t('nav.bookings')}</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 w-full ${isCalendarMaximized ? 'lg:w-full' : 'lg:max-w-xl'}`}>
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between bg-white gap-y-3">
            <div className="flex items-center space-x-1">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="px-2">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter text-center block w-20">{monthName}</span>
              </div>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsCalendarMaximized(!isCalendarMaximized)}
                className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
              </button>
              <button 
                onClick={() => { setSelectedDate(hktToday); setSelectedDates([]); setViewDate(new Date()); }}
                className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                {t('parent.go_today')}
              </button>
            </div>
          </div>

          <div className="px-6 py-5 bg-white select-none">
            <div className="mx-auto">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map(day => (
                  <div key={day} className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">{day}</div>
                ))}
              </div>
              <div className="space-y-1">
                {calendarWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-7 gap-1 items-stretch">
                    {week.map((dateObj, dIdx) => {
                      if (!dateObj) return <div key={`empty-${dIdx}`} />;
                      const dateStr = dateObj.toLocaleDateString('en-CA');
                      const isSelected = activeTab === 'attendance' ? selectedDate === dateStr : selectedDates.includes(dateStr);
                      const isPreviewed = isDateInDragRange(dateStr);
                      const isTodayLocal = dateStr === hktToday;
                      const dayStatus = getDayStatusOverall(dateStr);
                      const studentStatuses = getStudentDetailedStatusesForDay(dateStr);

                      return (
                        <button
                          key={dateStr}
                          onMouseDown={(e) => handleMouseDown(dateStr, e)}
                          onMouseEnter={() => handleMouseEnter(dateStr)}
                          className={`flex flex-col items-center justify-start p-1.5 rounded-lg transition-all border font-black relative ${
                            isCalendarMaximized ? 'min-h-[7.5rem]' : 'h-10'
                          } ${
                            isSelected || isPreviewed 
                            ? 'bg-indigo-600 border-indigo-600 text-white z-10 shadow-lg' 
                            : isTodayLocal ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                          }`}
                        >
                          <span className={`text-[11px] ${isCalendarMaximized ? 'mb-1 self-start ml-0.5' : ''}`}>{dateObj.getDate()}</span>
                          {isCalendarMaximized ? (
                            <div className="w-full flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar max-h-[5.5rem]">
                              {studentStatuses.map((s, i) => (
                                <div key={i} className="flex items-center space-x-1.5 min-w-0 bg-white/5 rounded px-1 py-0.5">
                                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10 ${statusColors[s.status]}`} />
                                  <span className={`text-[9px] font-black truncate leading-none uppercase tracking-tight ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                                    {s.name}
                                  </span>
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
        </div>

        {activeTab === 'attendance' && (
          <div className="flex items-center space-x-4 bg-white border border-slate-200 rounded-[2rem] px-6 py-4 shadow-sm self-start">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('attendance.booked')}</span>
              <span className="text-xl font-black text-slate-900 leading-none">{attendanceDayStats.totalBooked}</span>
            </div>
            <div className="w-px h-6 bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">{t('attendance.here')}</span>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black text-emerald-600 leading-none">{attendanceDayStats.currentlyHere}</span>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'attendance' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-12 animate-in fade-in duration-500">
          {childrenData.map((item) => (
            <DashboardStudentCard 
              key={item.student.id} 
              data={{ ...item, bookings: item.bookings.filter(b => b.date === selectedDate) }} 
              onEdit={() => setEditingStudent(item.student)} 
              isSelected={selectedTimelineInfo?.studentId === item.student.id && selectedTimelineInfo?.date === selectedDate}
              onSelect={() => { setSelectedTimelineInfo({ studentId: item.student.id, studentName: item.student.name, date: selectedDate }); setIsTimelineExpanded(true); }}
              getBookingStatus={getBookingStatus}
            />
          ))}
          {childrenData.length === 0 && !isLoadingMain && (
             <div className="col-span-full py-20 text-center bg-white border border-slate-200 rounded-[3rem]">
               <p className="text-slate-400 font-bold italic">{t('attendance.no_students')}</p>
             </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1 block">{t('bookings.filter_student')}</label>
              <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer">
                <option value="">{t('bookings.all_students')}</option>
                {childrenData.map(c => <option key={c.student.id} value={c.student.id}>{c.student.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1 block">{t('bookings.filter_course')}</label>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer">
                <option value="">{t('bookings.all_courses')}</option>
                {uniqueCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1 block">{t('bookings.filter_status')}</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer">
                <option value="">{t('bookings.all_statuses')}</option>
                <option value="red">{t('status.missed')}</option>
                <option value="green">{t('status.attended')}</option>
                <option value="blue">{t('status.future')}</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('bookings.total_entries')}</span>
                <span className="text-2xl font-black text-slate-900 leading-none">{summaryStats.totalEntries}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('bookings.total_time')}</span>
                <span className="text-2xl font-black text-indigo-600 leading-none">{summaryStats.totalTime}</span>
              </div>
              <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-black text-green-500/70 uppercase tracking-widest mb-2">{t('status.attended')}</span>
                <span className="text-2xl font-black text-green-600 leading-none">{summaryStats.attended}</span>
              </div>
              <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">{t('status.missed')}</span>
                <span className="text-2xl font-black text-red-600 leading-none">{summaryStats.missed}</span>
              </div>
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1">
                <span className="text-[10px] font-black text-blue-400/70 uppercase tracking-widest mb-2">{t('status.future')}</span>
                <span className="text-2xl font-black text-blue-600 leading-none">{summaryStats.future}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('date')}>{t('bookings.date')} {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('time')}>{t('bookings.time')} {sortField === 'time' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('student')}>{t('bookings.student')} {sortField === 'student' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('course')}>{t('bookings.course')} {sortField === 'course' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('status')}>{t('bookings.status')} {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                  </tr>
                </thead>
                <tbody>
                  {processedAllBookings.map((b, index, arr) => {
                    const prev = index > 0 ? arr[index - 1] : null;
                    const getGroupKey = (booking: any): string => {
                      switch (sortField) {
                        case 'date': return booking.date;
                        case 'student': return booking.student_id;
                        case 'course': return booking.course_id;
                        case 'status': return booking.calculatedStatus;
                        case 'time': return booking.start;
                        default: return '';
                      }
                    };
                    const isNewGroup = !prev || getGroupKey(b) !== getGroupKey(prev);
                    const isSelectedForTimeline = selectedTimelineInfo?.studentId === b.student_id && selectedTimelineInfo?.date === b.date;

                    return (
                      <tr 
                        key={b.id} 
                        onClick={() => { setSelectedTimelineInfo({ studentId: b.student_id, studentName: b.students?.name || '', date: b.date }); setIsTimelineExpanded(true); }}
                        className={`transition-colors group cursor-pointer ${isSelectedForTimeline ? 'bg-indigo-50/50' : 'hover:bg-slate-50'} ${index > 0 ? (isNewGroup ? 'border-t-4 border-slate-200' : 'border-t border-slate-100') : ''}`}
                      >
                        <td className="px-6 py-4 align-top">
                          <div className={`flex flex-col ${(sortField === 'date' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            <span className="text-xs font-black text-slate-900">{b.date}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(b.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-indigo-600 font-mono font-black align-top">
                          <div className={`transition-opacity duration-200 ${(sortField === 'time' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            {b.start.slice(0, 5)} - {b.end.slice(0, 5)}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className={`transition-opacity duration-200 ${(sortField === 'student' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            <span className="text-xs text-slate-900 font-bold group-hover:text-indigo-600 transition-colors">{b.students?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className={`flex items-center space-x-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 w-fit ${(sortField === 'course' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: b.courses?.color || '#cbd5e1' }} />
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tight truncate max-w-[120px]">{b.courses?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className={`flex items-center space-x-2 ${(sortField === 'status' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                             <div className={`w-2 h-2 rounded-full ${statusColors[b.calculatedStatus]}`} />
                             <span className={`text-[10px] font-black uppercase tracking-widest ${b.calculatedStatus === 'red' ? 'text-red-500' : b.calculatedStatus === 'yellow' ? 'text-yellow-600' : b.calculatedStatus === 'green' ? 'text-green-600' : 'text-blue-500'}`}>
                               {getTranslatedStatus(b.calculatedStatus)}
                             </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Student Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('parent.edit_profile')}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{t('parent.updating')} {editingStudent.name}</p>
            </div>
            <form onSubmit={handleUpdateStudent} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">{t('students.full_name')}</label>
                <input 
                  type="text" required value={editingStudent.name}
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">{t('students.grade_level')}</label>
                  <select 
                    value={editingStudent.level || ''}
                    onChange={e => setEditingStudent({...editingStudent, level: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold"
                  >
                    <option value="">{t('students.select')}</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">{t('students.contact')}</label>
                  <input 
                    type="text" value={editingStudent.contact || ''}
                    onChange={e => setEditingStudent({...editingStudent, contact: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">{t('common.cancel')}</button>
                <button type="submit" disabled={isSavingStudent} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl text-xs uppercase tracking-widest flex items-center">
                  {isSavingStudent && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  {t('common.save_changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTimelineInfo && <TimelinePanel studentName={selectedTimelineInfo.studentName} bookings={timelineData.bookings} date={selectedTimelineInfo.date} isExpanded={isTimelineExpanded} onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)} />}
    </div>
  );
};

const DashboardStudentCard: React.FC<{ 
  data: StudentDetailedData; 
  onEdit: () => void;
  isSelected: boolean;
  onSelect: () => void;
  getBookingStatus: (b: Booking) => BookingStatus;
}> = ({ data, onEdit, isSelected, onSelect, getBookingStatus }) => {
  const { student, bookings } = data;
  const { t } = useTranslation();
  const isCurrentlyInClass = bookings.some(b => b.check_in && !b.check_out);

  const statusColors = { 
    blue: 'bg-blue-50 text-blue-600 ring-blue-500/10', 
    green: 'bg-emerald-50 text-emerald-600 ring-emerald-500/10', 
    red: 'bg-rose-50 text-rose-600 ring-rose-500/10',
    yellow: 'bg-amber-50 text-amber-600 ring-amber-500/10'
  };

  const getContrastColor = (hexcolor: string) => {
    if (!hexcolor) return '#64748b';
    const hex = hexcolor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#ffffff';
  };

  return (
    <div 
      onClick={onSelect}
      className={`relative bg-white border-2 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.99] group ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-50 bg-indigo-50/5' : 'border-slate-100'}`}
    >
      <div className={`p-6 border-b transition-colors ${isSelected ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-50'} flex items-start justify-between`}>
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors truncate">{student.name}</h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('students.sort_level')}: {student.level || 'N/A'}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 text-slate-300 hover:text-indigo-600 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          </div>
        </div>
        <div className="shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm transition-all ${isCurrentlyInClass ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
            {isCurrentlyInClass ? t('parent.in_class').toUpperCase() : t('parent.away').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('card.todays_schedule')}</label>
        <div className="grid gap-3">
          {bookings.map(booking => {
            const status = getBookingStatus(booking);
            const courseColor = booking.courses?.color || '#f1f5f9';
            const textColor = getContrastColor(courseColor);
            
            // Mapping for the specific card status labels
            const statusKey = {
              red: 'missed',
              yellow: 'partial',
              green: 'attended',
              blue: 'future'
            }[status];

            return (
              <div key={booking.id} className="relative flex flex-col p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-slate-50">
                <div className="flex items-center space-x-3 mb-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm shrink-0"
                    style={{ backgroundColor: courseColor, color: textColor }}
                  >
                     {booking.courses?.name?.slice(0, 1) || 'B'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-xs truncate leading-tight">{booking.courses?.name}</p>
                    <span className={`${statusColors[status]} inline-flex items-center rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ring-1 ring-inset tracking-tighter mt-0.5`}>
                      {t(`status.${statusKey}`)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Schedule</span>
                    <span className="text-xs font-mono font-black text-indigo-600">{booking.start.slice(0, 5)} - {booking.end.slice(0, 5)}</span>
                  </div>
                  {booking.check_in && (
                    <div className="text-right">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block">Arrived</span>
                      <span className="text-[10px] font-mono font-bold text-slate-600">{booking.check_in.slice(11, 16)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {bookings.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-[11px] text-slate-400 font-bold italic">{t('card.no_bookings')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;