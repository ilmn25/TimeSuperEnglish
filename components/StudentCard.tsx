import React, { useCallback } from 'react';
import { StudentGroupedData, Booking, Attendance } from '../types';
import AttendanceRecord from './AttendanceRecord';
import { useTranslation } from 'react-i18next';

interface StudentCardProps {
  data: StudentGroupedData;
  onCheckIn: (studentId: string) => void;
  onCheckOut: (studentId: string) => void;
  onOpenManualModal: (studentId: string, studentName: string) => void;
  onRemoveAttendance: (id: string) => void;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (studentId: string) => void;
}

const getHKTNow = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));
};

const StudentCard: React.FC<StudentCardProps> = ({ 
  data, onCheckIn, onCheckOut, onOpenManualModal, onRemoveAttendance, isToday, isSelected, onSelect
}) => {
  const { student, bookings, attendances } = data;
  const { t } = useTranslation();

  const unfinishedRecord = attendances.find(a => !a.end);

  const getContrastColor = (hexcolor: string) => {
    if (!hexcolor) return '#64748b';
    const hex = hexcolor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#ffffff';
  };

  const getBookingStatus = useCallback((booking: Booking, dayAttendances: Attendance[]) => {
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

  const statusColors = { blue: 'bg-blue-400 text-blue-500', green: 'bg-green-500 text-green-600', red: 'bg-red-500 text-red-500' };

  return (
    <div 
      onClick={() => onSelect(student.id)}
      className={`relative bg-white border-2 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.99] group ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-50 bg-indigo-50/5' : 'border-slate-100'}`}
    >
      <div className={`p-6 border-b transition-colors ${isSelected ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-50'} flex items-start justify-between`}>
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors truncate">{student.name}</h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('students.sort_level')}: {student.level || 'N/A'}</span>
          </div>
        </div>
        <div className="shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm transition-all ${unfinishedRecord ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {unfinishedRecord ? t('parent.in_class').toUpperCase() : t('parent.away').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('card.todays_schedule')}</label>
          <div className="grid gap-2.5">
            {bookings.map(booking => {
              const status = getBookingStatus(booking, attendances);
              const courseColor = booking.courses?.color || '#f1f5f9';
              const textColor = getContrastColor(courseColor);
              
              return (
                <div key={booking.id} className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 min-w-0">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-sm shrink-0"
                    style={{ backgroundColor: courseColor, color: textColor }}
                  >
                     {booking.courses?.name?.slice(0, 1) || 'B'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">{booking.courses?.name}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono font-bold tracking-tighter">{booking.start.slice(0, 5)} - {booking.end.slice(0, 5)}</span>
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
            {bookings.length === 0 && <p className="text-[10px] text-slate-400 italic py-2">{t('card.no_bookings')}</p>}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('card.log')}</label>
            <button onClick={() => onOpenManualModal(student.id, student.name)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter">{t('card.manual')}</button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto no-scrollbar">
            {attendances.map(a => (
              <AttendanceRecord key={a.id} attendance={a} onRemove={onRemoveAttendance} isToday={isToday} />
            ))}
            {attendances.length === 0 && <p className="text-[10px] text-slate-300 italic">{t('card.no_activity')}</p>}
          </div>

          {isToday && (
            <div className="flex space-x-2 pt-1">
              {!unfinishedRecord ? (
                <button onClick={() => onCheckIn(student.id)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-indigo-100">{t('card.check_in')}</button>
              ) : (
                <button onClick={() => onCheckOut(student.id)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-orange-100">{t('card.check_out')}</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCard;