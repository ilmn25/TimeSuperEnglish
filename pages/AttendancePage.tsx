
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Booking, Attendance, StudentGroupedData, Student } from '../types';
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
  const hktToday = getHKTDateString();
  const { t } = useTranslation();
  
  // Date and Monthly View State
  const [date, setDate] = useState<string>(hktToday);
  const [viewDate, setViewDate] = useState(new Date());
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
  
  // Month-wide data for calendar dots
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [monthAttendances, setMonthAttendances] = useState<Attendance[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [manualModalConfig, setManualModalConfig] = useState<{ id: string, name: string } | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const isToday = date === hktToday;
  const monthName = viewDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

  // Calendar Grid Generation
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

  // Precise status logic for a single booking
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

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const startDate = new Date(year, month, 1).toLocaleDateString('en-CA');
      const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

      const [bookings, attendances] = await Promise.all([
        api.getAllBookings(orgId, { startDate, endDate }),
        api.getAllAttendances(orgId, { startDate, endDate })
      ]);

      const todayString = getHKTDateString();
      const staleAttendances = attendances.filter((a: Attendance) => !a.end && a.date < todayString);
      
      if (staleAttendances.length > 0) {
        await Promise.all(staleAttendances.map((a: Attendance) => 
          api.updateAttendance(orgId, a.id, { end: '23:59:59' })
        ));
        const updatedAttendances = await api.getAllAttendances(orgId, { startDate, endDate });
        setMonthAttendances(updatedAttendances);
      } else {
        setMonthAttendances(attendances);
      }
      
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
    const dayAttendances = monthAttendances.filter(a => a.date === date);

    dayBookings.forEach((b) => {
      const student = b.students as Student;
      if (!student) return;
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          student,
          bookings: [],
          attendances: []
        });
      }
      studentMap.get(student.id)!.bookings.push(b);
    });

    dayAttendances.forEach((a) => {
      if (studentMap.has(a.student_id)) {
        studentMap.get(a.student_id)!.attendances.push(a);
      }
    });

    return Array.from(studentMap.values());
  }, [date, monthBookings, monthAttendances]);

  const stats = useMemo(() => {
    const total = dailyGroupedData.length;
    const present = dailyGroupedData.filter(d => d.attendances.length > 0).length;
    const currentlyIn = dailyGroupedData.filter(d => d.attendances.some(a => !a.end)).length;
    return { total, present, currentlyIn };
  }, [dailyGroupedData]);

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
  };

  const getDayStatus = (dateStr: string): BookingStatus | null => {
    const dayBookings = monthBookings.filter(b => b.date === dateStr);
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
    const dayBookings = monthBookings.filter(b => b.date === dateStr);
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
        // Preference for "worse" status to show issues in calendar
        const priority = { red: 3, yellow: 2, green: 1, blue: 0 };
        if (priority[status] > priority[current.status]) {
          studentMap.set(student.id, { name: student.name, status });
        }
      }
    });
    return Array.from(studentMap.values());
  };

  const statusColors = { blue: 'bg-blue-400', green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

  const handleCheckIn = async (studentId: string) => {
    if (!orgId) return;
    try { await api.checkIn(orgId, studentId, date); loadData(); } catch (err) { alert('Check-in error'); }
  };

  const handleCheckOut = async (studentId: string) => {
    if (!orgId) return;
    try { await api.checkOut(orgId, studentId, date); loadData(); } catch (err) { alert('Check-out error'); }
  };

  const handleManualAdd = async (studentId: string, start: string, end: string) => {
    if (!orgId) return;
    try {
      await api.createAttendanceManual(orgId, { student_id: studentId, date, start, end });
      setManualModalConfig(null);
      loadData();
    } catch (err) { alert('Manual entry error'); }
  };

  const handleRemoveAttendance = async () => {
    if (!confirmDelete || !orgId) return;
    setIsProcessing(true);
    try { await api.deleteAttendance(orgId, confirmDelete); setConfirmDelete(null); loadData(); } catch (err) { alert('Removal error'); } finally { setIsProcessing(false); }
  };

  const selectedStudentData = useMemo(() => dailyGroupedData.find(d => d.student.id === selectedStudentId), [dailyGroupedData, selectedStudentId]);

  const layoutPaddingClass = (selectedStudentData && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0';
  const gridColumnsClass = (selectedStudentData && isTimelineExpanded) 
    ? 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3' 
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

  return (
    <div className={`space-y-6 pb-20 transition-all duration-500 ease-in-out ${layoutPaddingClass}`}> 
      
      {/* Monthly Calendar Navigation Grid */}
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
              title={isCalendarMaximized ? "Minimize" : "Maximize"}
            >
              {isCalendarMaximized ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
              )}
            </button>
            <button 
              onClick={() => { setDate(hktToday); setViewDate(new Date()); }}
              className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            >
              {t('attendance.today')}
            </button>
          </div>
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
                                <span className={`text-[9px] font-black truncate leading-none uppercase tracking-tight ${isSelected ? 'text-indigo-100' : 'text-slate-500 group-hover:text-inherit'}`}>
                                  {s.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          dayStatus && <div className={`w-1 h-1 rounded-full mt-0.5 ${statusColors[dayStatus]}`} />
                        )}

                        {isCalendarMaximized && studentStatuses.length > 0 && (
                          <div className={`absolute bottom-1 right-1 opacity-40 text-[8px] font-black ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                            {studentStatuses.length}
                          </div>
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

      {/* Foldable Stats Bar */}
      <div className="bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden transition-all duration-300 ease-in-out">
        <button 
          onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center space-x-4">
             <div className="flex flex-col items-start">
                <span className="text-indigo-400 text-[9px] font-black uppercase tracking-widest mb-0.5">{date}</span>
                <h3 className="text-white text-lg font-black tracking-tight">{t('attendance.summary')}</h3>
             </div>
             {!isSummaryExpanded && (
               <div className="flex items-center space-x-3 ml-4 animate-in fade-in slide-in-from-left-2">
                 <div className="flex items-center space-x-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                   <span className="text-white text-xs font-black">{stats.total}</span>
                 </div>
                 <div className="flex items-center space-x-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                   <span className="text-indigo-400 text-xs font-black">{stats.present}</span>
                 </div>
                 <div className="flex items-center space-x-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                   <span className="text-green-400 text-xs font-black">{stats.currentlyIn}</span>
                 </div>
               </div>
             )}
          </div>
          <div className={`p-2 rounded-full bg-slate-800 text-slate-400 transition-transform duration-300 ${isSummaryExpanded ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <div className={`transition-all duration-300 ease-in-out ${isSummaryExpanded ? 'max-h-60 opacity-100 mb-6 px-6' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="flex flex-row items-center justify-around sm:justify-center gap-8 sm:gap-24 py-4 border-t border-slate-800/50">
             <div className="text-center group">
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-white transition-colors">{t('attendance.booked')}</p>
                <p className="text-white text-3xl font-black">{stats.total}</p>
             </div>
             <div className="text-center group">
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">{t('attendance.arrived')}</p>
                <p className="text-indigo-400 text-3xl font-black">{stats.present}</p>
             </div>
             <div className="text-center group">
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-green-400 transition-colors">{t('attendance.here')}</p>
                <p className="text-green-400 text-3xl font-black">{stats.currentlyIn}</p>
             </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-700 text-sm font-medium flex items-center space-x-2 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="flex-1"><span className="font-bold">{t('attendance.error')}:</span> {error}</div>
          <button onClick={() => loadData()} className="text-xs font-black uppercase underline tracking-widest">{t('attendance.retry')}</button>
        </div>
      )}

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
              onOpenManualModal={(id, name) => setManualModalConfig({ id, name })}
              onRemoveAttendance={setConfirmDelete}
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
          attendances={selectedStudentData.attendances} 
          date={date}
          isExpanded={isTimelineExpanded}
          onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)}
        />
      )}
      
      {manualModalConfig && <ManualAttendanceModal isOpen={true} studentName={manualModalConfig.name} onClose={() => setManualModalConfig(null)} onSubmit={(start, end) => handleManualAdd(manualModalConfig.id, start, end)} />}
      
      {confirmDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('attendance.remove_title')}</h3>
            <p className="text-slate-500 text-sm mb-8">{t('attendance.remove_msg')}</p>
            <div className="flex space-x-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors">{t('common.cancel')}</button>
              <button onClick={handleRemoveAttendance} className="flex-1 px-6 py-3 text-sm font-bold text-white rounded-2xl bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center">
                {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('common.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
