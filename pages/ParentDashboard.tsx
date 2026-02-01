
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Student, Booking, Attendance } from '../types';
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

const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

type BookingStatus = 'blue' | 'green' | 'yellow' | 'red';

interface StudentDetailedData {
  student: Student & { organization_name?: string };
  bookings: Booking[];
  attendances: Attendance[];
  isLoading: boolean;
}

const ParentDashboard: React.FC = () => {
  const hktToday = getHKTDateString();
  const [viewDate, setViewDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState<string>(hktToday);
  const [childrenData, setChildrenData] = useState<StudentDetailedData[]>([]);
  const [isLoadingMain, setIsLoadingMain] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const { t } = useTranslation();

  // Edit State
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
            p.student.id === item.student.id 
              ? { ...p, bookings, attendances, isLoading: false } 
              : p
          ));
        } catch (err) {
          console.error(`Failed to fetch data for ${item.student.name}`, err);
          setChildrenData(prev => prev.map(p => 
            p.student.id === item.student.id 
              ? { ...p, isLoading: false } 
              : p
          ));
        }
      });

      await Promise.all(updatePromises);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard.");
      console.error(err);
    } finally {
      setIsLoadingMain(false);
    }
  }, [viewDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleEditStudent = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setEditingStudent(student);
    setEditFormData({
      name: student.name || '',
      contact: student.contact || '',
      level: student.level || ''
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    setIsUpdating(true);
    try {
      const orgId = (editingStudent as any).org_id;
      if (!orgId) throw new Error("Organization ID not found for student.");

      await api.updateStudent(
        orgId, 
        editingStudent.id, 
        editFormData.name, 
        editFormData.contact, 
        editFormData.level || undefined
      );
      
      setChildrenData(prev => prev.map(item => 
        item.student.id === editingStudent.id 
          ? { ...item, student: { ...item.student, ...editFormData } }
          : item
      ));
      
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
  };

  const getDayStatus = (dateStr: string): BookingStatus | null => {
    const allStatuses: BookingStatus[] = [];
    childrenData.forEach(child => {
      const dayBookings = child.bookings.filter(b => b.date === dateStr);
      if (dayBookings.length === 0) return;
      const dayAttendances = child.attendances.filter(a => a.date === dateStr);
      dayBookings.forEach(b => {
        allStatuses.push(getBookingStatus(b, dayAttendances));
      });
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

  const statusColors = { blue: 'bg-blue-400', green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

  const selectedStudentIdData = useMemo(() => {
    return childrenData.find(d => d.student.id === selectedStudentId);
  }, [childrenData, selectedStudentId]);

  const filteredChildrenData = useMemo(() => {
    return childrenData.map(child => ({
      ...child,
      bookings: child.bookings.filter(b => b.date === selectedDate),
      attendances: child.attendances.filter(a => a.date === selectedDate)
    }));
  }, [childrenData, selectedDate]);

  const layoutPaddingClass = (selectedStudentIdData && isTimelineExpanded) ? 'xl:pr-96' : 'pr-0';

  if (isLoadingMain && childrenData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-10 pb-20 transition-all duration-500 ease-in-out ${layoutPaddingClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('parent.dashboard')}</h2>
          <p className="text-slate-500 mt-1">{t('parent.subtitle')}</p>
        </div>
      </div>

      {/* Monthly Calendar View */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
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
          <button 
            onClick={() => { setSelectedDate(hktToday); setViewDate(new Date()); }}
            className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
          >
            {t('parent.go_today')}
          </button>
        </div>

        <div className="px-6 py-5 bg-white">
          <div className="max-w-xl mx-auto">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">{day}</div>
              ))}
            </div>
            <div className="space-y-1">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-7 gap-1 items-center">
                  {week.map((dateObj, dIdx) => {
                    if (!dateObj) return <div key={`empty-${dIdx}`} />;
                    const dateStr = dateObj.toLocaleDateString('en-CA');
                    const isSelected = selectedDate === dateStr;
                    const isToday = dateStr === hktToday;
                    const dayStatus = getDayStatus(dateStr);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`flex flex-col items-center justify-center h-10 rounded-lg transition-all border text-[11px] font-black relative ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white z-10' 
                          : isToday ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                        }`}
                      >
                        <span>{dateObj.getDate()}</span>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
        {filteredChildrenData.map((item) => (
          <ChildCard 
            key={item.student.id} 
            data={item} 
            onEdit={handleEditStudent} 
            isSelected={selectedStudentId === item.student.id}
            onSelect={() => setSelectedStudentId(item.student.id)}
            currentDate={selectedDate}
            getBookingStatus={getBookingStatus}
          />
        ))}
      </div>

      {selectedStudentId && selectedStudentIdData && (
        <TimelinePanel 
          studentName={selectedStudentIdData.student.name} 
          bookings={selectedStudentIdData.bookings.filter(b => b.date === selectedDate)} 
          attendances={selectedStudentIdData.attendances.filter(a => a.date === selectedDate)} 
          date={selectedDate}
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
                <input 
                  type="text" 
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Student Name"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t('students.sort_level')}</label>
                <select 
                  value={editFormData.level}
                  onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                >
                  <option value="">{t('students.select')}</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t('students.contact')}</label>
                <input 
                  type="text" 
                  required
                  value={editFormData.contact}
                  onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                  placeholder="e.g. Phone Number"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setEditingStudent(null)} 
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm flex items-center"
                >
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
