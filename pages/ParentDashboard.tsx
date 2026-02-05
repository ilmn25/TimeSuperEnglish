import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { Student, Booking, Course } from '../types';
import TimelinePanel from '../components/TimelinePanel';
import { useTranslation } from 'react-i18next';
import ManualAttendanceModal from '../components/ManualAttendanceModal';

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
  const [filterStudent, setFilterStudent] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [selectedTimelineInfo, setSelectedTimelineInfo] = useState<{ studentId: string; studentName: string; date: string } | null>(null);
  const [manualModalConfig, setManualModalConfig] = useState<{ bookingId: string, name: string, check_in?: string | null, check_out?: string | null } | null>(null);
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', contact: '', level: '' });
  const [isUpdating, setIsUpdating] = useState(false);

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

      const updatePromises = detailedStudents.map(async (item) => {
        try {
          const bookings = await api.getStudentBookings(item.student.id, { startDate, endDate });
          setChildrenData(prev => prev.map(p => 
            p.student.id === item.student.id ? { ...p, bookings, isLoading: false } : p
          ));
        } catch (err) {
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

  const handleCheckIn = async (bookingId: string) => {
    const student = childrenData.find(c => c.bookings.some(b => b.id === bookingId))?.student;
    if (!student?.org_id) return;
    try {
      await api.updateBooking(student.org_id, bookingId, { check_in: new Date().toISOString() });
      fetchDashboardData();
    } catch (err) { alert('Check-in error'); }
  };

  const handleCheckOut = async (bookingId: string) => {
    const student = childrenData.find(c => c.bookings.some(b => b.id === bookingId))?.student;
    if (!student?.org_id) return;
    try {
      await api.updateBooking(student.org_id, bookingId, { check_out: new Date().toISOString() });
      fetchDashboardData();
    } catch (err) { alert('Check-out error'); }
  };

  const handleManualAdd = async (bookingId: string, start: string, end: string) => {
    const child = childrenData.find(c => c.bookings.some(b => b.id === bookingId));
    if (!child?.student.org_id) return;
    try {
      const booking = child.bookings.find(b => b.id === bookingId);
      if (!booking) return;
      const check_in = `${booking.date}T${start}:00Z`;
      const check_out = `${booking.date}T${end}:00Z`;
      await api.updateBooking(child.student.org_id, bookingId, { check_in, check_out });
      setManualModalConfig(null);
      fetchDashboardData();
    } catch (err) { alert('Manual entry error'); }
  };

  const handleClearAttendance = async (bookingId: string) => {
    const child = childrenData.find(c => c.bookings.some(b => b.id === bookingId));
    if (!child?.student.org_id) return;
    try {
      await api.updateBooking(child.student.org_id, bookingId, { check_in: null, check_out: null });
      setManualModalConfig(null);
      fetchDashboardData();
    } catch (err) { alert('Clear error'); }
  };

  const processedAllBookings = useMemo(() => {
    const all = childrenData.flatMap(c => c.bookings.map(b => ({ 
      ...b, 
      students: c.student,
      calculatedStatus: getBookingStatus(b) 
    })));

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
      return sortOrder === 'asc' ? (dateCompare || timeCompare) : -(dateCompare || timeCompare);
    });
  }, [childrenData, filterStudent, filterCourse, selectedDates, filterStatus, sortOrder, getBookingStatus]);

  const getDayStatusOverall = (dateStr: string): BookingStatus | null => {
    const allStatuses: BookingStatus[] = [];
    childrenData.forEach(child => {
      const dayBookings = child.bookings.filter(b => b.date === dateStr);
      dayBookings.forEach(b => allStatuses.push(getBookingStatus(b)));
    });
    if (allStatuses.length === 0) return null;
    if (allStatuses.every(s => s === 'blue')) return 'blue';
    if (allStatuses.some(s => s === 'red')) return 'red';
    return 'green';
  };

  const timelineData = useMemo(() => {
    if (!selectedTimelineInfo) return { bookings: [] };
    const child = childrenData.find(c => c.student.id === selectedTimelineInfo.studentId);
    if (!child) return { bookings: [] };
    return { bookings: child.bookings.filter(b => b.date === selectedTimelineInfo.date) };
  }, [selectedTimelineInfo, childrenData]);

  const statusColors = { blue: 'bg-blue-400', green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

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

      <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 ${isCalendarMaximized ? 'max-w-none' : 'max-w-3xl mx-auto'}`}>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-1">
            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
            <div className="px-2"><span className="text-sm font-black text-slate-800 uppercase tracking-tighter block w-20">{monthName}</span></div>
            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
          </div>
          <button onClick={() => { setSelectedDate(hktToday); setViewDate(new Date()); }} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase border border-slate-200">{t('parent.go_today')}</button>
        </div>

        <div className="px-6 py-5 bg-white select-none">
          <div className="mx-auto">
            <div className="grid grid-cols-[24px_repeat(7,1fr)] gap-1 mb-2">
              <div />{WEEKDAYS.map(day => (<div key={day} className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">{day}</div>))}
            </div>
            <div className="space-y-1">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-[24px_repeat(7,1fr)] gap-1 items-stretch">
                  <div className="h-7 w-5" />
                  {week.map((dateObj, dIdx) => {
                    if (!dateObj) return <div key={`empty-${dIdx}`} />;
                    const dateStr = dateObj.toLocaleDateString('en-CA');
                    const isSelected = activeTab === 'attendance' ? selectedDate === dateStr : selectedDates.includes(dateStr);
                    const dayStatus = getDayStatusOverall(dateStr);
                    return (
                      <button key={dateStr} onClick={() => { if (activeTab === 'attendance') setSelectedDate(dateStr); }} className={`flex flex-col items-center justify-start p-1.5 rounded-lg border font-black transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500'}`}>
                        <span className="text-[11px]">{dateObj.getDate()}</span>
                        {dayStatus && <div className={`w-1 h-1 rounded-full mt-0.5 ${statusColors[dayStatus]}`} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'attendance' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12 animate-in fade-in duration-500">
          {childrenData.map((item) => (
            <ChildCard 
              key={item.student.id} 
              data={{ ...item, bookings: item.bookings.filter(b => b.date === selectedDate) }} 
              onEdit={(e, s) => { e.stopPropagation(); setEditingStudent(s); }} 
              isSelected={selectedTimelineInfo?.studentId === item.student.id && selectedTimelineInfo?.date === selectedDate}
              onSelect={() => { setSelectedTimelineInfo({ studentId: item.student.id, studentName: item.student.name, date: selectedDate }); setIsTimelineExpanded(true); }}
              currentDate={selectedDate}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onOpenManual={(id) => {
                const b = item.bookings.find(x => x.id === id);
                setManualModalConfig({ bookingId: id, name: item.student.name, check_in: b?.check_in, check_out: b?.check_out });
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
           <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{t('bookings.date')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{t('bookings.time')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{t('bookings.student')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{t('bookings.course')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{t('bookings.status')}</th>
                </tr>
              </thead>
              <tbody>
                {processedAllBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedTimelineInfo({ studentId: b.student_id, studentName: b.students?.name || '', date: b.date }); setIsTimelineExpanded(true); }}>
                    <td className="px-6 py-4 text-xs font-black">{b.date}</td>
                    <td className="px-6 py-4 text-xs font-mono font-black text-indigo-600">{b.start.slice(0,5)} - {b.end.slice(0,5)}</td>
                    <td className="px-6 py-4 text-xs font-bold">{b.students?.name}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">{b.courses?.name}</td>
                    <td className="px-6 py-4"><div className={`w-2 h-2 rounded-full ${statusColors[b.calculatedStatus]}`} /></td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {selectedTimelineInfo && <TimelinePanel studentName={selectedTimelineInfo.studentName} bookings={timelineData.bookings} attendances={[]} date={selectedTimelineInfo.date} isExpanded={isTimelineExpanded} onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)} />}
      {manualModalConfig && (
        <ManualAttendanceModal 
          isOpen={true} 
          studentName={manualModalConfig.name} 
          initialStart={manualModalConfig.check_in}
          initialEnd={manualModalConfig.check_out}
          onClose={() => setManualModalConfig(null)} 
          onSubmit={(start, end) => handleManualAdd(manualModalConfig.bookingId, start, end)} 
          onClear={() => handleClearAttendance(manualModalConfig.bookingId)}
        />
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
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onOpenManual: (id: string) => void;
}> = ({ data, onEdit, isSelected, onSelect, currentDate, onCheckIn, onCheckOut, onOpenManual }) => {
  const { student, bookings, isLoading } = data;
  const { t } = useTranslation();
  const isCurrentlyInClass = bookings.some(b => b.check_in && !b.check_out);

  return (
    <div onClick={onSelect} className={`bg-white border rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col transition-all cursor-pointer ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
      <div className={`p-8 border-b ${isSelected ? 'bg-indigo-50/20' : 'bg-slate-50/50'}`}>
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">{student.name.charAt(0)}</div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-2xl font-black text-slate-900 truncate">{student.name}</h3>
              <button onClick={(e) => onEdit(e, student)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase">{student.level || t('parent.unset')}</div>
              {isCurrentlyInClass && <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase animate-pulse">{t('parent.in_class')}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {bookings.map((b) => (
          <div key={b.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{b.courses?.name}</p>
                <span className="text-[10px] font-bold text-slate-400 font-mono">{b.start.slice(0, 5)} - {b.end.slice(0, 5)}</span>
              </div>
              <button onClick={() => onOpenManual(b.id)} className="p-1.5 text-slate-300 hover:text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></button>
            </div>
            
            {b.check_in && (
              <div className="text-[10px] font-mono font-bold text-indigo-600 mb-3">{b.check_in.slice(11, 16)} — {b.check_out ? b.check_out.slice(11, 16) : '--:--'}</div>
            )}

            <div className="flex space-x-2">
              {!b.check_in ? (
                <button onClick={() => onCheckIn(b.id)} className="flex-1 bg-indigo-600 text-white font-black py-2 rounded-xl text-[9px] uppercase tracking-widest">{t('card.check_in')}</button>
              ) : !b.check_out ? (
                <button onClick={() => onCheckOut(b.id)} className="flex-1 bg-orange-500 text-white font-black py-2 rounded-xl text-[9px] uppercase tracking-widest">{t('card.check_out')}</button>
              ) : null}
            </div>
          </div>
        ))}
        {bookings.length === 0 && !isLoading && <p className="text-slate-400 text-xs italic text-center py-8">{t('parent.no_bookings')}</p>}
      </div>
    </div>
  );
};

export default ParentDashboard;