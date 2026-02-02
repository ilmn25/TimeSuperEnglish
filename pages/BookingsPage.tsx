
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Booking, Course, Student, Attendance } from '../types';
import TimelinePanel from '../components/TimelinePanel';
import { useTranslation } from 'react-i18next';

type SortField = 'date' | 'time' | 'student' | 'course' | 'status';
type SortOrder = 'asc' | 'desc';
type BookingStatus = 'blue' | 'green' | 'yellow' | 'red';

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

const BookingsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { t } = useTranslation();
  
  // Raw Data State (Entire Month)
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [monthAttendances, setMonthAttendances] = useState<Attendance[]>([]);
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

  // Fetch all records for the month
  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const startDate = new Date(year, month, 1).toLocaleDateString('en-CA');
      const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

      const [bookingsData, attendancesData, coursesData, studentsData] = await Promise.all([
        api.getAllBookings(orgId, { startDate, endDate }),
        api.getAllAttendances(orgId, { startDate, endDate }),
        api.getCourses(orgId),
        api.getStudents(orgId)
      ]);

      setMonthBookings(bookingsData);
      setMonthAttendances(attendancesData);
      setCourses(coursesData);
      setStudents(studentsData);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, viewDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Drag event lifecycle
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
  }, [isDragging, dragStart, dragEnd]);

  // FRONTEND FILTERING & SORTING
  const processedBookings = useMemo(() => {
    let result = monthBookings.filter(b => {
      const matchesStudent = !filterStudent || b.student_id === filterStudent;
      const matchesCourse = !filterCourse || b.course_id === filterCourse;
      const matchesDate = selectedDates.length === 0 || selectedDates.includes(b.date);
      return matchesStudent && matchesCourse && matchesDate;
    }).map(b => {
      const dayAttendances = monthAttendances.filter(a => a.date === b.date && a.student_id === b.student_id);
      return { ...b, calculatedStatus: getBookingStatus(b, dayAttendances) };
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
  }, [monthBookings, monthAttendances, filterStudent, filterCourse, selectedDates, filterStatus, sortField, sortOrder, getBookingStatus]);

  const summaryStats = useMemo(() => {
    let totalMinutes = 0;
    let attendedCount = 0;
    let missedCount = 0;
    let futureCount = 0;

    processedBookings.forEach(booking => {
      // Time calc
      const [sH, sM] = booking.start.split(':').map(Number);
      const [eH, eM] = booking.end.split(':').map(Number);
      totalMinutes += (eH * 60 + eM) - (sH * 60 + sM);

      const status = booking.calculatedStatus;
      if (status === 'green' || status === 'yellow') attendedCount++;
      else if (status === 'red') missedCount++;
      else if (status === 'blue') futureCount++;
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return {
      totalEntries: processedBookings.length,
      totalTime: `${hours}h ${mins}m`,
      attended: attendedCount,
      missed: missedCount,
      future: futureCount
    };
  }, [processedBookings]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDateClick = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const handleMouseDown = (dateStr: string) => {
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

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
    setSelectedDates([]); 
    setIsTimelineExpanded(false);
    setSelectedTimelineInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setIsProcessing(true);
    try {
      if (editingBooking) {
        await api.updateBooking(orgId, editingBooking.id, formData);
      } else {
        await api.createBooking(orgId, formData);
      }
      setIsFormOpen(false);
      setEditingBooking(null);
      fetchData();
    } catch (err) {
      alert('Failed to save booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !orgId) return;
    setIsProcessing(true);
    try {
      await api.deleteBooking(orgId, confirmDeleteId);
      setConfirmDeleteId(null);
      fetchData();
    } catch (err) {
      alert('Failed to delete booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFilters = () => {
    setSelectedDates([]);
    setFilterStudent('');
    setFilterCourse('');
    setFilterStatus('');
  };

  // Status calculation for dots (respecting student/course filters)
  const getDayStatus = (dateStr: string): BookingStatus | null => {
    const dayBookings = monthBookings.filter(b => 
      b.date === dateStr && 
      (!filterStudent || b.student_id === filterStudent) && 
      (!filterCourse || b.course_id === filterCourse)
    );
    
    if (dayBookings.length === 0) return null;

    const dayAttendances = monthAttendances.filter(a => a.date === dateStr);
    const statuses = dayBookings.map(b => getBookingStatus(b, dayAttendances));

    if (statuses.every(s => s === 'blue')) return 'blue';
    
    const pastStatuses = statuses.filter(s => s !== 'blue');
    if (pastStatuses.length === 0) return 'blue';

    const hasMissed = pastStatuses.some(s => s === 'red');
    const hasAttended = pastStatuses.some(s => s === 'green');

    if (hasMissed && hasAttended) return 'yellow';
    if (hasMissed) return 'red';
    return 'green';
  };

  const getStudentDetailedStatusesForDay = (dateStr: string) => {
    const dayBookings = monthBookings.filter(b => 
      b.date === dateStr && 
      (!filterStudent || b.student_id === filterStudent) && 
      (!filterCourse || b.course_id === filterCourse)
    );
    const dayAttendances = monthAttendances.filter(a => a.date === dateStr);
    
    const studentMap = new Map<string, { name: string; status: BookingStatus }>();
    dayBookings.forEach(b => {
      const student = b.students as Student;
      if (!student) return;
      const current = studentMap.get(student.id);
      const status = getBookingStatus(b, dayAttendances);
      
      if (!current) {
        studentMap.set(student.id, { name: student.name, status });
      } else {
        const priority = { red: 3, yellow: 2, green: 1, blue: 0 };
        if (priority[status] > priority[current.status]) {
          studentMap.set(student.id, { name: student.name, status });
        }
      }
    });
    return Array.from(studentMap.values());
  };

  const statusColors = {
    blue: 'bg-blue-400',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    red: 'bg-red-500'
  };

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="ml-1 text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleRowClick = (booking: Booking) => {
    setSelectedTimelineInfo({
      studentId: booking.student_id,
      studentName: booking.students?.name || 'Unknown Student',
      date: booking.date
    });
    setIsTimelineExpanded(true);
  };

  const timelineData = useMemo(() => {
    if (!selectedTimelineInfo) return { bookings: [], attendances: [] };
    const { studentId, date } = selectedTimelineInfo;
    return {
      bookings: monthBookings.filter(b => b.student_id === studentId && b.date === date),
      attendances: monthAttendances.filter(a => a.student_id === studentId && a.date === date)
    };
  }, [selectedTimelineInfo, monthBookings, monthAttendances]);

  const layoutPaddingClass = (selectedTimelineInfo && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0';

  return (
    <div className={`space-y-6 pb-10 transition-all duration-500 ease-in-out ${layoutPaddingClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('bookings.title')}</h2>
          <p className="text-slate-500 text-xs font-medium">{t('bookings.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          {t('bookings.new_entry')}
        </button>
      </div>

      <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 ${isCalendarMaximized ? 'max-w-none' : 'max-w-3xl mx-auto'}`}>
        {/* Calendar Navigation */}
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
                title={isCalendarMaximized ? "Minimize" : "Maximize"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
              </button>
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
           </div>
        </div>

        {/* Calendar Grid */}
        <div className="px-6 py-5 bg-white select-none">
          <div className="mx-auto">
            <div className="grid grid-cols-[24px_repeat(7,1fr)] gap-1 mb-2">
              <div />
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {calendarWeeks.map((week, wIdx) => {
                const nonNullWeekDates = week.filter(d => d !== null).map(d => d!.toLocaleDateString('en-CA'));
                const isWeekAllSelected = nonNullWeekDates.length > 0 && nonNullWeekDates.every(d => selectedDates.includes(d));
                
                return (
                  <div key={wIdx} className="grid grid-cols-[24px_repeat(7,1fr)] gap-1 items-stretch">
                    <button 
                      onClick={() => handleSelectWeek(week)}
                      className={`h-7 w-5 mt-1 rounded-md flex items-center justify-center transition-all ${isWeekAllSelected ? 'text-indigo-600 bg-indigo-50' : 'text-slate-200 hover:text-indigo-400'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                    </button>

                    {week.map((dateObj, dIdx) => {
                      if (!dateObj) return <div key={`empty-${dIdx}`} />;
                      const dateStr = dateObj.toLocaleDateString('en-CA');
                      const isSelected = selectedDates.includes(dateStr);
                      const isPreviewed = isDateInDragRange(dateStr);
                      const isTodayLocal = dateStr === new Date().toLocaleDateString('en-CA');
                      const dayStatus = getDayStatus(dateStr);
                      const studentStatuses = getStudentDetailedStatusesForDay(dateStr);
                      
                      return (
                        <button
                          key={dateStr}
                          onMouseDown={() => handleMouseDown(dateStr)}
                          onMouseEnter={() => handleMouseEnter(dateStr)}
                          className={`flex flex-col items-center justify-start p-1.5 rounded-lg transition-all border font-black relative ${
                            isCalendarMaximized ? 'min-h-[7.5rem]' : 'h-10'
                          } ${
                            isPreviewed || isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white z-10 shadow-lg shadow-indigo-100' 
                              : isTodayLocal 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                          }`}
                        >
                          <span className={`text-[11px] ${isCalendarMaximized ? 'mb-1 self-start ml-0.5' : ''}`}>{dateObj.getDate()}</span>
                          
                          {isCalendarMaximized ? (
                            <div className="w-full flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar max-h-[5.5rem]">
                              {studentStatuses.map((s, i) => (
                                <div key={i} className="flex items-center space-x-1.5 min-w-0 bg-white/5 rounded px-1 py-0.5">
                                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10 ${statusColors[s.status]}`} />
                                  <span className={`text-[9px] font-black truncate leading-none uppercase tracking-tight ${isSelected || isPreviewed ? 'text-indigo-100' : 'text-slate-500 group-hover:text-inherit'}`}>
                                    {s.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            dayStatus && (
                              <div className={`w-1 h-1 rounded-full mt-0.5 ${statusColors[dayStatus]}`} />
                            )
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

        {/* Student, Course & Status Filters */}
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
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
      </div>

      {/* Filtered Summary Section */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('bookings.summary_title')}</h3>
        </div>
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

      {/* Bookings Table */}
      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest animate-pulse">{t('bookings.syncing')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('date')}>{t('bookings.date')} {renderSortArrow('date')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('time')}>{t('bookings.time')} {renderSortArrow('time')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('student')}>{t('bookings.student')} {renderSortArrow('student')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('course')}>{t('bookings.course')} {renderSortArrow('course')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('status')}>{t('bookings.status')} {renderSortArrow('status')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('bookings.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {processedBookings.map((booking, index, bookings) => {
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
                  const isSelectedForTimeline = selectedTimelineInfo?.studentId === booking.student_id && selectedTimelineInfo?.date === booking.date;
                  
                  return (
                    <tr 
                      key={booking.id} 
                      onClick={() => handleRowClick(booking)}
                      className={`transition-colors group cursor-pointer ${isSelectedForTimeline ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}
                        ${index > 0 ? (isNewGroup ? 'border-t-4 border-slate-200' : 'border-t border-slate-100') : ''}
                      `}
                    >
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <div className={`flex flex-col transition-opacity duration-200 ${(sortField === 'date' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                          <span className="text-xs font-black text-slate-900">{booking.date}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
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
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: booking.courses?.color || '#cbd5e1' }} />
                          <span className="text-[9px] text-slate-600 font-black uppercase tracking-tight truncate max-w-[120px]">{booking.courses?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <div className={`flex items-center space-x-2 transition-opacity duration-200 ${(sortField === 'status' && !isNewGroup) ? 'opacity-0' : 'opacity-100'}`}>
                           <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${
                             status === 'red' ? 'text-red-500' :
                             status === 'yellow' ? 'text-yellow-600' :
                             status === 'green' ? 'text-green-600' : 'text-blue-500'
                           }`}>
                             {status === 'red' ? t('status.missed') :
                              status === 'yellow' ? t('status.partial') :
                              status === 'green' ? t('status.attended') : t('status.future')}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap align-top" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => { setEditingBooking(booking); setFormData({ student_id: booking.student_id, course_id: booking.course_id, date: booking.date, start: booking.start.slice(0,5), end: booking.end.slice(0,5) }); setIsFormOpen(true); }} 
                          className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all rounded-lg hover:bg-indigo-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(booking.id)} 
                          className="p-1.5 text-slate-300 hover:text-red-600 transition-all rounded-lg hover:bg-red-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {processedBookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <p className="text-slate-400 font-bold text-xs italic">{t('bookings.no_match')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingBooking ? t('bookings.edit') : t('bookings.new')}</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.student')}</label>
                  <select 
                    required
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold"
                  >
                    <option value="">{t('students.select')}</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.course')}</label>
                  <select 
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold"
                  >
                    <option value="">{t('students.select')}</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.date')}</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.start')}</label>
                  <input 
                    type="time" 
                    required
                    value={formData.start}
                    onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-black font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('bookings.end')}</label>
                  <input 
                    type="time" 
                    required
                    value={formData.end}
                    onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-black font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setIsFormOpen(false); setEditingBooking(null); }} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center">
                   {isProcessing && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                   {editingBooking ? t('common.save') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm overflow-hidden p-8 animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-2 text-center">{t('bookings.delete_title')}</h3>
            <p className="text-slate-500 text-xs mb-6 text-center leading-relaxed">{t('bookings.delete_msg')}</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2.5 text-[10px] font-black text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors uppercase tracking-widest">{t('common.cancel')}</button>
              <button onClick={handleDelete} disabled={isProcessing} className="flex-1 px-4 py-2.5 text-[10px] font-black text-white rounded-xl bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center uppercase tracking-widest shadow-lg shadow-red-100">
                {isProcessing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('common.delete')}
              </button>
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
    </div>
  );
};

export default BookingsPage;
