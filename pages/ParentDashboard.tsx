
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { Student, Booking, Attendance, Course } from '../types';
import TimelinePanel from '../components/TimelinePanel';
import { useTranslation } from 'react-i18next';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getHKTNow = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));
};

const getHKTDateString = (baseDate: Date = new Date()) => {
  return baseDate.toLocaleDateString("en-CA", { 
    timeZone: "Asia/Hong_Kong" 
  }); 
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

const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

type BookingStatus = 'blue' | 'green' | 'yellow' | 'red';
type SortField = 'date' | 'time' | 'student' | 'course' | 'status';
type SortOrder = 'asc' | 'desc';

interface StudentDetailedData {
  student: Student & { organization_name?: string };
  bookings: Booking[];
  attendances: Attendance[];
  isLoading: boolean;
}

const ParentDashboard: React.FC = () => {
  const hktToday = getHKTDateString();
  const { t } = useTranslation();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'attendance' | 'bookings'>('attendance');
  
  // Shared Data State
  const [viewDate, setViewDate] = useState(new Date()); 
  const [childrenData, setChildrenData] = useState<StudentDetailedData[]>([]);
  const [isLoadingMain, setIsLoadingMain] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attendance View State
  const [selectedDate, setSelectedDate] = useState<string>(hktToday);
  
  // Bookings View Filter/Sort State
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [filterStudent, setFilterStudent] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  
  // Dragging State (for calendar)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);

  // Timeline State
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [selectedTimelineInfo, setSelectedTimelineInfo] = useState<{ studentId: string; studentName: string; date: string } | null>(null);
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);

  // Edit Student Info State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contact: '',
    level: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const monthName = viewDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

  // Generate weeks for the calendar grid
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

  // Status Calculation Helper
  const getBookingStatus = useCallback((booking: Booking, dayAttendances: Attendance[]): BookingStatus => {
    const hktNow = getHKTNow();
    const bookingDate = new Date(booking.date);
    const [bStartH, bStartM] = booking.start.split(':').map(Number);
    const [bEndH, bEndM] = booking.end.split(':').map(Number);
    
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(bStartH, bStartM, 0, 0);
    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(bEndH, bEndM, 0, 0);

    if (startDateTime > hktNow) return 'blue';

    const hasOverlap = dayAttendances.some(att => {
      if (att.student_id !== booking.student_id) return false;
      const [aStartH, aStartM] = att.start.split(':').map(Number);
      const aStart = new Date(bookingDate);
      aStart.setHours(aStartH, aStartM, 0, 0);
      let aEnd: Date;
      if (att.end) {
        const [aEndH, aEndM] = att.end.split(':').map(Number);
        aEnd = new Date(bookingDate);
        aEnd.setHours(aEndH, aEndM, 0, 0);
      } else {
        const isAttToday = att.date === hktNow.toLocaleDateString('en-CA');
        aEnd = isAttToday ? hktNow : new Date(aStart.getTime() + 24 * 60 * 60 * 1000); 
      }
      return aStart < endDateTime && aEnd > startDateTime;
    });

    return hasOverlap ? 'green' : 'red';
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
        attendances: [],
        isLoading: true
      }));

      setChildrenData(detailedStudents);

      const updatePromises = detailedStudents.map(async (item) => {
        try {
          const [bookings, attendances] = await Promise.all([
            api.getStudentBookings(item.student.id, { startDate, endDate }),
            api.getStudentAttendances(item.student.id, { startDate, endDate })
          ]);
          setChildrenData(prev => prev.map(p => 
            p.student.id === item.student.id ? { ...p, bookings, attendances, isLoading: false } : p
          ));
        } catch (err) {
          console.error(`Failed to fetch data for ${item.student.name}`, err);
          setChildrenData(prev => prev.map(p => p.student.id === item.student.id ? { ...p, isLoading: false } : p));
        }
      });
      await Promise.all(updatePromises);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setIsLoadingMain(false);
    }
  }, [viewDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    if (activeTab !== 'bookings') return;
    if (!e.shiftKey) {
      setSelectedDates([]);
    }
    setIsDragging(true);
    setDragStart(dateStr);
    setDragEnd(dateStr);
  };

  // Drag event lifecycle for calendar
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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="ml-1 text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const uniqueCoursesForFilter = useMemo(() => {
    const allBookingsWithCourses = childrenData.flatMap(c => c.bookings).filter(b => b.courses);
    const uniqueCoursesMap = new Map<string, { id: string, name: string }>();
    allBookingsWithCourses.forEach(b => {
        if (b.courses && !uniqueCoursesMap.has(b.courses.id)) {
            uniqueCoursesMap.set(b.courses.id, { id: b.courses.id, name: b.courses.name });
        }
    });
    return Array.from(uniqueCoursesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [childrenData]);

  // Process all bookings for the Bookings View
  const processedAllBookings = useMemo(() => {
    const all = childrenData.flatMap(c => c.bookings.map(b => {
      const dayAttendances = c.attendances.filter(a => a.date === b.date);
      return { 
        ...b, 
        students: c.student,
        calculatedStatus: getBookingStatus(b, dayAttendances) 
      };
    }));

    let result = all.filter(b => {
      const matchesStudent = !filterStudent || b.student_id === filterStudent;
      const matchesCourse = !filterCourse || b.course_id === filterCourse;
      const matchesDate = selectedDates.length === 0 || selectedDates.includes(b.date);
      return matchesStudent && matchesCourse && matchesDate;
    });

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
        case 'date':
          comparison = dateCompare !== 0 ? dateCompare : timeCompare;
          break;
        case 'time':
          comparison = timeCompare !== 0 ? timeCompare : dateCompare;
          break;
        case 'student':
          comparison = studentCompare !== 0 ? studentCompare : (dateCompare !== 0 ? dateCompare : timeCompare);
          break;
        case 'course':
          comparison = courseCompare !== 0 ? courseCompare : (dateCompare !== 0 ? dateCompare : timeCompare);
          break;
        case 'status':
          comparison = statusCompare !== 0 ? statusCompare : (dateCompare !== 0 ? dateCompare : timeCompare);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [childrenData, filterStudent, filterCourse, selectedDates, filterStatus, sortField, sortOrder, getBookingStatus]);

  const summaryStats = useMemo(() => {
    let totalMinutes = 0;
    let attendedCount = 0;
    let missedCount = 0;
    let futureCount = 0;

    processedAllBookings.forEach(b => {
      const [sH, sM] = b.start.split(':').map(Number);
      const [eH, eM] = b.end.split(':').map(Number);
      totalMinutes += (eH * 60 + eM) - (sH * 60 + sM);
      const status = b.calculatedStatus;
      if (status === 'green' || status === 'yellow') attendedCount++;
      else if (status === 'red') missedCount++;
      else if (status === 'blue') futureCount++;
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

  const handleSelectWeek = (week: (Date | null)[]) => {
    if (activeTab !== 'bookings') return;
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

  const handleEditStudent = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setEditingStudent(student);
    setEditFormData({ name: student.name || '', contact: student.contact || '', level: student.level || '' });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsUpdating(true);
    try {
      const orgId = (editingStudent as any).org_id;
      if (!orgId) throw new Error("Organization ID not found for student.");
      await api.updateStudent(orgId, editingStudent.id, editFormData.name, editFormData.contact, editFormData.level || undefined);
      setChildrenData(prev => prev.map(item => item.student.id === editingStudent.id ? { ...item, student: { ...item.student, ...editFormData } } : item));
      setEditingStudent(null);
    } catch (err: any) {
      alert(err.message || "Failed to update student info.");
    } finally {
      setIsUpdating(false);
    }
  };

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
    setSelectedDates([]);
    setSelectedTimelineInfo(null);
  };

  const getDayStatusOverall = (dateStr: string): BookingStatus | null => {
    const allStatuses: BookingStatus[] = [];
    childrenData.forEach(child => {
      const dayBookings = child.bookings.filter(b => b.date === dateStr);
      if (dayBookings.length === 0) return;
      const dayAttendances = child.attendances.filter(a => a.date === dateStr);
      dayBookings.forEach(b => allStatuses.push(getBookingStatus(b, dayAttendances)));
    });
    if (allStatuses.length === 0) return null;
    if (allStatuses.every(s => s === 'blue')) return 'blue';
    const pastStatuses = allStatuses.filter(s => s !== 'blue');
    if (pastStatuses.length === 0) return 'blue';
    const hasMissed = pastStatuses.some(s => s === 'red');
    const hasAttended = pastStatuses.some(s => s === 'green');
    if (hasMissed && hasAttended) return 'yellow';
    if (hasMissed) return 'red';
    return 'green';
  };

  const getChildDetailedStatusesForDay = (dateStr: string) => {
    return childrenData.map(child => {
      const dayBookings = child.bookings.filter(b => b.date === dateStr);
      const dayAttendances = child.attendances.filter(a => a.date === dateStr);
      if (dayBookings.length === 0) return null;
      let status: BookingStatus = 'blue';
      const dayStatuses = dayBookings.map(b => getBookingStatus(b, dayAttendances));
      const priority = { red: 3, yellow: 2, green: 1, blue: 0 };
      dayStatuses.forEach(s => { if (priority[s] > priority[status]) status = s; });
      return { name: child.student.name, status };
    }).filter(Boolean) as { name: string; status: BookingStatus }[];
  };

  const statusColors = { blue: 'bg-blue-400', green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

  const handleRowClick = (booking: Booking) => {
    setSelectedTimelineInfo({
      studentId: booking.student_id,
      studentName: booking.students?.name || 'Unknown',
      date: booking.date
    });
    setIsTimelineExpanded(true);
  };

  const timelineData = useMemo(() => {
    if (!selectedTimelineInfo) return { bookings: [], attendances: [] };
    const child = childrenData.find(c => c.student.id === selectedTimelineInfo.studentId);
    if (!child) return { bookings: [], attendances: [] };
    return {
      bookings: child.bookings.filter(b => b.date === selectedTimelineInfo.date),
      attendances: child.attendances.filter(a => a.date === selectedTimelineInfo.date)
    };
  }, [selectedTimelineInfo, childrenData]);

  const clearFilters = () => {
    setSelectedDates([]);
    setFilterStudent('');
    setFilterCourse('');
    setFilterStatus('');
  };

  const layoutPaddingClass = (selectedTimelineInfo && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0';

  return (
    <div className={`space-y-8 pb-20 transition-all duration-500 ease-in-out ${layoutPaddingClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('parent.dashboard')}</h2>
          <p className="text-slate-500 mt-1">{t('parent.subtitle')}</p>
        </div>
      </div>

      {/* View Switcher Navigation */}
      <div className="flex items-center space-x-2 bg-slate-100/50 p-1.5 rounded-[2rem] border-2 border-slate-100 w-fit">
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{t('nav.attendance')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bookings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span>{t('nav.bookings')}</span>
        </button>
      </div>

      {/* Shared Calendar */}
      <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 ${isCalendarMaximized ? 'max-w-none' : 'max-w-3xl mx-auto'}`}>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-1">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="px-2">
              <span className="text-sm font-black text-slate-800 uppercase tracking-tighter text-center block w-20">{monthName}</span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
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
            {activeTab === 'attendance' && (
              <button 
                onClick={() => { setSelectedDate(hktToday); setViewDate(new Date()); }}
                className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                {t('parent.go_today')}
              </button>
            )}
            {activeTab === 'bookings' && (
              <>
                <button 
                  onClick={handleSelectMonth}
                  className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                >
                  {t('bookings.select_month')}
                </button>
                <button 
                  onClick={clearFilters}
                  className="px-3 py-1.5 bg-white text-slate-400 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  {t('bookings.reset')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-5 bg-white select-none">
          <div className="mx-auto">
            <div className="grid grid-cols-[24px_repeat(7,1fr)] gap-1 mb-2">
              <div />
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">{day}</div>
              ))}
            </div>
            <div className="space-y-1">
              {calendarWeeks.map((week, wIdx) => {
                const nonNullWeekDates = activeTab === 'bookings' && week.filter(d => d !== null).map(d => d!.toLocaleDateString('en-CA'));
                const isWeekAllSelected = nonNullWeekDates && nonNullWeekDates.length > 0 && nonNullWeekDates.every(d => selectedDates.includes(d));

                return (
                  <div key={wIdx} className="grid grid-cols-[24px_repeat(7,1fr)] gap-1 items-stretch">
                    <button 
                      onClick={() => handleSelectWeek(week)}
                      className={`h-7 w-5 mt-1 rounded-md flex items-center justify-center transition-all ${activeTab === 'bookings' ? (isWeekAllSelected ? 'text-indigo-600 bg-indigo-50' : 'text-slate-200 hover:text-indigo-400') : 'cursor-default text-transparent'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                    </button>
                    {week.map((dateObj, dIdx) => {
                      if (!dateObj) return <div key={`empty-${dIdx}`} />;
                      const dateStr = dateObj.toLocaleDateString('en-CA');
                      const isSelected = activeTab === 'attendance' ? selectedDate === dateStr : selectedDates.includes(dateStr);
                      const isPreviewed = activeTab === 'bookings' && isDragging && dragStart && dragEnd && (
                        new Date(dateStr).getTime() >= Math.min(new Date(dragStart).getTime(), new Date(dragEnd).getTime()) &&
                        new Date(dateStr).getTime() <= Math.max(new Date(dragStart).getTime(), new Date(dragEnd).getTime())
                      );
                      const isTodayLocal = dateStr === hktToday;
                      const dayStatus = getDayStatusOverall(dateStr);
                      const childStatuses = getChildDetailedStatusesForDay(dateStr);

                      return (
                        <button
                          key={dateStr}
                          onClick={() => { if (activeTab === 'attendance') setSelectedDate(dateStr); }}
                          onMouseDown={(e) => handleMouseDown(dateStr, e)}
                          onMouseEnter={() => activeTab === 'bookings' && isDragging && setDragEnd(dateStr)}
                          className={`flex flex-col items-center justify-start p-1.5 rounded-lg transition-all border font-black relative ${
                            isCalendarMaximized ? 'min-h-[7.5rem]' : 'h-10'
                          } ${
                            isSelected || isPreviewed ? 'bg-indigo-600 border-indigo-600 text-white z-10 shadow-lg shadow-indigo-100' 
                            : isTodayLocal ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                          }`}
                        >
                          <span className={`text-[11px] ${isCalendarMaximized ? 'mb-1 self-start ml-0.5' : ''}`}>{dateObj.getDate()}</span>
                          {isCalendarMaximized ? (
                            <div className="w-full flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar max-h-[5.5rem]">
                              {childStatuses.map((s, i) => (
                                <div key={i} className="flex items-center space-x-1.5 min-w-0 bg-white/5 rounded px-1 py-0.5">
                                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10 ${statusColors[s.status]}`} />
                                  <span className={`text-[9px] font-black truncate leading-none uppercase tracking-tight ${isSelected || isPreviewed ? 'text-indigo-100' : 'text-slate-500 group-hover:text-inherit'}`}>
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
                );
              })}
            </div>
          </div>
        </div>

        {activeTab === 'bookings' && (
          <div className="px-6 py-4 bg-slate-50/40 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 group">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1 block">{t('bookings.filter_student')}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <select 
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                >
                  <option value="">{t('bookings.all_students')}</option>
                  {childrenData.map(c => <option key={c.student.id} value={c.student.id}>{c.student.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="flex-1 group">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1 block">{t('bookings.filter_course')}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <select 
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                >
                  <option value="">{t('bookings.all_courses')}</option>
                  {uniqueCoursesForFilter.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="flex-1 group">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1 block">{t('bookings.filter_status')}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                >
                  <option value="">{t('bookings.all_statuses')}</option>
                  <option value="red">{t('status.missed')}</option>
                  <option value="green">{t('status.attended')}</option>
                  <option value="blue">{t('status.future')}</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'attendance' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12 animate-in fade-in duration-500">
          {childrenData.map((item) => (
            <ChildCard 
              key={item.student.id} 
              data={{
                ...item,
                bookings: item.bookings.filter(b => b.date === selectedDate),
                attendances: item.attendances.filter(a => a.date === selectedDate)
              }} 
              onEdit={handleEditStudent} 
              isSelected={selectedTimelineInfo?.studentId === item.student.id && selectedTimelineInfo?.date === selectedDate}
              onSelect={() => {
                setSelectedTimelineInfo({ studentId: item.student.id, studentName: item.student.name, date: selectedDate });
                setIsTimelineExpanded(true);
              }}
              currentDate={selectedDate}
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
          {/* Summary Section */}
          <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="w-full flex items-center justify-between p-6 text-left"
              aria-expanded={isSummaryExpanded}
            >
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('bookings.summary_title')}</h3>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isSummaryExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isSummaryExpanded ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-6 pb-6 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('bookings.total_entries')}</span>
                    <span className="text-xl font-black text-slate-900">{summaryStats.totalEntries}</span>
                  </div>
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">{t('bookings.total_time')}</span>
                    <span className="text-xl font-black text-indigo-600">{summaryStats.totalTime}</span>
                  </div>
                  <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl">
                    <span className="text-[10px] font-black text-green-500/70 uppercase tracking-widest block mb-1">{t('status.attended')}</span>
                    <span className="text-xl font-black text-green-600">{summaryStats.attended}</span>
                  </div>
                  <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                    <span className="text-[10px] font-black text-red-400/70 uppercase tracking-widest block mb-1">{t('status.missed')}</span>
                    <span className="text-xl font-black text-red-600">{summaryStats.missed}</span>
                  </div>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <span className="text-[10px] font-black text-blue-400/70 uppercase tracking-widest block mb-1">{t('status.future')}</span>
                    <span className="text-xl font-black text-blue-600">{summaryStats.future}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('date')}>{t('bookings.date')} {renderSortArrow('date')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('time')}>{t('bookings.time')} {renderSortArrow('time')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('student')}>{t('bookings.student')} {renderSortArrow('student')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('course')}>{t('bookings.course')} {renderSortArrow('course')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('status')}>{t('bookings.status')} {renderSortArrow('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {processedAllBookings.map((booking, index, bookings) => {
                    const prevBooking = index > 0 ? bookings[index - 1] : null;
      
                    const getGroupKey = (b: any, field: SortField): string | number => {
                      switch (field) {
                        case 'date': return b.date;
                        case 'student': return b.students?.id || b.students?.name || '';
                        case 'course': return b.course_id || b.courses?.name || '';
                        case 'status': return b.calculatedStatus;
                        case 'time': return b.start;
                        default: return b.id;
                      }
                    };
                    
                    const isNewGroup = !prevBooking || getGroupKey(booking, sortField) !== getGroupKey(prevBooking, sortField);
                    const status = booking.calculatedStatus;
                    const isSelected = selectedTimelineInfo?.studentId === booking.student_id && selectedTimelineInfo?.date === booking.date;
                    
                    return (
                      <tr 
                        key={booking.id} 
                        onClick={() => handleRowClick(booking)} 
                        className={`transition-colors group cursor-pointer ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}
                          ${index > 0 ? (isNewGroup ? 'border-t-4 border-slate-200' : 'border-t border-slate-100') : ''}
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap align-top">
                          <div className={`flex flex-col transition-opacity duration-200 ${(sortField === 'date' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            <span className="text-xs font-black text-slate-900">{booking.date}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-indigo-600 font-mono font-black align-top">
                          <div className={`transition-opacity duration-200 ${(sortField === 'time' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            {booking.start.slice(0, 5)} - {booking.end.slice(0, 5)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap align-top">
                          <div className={`transition-opacity duration-200 ${(sortField === 'student' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            <span className="text-xs text-slate-900 font-bold group-hover:text-indigo-600 transition-colors">{booking.students?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap align-top">
                          <div className={`flex items-center space-x-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 w-fit transition-opacity duration-200 ${(sortField === 'course' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: booking.courses?.color || '#cbd5e1' }} />
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tight">{booking.courses?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap align-top">
                          <div className={`flex items-center space-x-2 transition-opacity duration-200 ${(sortField === 'status' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                            <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'red' ? 'text-red-500' : status === 'green' ? 'text-green-600' : 'text-blue-500'}`}>
                              {status === 'red' ? t('status.missed') : status === 'green' ? t('status.attended') : t('status.future')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {processedAllBookings.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-bold italic">{t('bookings.no_match')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedTimelineInfo && (
        <TimelinePanel 
          studentName={selectedTimelineInfo.studentName} 
          bookings={timelineData.bookings} 
          attendances={timelineData.attendances} 
          date={selectedTimelineInfo.date}
          isExpanded={isTimelineExpanded}
          onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)}
        />
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingStudent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t('parent.edit_profile')}</h3>
                <p className="text-slate-500 text-xs">{t('parent.updating')} <span className="text-indigo-600 font-bold">{editingStudent.name}</span></p>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t('students.full_name')}</label>
                <input type="text" required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t('students.sort_level')}</label>
                <select value={editFormData.level} onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium">
                  <option value="">{t('students.select')}</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t('students.contact')}</label>
                <input type="text" required value={editFormData.contact} onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium" />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">{t('common.cancel')}</button>
                <button type="submit" disabled={isUpdating} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm flex items-center">
                  {isUpdating && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                  {t('common.save_changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ChildCard: React.FC<{ 
  data: StudentDetailedData; 
  onEdit: (e: React.MouseEvent, s: Student) => void;
  isSelected: boolean;
  onSelect: () => void;
  currentDate: string;
  getBookingStatus: (b: Booking, atts: Attendance[]) => BookingStatus;
}> = ({ data, onEdit, isSelected, onSelect, currentDate, getBookingStatus }) => {
  const { student, bookings, attendances, isLoading } = data;
  const currentAttendance = attendances.find(a => !a.end);
  const statusColors = { 
    blue: 'bg-blue-400 text-blue-500', 
    green: 'bg-green-500 text-green-600', 
    red: 'bg-red-500 text-red-500',
    yellow: 'bg-yellow-400 text-yellow-600'
  };
  const { t } = useTranslation();

  return (
    <div 
      onClick={onSelect}
      className={`bg-white border rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col group transition-all cursor-pointer ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-50 bg-indigo-50/5' : 'border-slate-200 hover:border-indigo-200'}`}
    >
      <div className={`p-8 sm:p-10 border-b border-slate-100 transition-colors ${isSelected ? 'bg-indigo-50/20' : 'bg-gradient-to-br from-white to-slate-50/50'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100 group-hover:rotate-3 transition-transform ${isSelected ? 'bg-indigo-700 scale-110' : 'bg-indigo-600'}`}>
              {student.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none truncate max-w-[150px] sm:max-w-[200px]">{student.name}</h3>
                <button onClick={(e) => onEdit(e, student)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title={t('common.edit')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100/50 text-[10px] font-black uppercase tracking-widest">{student.level || t('parent.unset')}</div>
                {currentAttendance ? (
                  <span className="flex items-center space-x-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('parent.in_class')}</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest">{t('parent.away')}</span>
                )}
              </div>
            </div>
          </div>
          {isLoading && <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
        </div>
      </div>

      <div className="flex-1 p-8 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
        <section className="space-y-6">
          <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">{t('nav.bookings')}</h4>
          <div className="space-y-4">
            {bookings.map((b) => {
              const status = getBookingStatus(b, attendances);
              return (
                <div key={b.id} className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                  <div className="w-2 h-10 rounded-full" style={{ backgroundColor: b.courses?.color || '#cbd5e1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate text-xs sm:text-sm">{b.courses?.name || t('parent.session')}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase">{b.start.slice(0, 5)} - {b.end.slice(0, 5)}</span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${statusColors[status].split(' ')[0]}`} />
                        <span className={`text-[9px] font-black uppercase tracking-tight ${statusColors[status].split(' ')[1]}`}>
                          {status === 'red' ? t('status.missed') : status === 'green' ? t('status.attended') : t('status.future')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {bookings.length === 0 && !isLoading && <p className="text-slate-400 text-xs italic text-center py-8">{t('parent.no_bookings')}</p>}
          </div>
        </section>

        <section className="space-y-6">
          <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">{t('nav.attendance')}</h4>
          <div className="space-y-4">
            {attendances.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/30">
                <span className="text-[10px] font-mono font-bold text-slate-500">{a.start.slice(0, 5)} — {a.end ? a.end.slice(0, 5) : t('parent.now')}</span>
                {a.end ? (
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-indigo-100 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-green-500 text-white text-[8px] font-black uppercase rounded shadow-sm animate-pulse">{t('parent.live')}</div>
                )}
              </div>
            ))}
            {attendances.length === 0 && !isLoading && <p className="text-slate-400 text-xs italic text-center py-8">{t('parent.no_activity')}</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ParentDashboard;
