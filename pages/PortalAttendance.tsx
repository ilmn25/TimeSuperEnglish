import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { Student, Booking } from '../types';
import TimelinePanel from '../components/TimelinePanel';
import { useTranslation } from 'react-i18next';

const getHKTNow = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));
};

const getHKTDateString = (baseDate: Date = new Date()) => {
  return baseDate.toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" }); 
};

type BookingStatus = 'blue' | 'green' | 'yellow' | 'red';

interface StudentDetailedData {
  student: Student & { organization_name?: string };
  bookings: Booking[];
  isLoading: boolean;
}

const PortalAttendance: React.FC = () => {
  const hktToday = getHKTDateString();
  const { t } = useTranslation();

  const [viewDate, setViewDate] = useState(new Date()); 
  const [childrenData, setChildrenData] = useState<StudentDetailedData[]>([]);
  const [isLoadingMain, setIsLoadingMain] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(hktToday);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [selectedTimelineInfo, setSelectedTimelineInfo] = useState<{ studentId: string; studentName: string; date: string } | null>(null);
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);

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
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMain(false);
    }
  }, [viewDate]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

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

  const timelineData = useMemo(() => {
    if (!selectedTimelineInfo) return { bookings: [] };
    const child = childrenData.find(c => c.student.id === selectedTimelineInfo.studentId);
    return { bookings: child?.bookings.filter(b => b.date === selectedTimelineInfo.date) || [] };
  }, [selectedTimelineInfo, childrenData]);

  const statusColors = { blue: 'bg-blue-400', green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

  // Filter students who have at least one booking on the selected day
  const displayedStudents = useMemo(() => {
    return childrenData.filter(item => 
      item.bookings.some(b => b.date === selectedDate)
    );
  }, [childrenData, selectedDate]);

  return (
    <div className={`space-y-8 pb-20 transition-all duration-500 ease-in-out ${(selectedTimelineInfo && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0'}`}>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 w-full ${isCalendarMaximized ? 'lg:w-full' : 'lg:max-w-xl'}`}>
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between bg-white gap-y-3">
            <div className="flex items-center space-x-1">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="px-2">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter text-center block w-20">{monthName}</span>
              </div>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setIsCalendarMaximized(!isCalendarMaximized)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
              </button>
              <button onClick={() => { setSelectedDate(hktToday); setViewDate(new Date()); }} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                {t('parent.go_today')}
              </button>
            </div>
          </div>

          <div className="px-6 py-5 bg-white select-none">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">{day}</div>
              ))}
            </div>
            <div className="space-y-1">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-7 gap-1 items-stretch">
                  {week.map((dateObj, dIdx) => {
                    if (!dateObj) return <div key={`empty-${dIdx}`} />;
                    const dateStr = dateObj.toLocaleDateString('en-CA');
                    const isSelected = selectedDate === dateStr;
                    const isTodayLocal = dateStr === hktToday;
                    const dayStatus = getDayStatusOverall(dateStr);
                    const studentStatuses = getStudentDetailedStatusesForDay(dateStr);
                    return (
                      <button key={dateStr} onClick={() => setSelectedDate(dateStr)} className={`flex flex-col items-center justify-start p-1.5 rounded-lg transition-all border font-black relative ${isCalendarMaximized ? 'min-h-[7.5rem]' : 'h-10'} ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white z-10 shadow-lg' : isTodayLocal ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'}`}>
                        <span className={`text-[11px] ${isCalendarMaximized ? 'mb-1 self-start ml-0.5' : ''}`}>{dateObj.getDate()}</span>
                        {isCalendarMaximized ? (
                          <div className="w-full flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar max-h-[5.5rem]">
                            {studentStatuses.map((s, i) => (
                              <div key={i} className={`flex items-center space-x-1.5 min-w-0 rounded px-1 py-0.5 ${isSelected ? 'bg-white/10' : 'bg-slate-50'}`}>
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10 ${statusColors[s.status]}`} />
                                <span className={`text-[9px] font-black truncate leading-none uppercase tracking-tight ${isSelected ? 'text-indigo-50' : 'text-slate-900'}`}>{s.name}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-12 animate-in fade-in duration-500">
        {displayedStudents.map((item) => (
          <PortalAttendanceCard 
            key={item.student.id} 
            data={{ ...item, bookings: item.bookings.filter(b => b.date === selectedDate) }} 
            isSelected={selectedTimelineInfo?.studentId === item.student.id && selectedTimelineInfo?.date === selectedDate}
            onSelect={() => { setSelectedTimelineInfo({ studentId: item.student.id, studentName: item.student.name, date: selectedDate }); setIsTimelineExpanded(true); }}
            getBookingStatus={getBookingStatus}
          />
        ))}
        {displayedStudents.length === 0 && !isLoadingMain && (
          <div className="col-span-full py-20 text-center bg-white border border-slate-200 rounded-[3rem]">
            <p className="text-slate-400 font-bold italic">{t('attendance.no_students')}</p>
          </div>
        )}
      </div>

      {selectedTimelineInfo && <TimelinePanel studentName={selectedTimelineInfo.studentName} bookings={timelineData.bookings} date={selectedTimelineInfo.date} isExpanded={isTimelineExpanded} onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)} />}
    </div>
  );
};

const PortalAttendanceCard: React.FC<{ 
  data: StudentDetailedData; 
  isSelected: boolean;
  onSelect: () => void;
  getBookingStatus: (b: Booking) => BookingStatus;
}> = ({ data, isSelected, onSelect, getBookingStatus }) => {
  const { student, bookings } = data;
  const { t } = useTranslation();
  const isCurrentlyInClass = bookings.some(b => b.check_in && !b.check_out);
  const statusColors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', red: 'bg-rose-50 text-rose-600', yellow: 'bg-amber-50 text-amber-600' };

  return (
    <div onClick={onSelect} className={`relative bg-white border-2 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.99] group ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100'}`}>
      <div className={`p-5 border-b transition-colors ${isSelected ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-50'} flex items-start justify-between`}>
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-base font-black text-slate-900 leading-tight truncate">{student.name}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t('students.sort_level')}: {student.level || t('parent.unset')}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-wider transition-all ${isCurrentlyInClass ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
          {isCurrentlyInClass ? t('parent.in_class').toUpperCase() : t('parent.away').toUpperCase()}
        </span>
      </div>
      <div className="p-5 space-y-3">
        <label className="block text-[8px] font-black text-slate-300 uppercase tracking-widest">{t('card.todays_schedule')}</label>
        {bookings.map(b => (
          <div key={b.id} className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-slate-50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-slate-900 truncate">{b.courses?.name}</span>
              <span className={`${statusColors[getBookingStatus(b)]} px-1.5 py-0.5 rounded text-[7px] font-black uppercase`}>{t(`status.${{red:'missed',yellow:'partial',green:'attended',blue:'future'}[getBookingStatus(b)]}`)}</span>
            </div>
            {b.teachers?.name && (
              <p className="text-[8px] font-bold text-slate-500 truncate mb-1">{t('bookings.teacher')}: {b.teachers.name}</p>
            )}
            <div className="flex items-center justify-between text-[9px]">
              <span className="font-mono font-black text-indigo-600">{b.start.slice(0, 5)} - {b.end.slice(0, 5)}</span>
              {b.check_in && (
                <span className="font-mono font-bold text-emerald-600">
                  {t('timeline.actual').toUpperCase()}: {b.check_in.slice(0, 5)} — {b.check_out ? b.check_out.slice(0, 5) : '--:--'}
                </span>
              )}
            </div>
          </div>
        ))}
        {bookings.length === 0 && <p className="text-[10px] text-slate-400 font-bold italic text-center py-2">{t('card.no_bookings')}</p>}
      </div>
    </div>
  );
};

export default PortalAttendance;