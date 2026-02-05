import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Booking, StudentGroupedData, Student } from '../types';
import StudentCard from '../components/StudentCard';
import TimelinePanel from '../components/TimelinePanel';
import ManualAttendanceModal from '../components/ManualAttendanceModal';
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

type BookingStatus = 'blue' | 'green' | 'yellow' | 'red';

const AttendancePage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const hktToday = getHKTDateString();
  const { t } = useTranslation();
  
  const [date, setDate] = useState<string>(hktToday);
  const [viewDate, setViewDate] = useState(new Date());
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [manualModalConfig, setManualModalConfig] = useState<{ 
    bookingId: string, 
    name: string, 
    check_in?: string | null, 
    check_out?: string | null,
    scheduledStart?: string,
    scheduledEnd?: string
  } | null>(null);

  const isToday = date === hktToday;
  const monthName = viewDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

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

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const startDate = new Date(year, month, 1).toLocaleDateString('en-CA');
      const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

      const bookings = await api.getAllBookings(orgId, { startDate, endDate });
      setMonthBookings(bookings);
    } catch (err: any) {
      setError(err.message || 'Could not load data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, viewDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dailyGroupedData = useMemo(() => {
    const studentMap = new Map<string, StudentGroupedData>();
    const dayBookings = monthBookings.filter(b => b.date === date);

    dayBookings.forEach((b) => {
      const student = b.students as Student;
      if (!student) return;
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          student,
          bookings: []
        });
      }
      studentMap.get(student.id)!.bookings.push(b);
    });

    return Array.from(studentMap.values()).sort((a, b) => 
      a.student.name.localeCompare(b.student.name)
    );
  }, [date, monthBookings]);

  const stats = useMemo(() => {
    const total = dailyGroupedData.length;
    const currentlyIn = dailyGroupedData.filter(d => d.bookings.some(b => b.check_in && !b.check_out)).length;
    return { total, currentlyIn };
  }, [dailyGroupedData]);

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
  };

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

  const getDayStatus = (dateStr: string): BookingStatus | null => {
    const dayBookings = monthBookings.filter(b => b.date === dateStr);
    if (dayBookings.length === 0) return null;
    const statuses = dayBookings.map(b => getBookingStatus(b));
    if (statuses.every(s => s === 'blue')) return 'blue';
    if (statuses.some(s => s === 'red')) return 'red';
    return 'green';
  };

  const getStudentDetailedStatusesForDay = (dateStr: string) => {
    const dayBookings = monthBookings.filter(b => b.date === dateStr);
    const studentMap = new Map<string, { name: string; status: BookingStatus }>();
    dayBookings.forEach(b => {
      const student = b.students as Student;
      if (!student) return;
      const current = studentMap.get(student.id);
      const status = getBookingStatus(b);
      if (!current || (status === 'red' && current.status !== 'red')) {
        studentMap.set(student.id, { name: student.name, status });
      }
    });
    return Array.from(studentMap.values());
  };

  const handleCheckIn = async (bookingId: string) => {
    if (!orgId) return;
    try {
      const now = new Date().toISOString();
      await api.updateBooking(orgId, bookingId, { check_in: now });
      loadData();
    } catch (err) { alert('Check-in error'); }
  };

  const handleCheckOut = async (bookingId: string) => {
    if (!orgId) return;
    try {
      const now = new Date().toISOString();
      await api.updateBooking(orgId, bookingId, { check_out: now });
      loadData();
    } catch (err) { alert('Check-out error'); }
  };

  const handleManualAdd = async (bookingId: string, start: string, end: string) => {
    if (!orgId) return;
    try {
      const booking = monthBookings.find(b => b.id === bookingId);
      if (!booking) return;
      const check_in = `${booking.date}T${start}:00Z`;
      const check_out = `${booking.date}T${end}:00Z`;
      await api.updateBooking(orgId, bookingId, { check_in, check_out });
      setManualModalConfig(null);
      loadData();
    } catch (err) { alert('Manual entry error'); }
  };

  const handleClearAttendance = async (bookingId: string) => {
    if (!orgId) return;
    try {
      await api.updateBooking(orgId, bookingId, { check_in: null, check_out: null });
      setManualModalConfig(null);
      loadData();
    } catch (err) { alert('Clear error'); }
  };

  const selectedStudentData = useMemo(() => dailyGroupedData.find(d => d.student.id === selectedStudentId), [dailyGroupedData, selectedStudentId]);

  const gridColumnsClass = (selectedStudentData && isTimelineExpanded) 
    ? 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3' 
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

  const statusColors = { blue: 'bg-blue-400', green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

  return (
    <div className={`space-y-6 pb-20 transition-all duration-500 ease-in-out ${(selectedStudentData && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0'}`}> 
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('nav.attendance')}</h2>
          <p className="text-slate-500 text-xs font-medium">{t('attendance.summary')}</p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 w-full ${isCalendarMaximized ? 'lg:w-full' : 'lg:max-w-xl'}`}>
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between bg-white gap-y-3">
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
            <button 
              onClick={() => { setDate(hktToday); setViewDate(new Date()); }}
              className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            >
              {t('attendance.today')}
            </button>
          </div>

          <div className="px-6 py-5 bg-white">
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
                      const isSelected = date === dateStr;
                      const isTodayLocal = dateStr === hktToday;
                      const dayStatus = getDayStatus(dateStr);
                      const studentStatuses = getStudentDetailedStatusesForDay(dateStr);

                      return (
                        <button
                          key={dateStr}
                          onClick={() => setDate(dateStr)}
                          className={`flex flex-col items-center justify-start p-1.5 rounded-lg transition-all border font-black relative group ${
                            isCalendarMaximized ? 'min-h-[7.5rem]' : 'h-10'
                          } ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white z-10 shadow-lg shadow-indigo-100' 
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

        <div className="flex items-center space-x-4 bg-white border border-slate-200 rounded-[2rem] px-6 py-4 shadow-sm self-start">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('attendance.booked')}</span>
            <span className="text-xl font-black text-slate-900 leading-none">{stats.total}</span>
          </div>
          <div className="w-px h-6 bg-slate-100" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">{t('attendance.here')}</span>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black text-emerald-600 leading-none">{stats.currentlyIn}</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={`grid ${gridColumnsClass} gap-6 sm:gap-8`}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="bg-white border border-slate-200 rounded-3xl h-[450px] animate-pulse" />)}
        </div>
      ) : (
        <div className={`grid ${gridColumnsClass} gap-6 sm:gap-8 transition-all duration-500 ease-in-out`}>
          {dailyGroupedData.map(studentGroup => (
            <StudentCard 
              key={studentGroup.student.id} 
              data={studentGroup}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onOpenManualModal={(bookingId, name) => {
                const b = monthBookings.find(x => x.id === bookingId);
                setManualModalConfig({ 
                  bookingId, 
                  name, 
                  check_in: b?.check_in, 
                  check_out: b?.check_out,
                  scheduledStart: b?.start,
                  scheduledEnd: b?.end
                });
              }}
              isToday={isToday}
              isSelected={selectedStudentId === studentGroup.student.id}
              onSelect={setSelectedStudentId}
            />
          ))}
          {dailyGroupedData.length === 0 && !error && (
            <div className="col-span-full py-20 text-center bg-white border border-slate-200 rounded-[3rem]">
              <p className="text-slate-400 font-bold italic">{t('attendance.no_students')}</p>
            </div>
          )}
        </div>
      )}

      {selectedStudentId && selectedStudentData && (
        <TimelinePanel 
          studentName={selectedStudentData.student.name} 
          bookings={selectedStudentData.bookings} 
          date={date}
          isExpanded={isTimelineExpanded}
          onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)}
        />
      )}
      
      {manualModalConfig && (
        <ManualAttendanceModal 
          isOpen={true} 
          studentName={manualModalConfig.name} 
          initialStart={manualModalConfig.check_in}
          initialEnd={manualModalConfig.check_out}
          scheduledStart={manualModalConfig.scheduledStart}
          scheduledEnd={manualModalConfig.scheduledEnd}
          onClose={() => setManualModalConfig(null)} 
          onSubmit={(start, end) => handleManualAdd(manualModalConfig.bookingId, start, end)} 
          onClear={() => handleClearAttendance(manualModalConfig.bookingId)}
        />
      )}
    </div>
  );
};

export default AttendancePage;