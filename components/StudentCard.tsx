import React, { useCallback } from 'react';
import { StudentGroupedData, Booking } from '../types';
import { useTranslation } from 'react-i18next';

interface StudentCardProps {
  data: StudentGroupedData;
  onCheckIn: (bookingId: string) => void;
  onCheckOut: (bookingId: string) => void;
  onOpenManualModal: (bookingId: string, studentName: string) => void;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (studentId: string) => void;
}

const getHKTNow = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));
};

const StudentCard: React.FC<StudentCardProps> = ({ 
  data, onCheckIn, onCheckOut, onOpenManualModal, isToday, isSelected, onSelect
}) => {
  const { student, bookings } = data;
  const { t } = useTranslation();

  // Check if any booking is currently "in class"
  const isCurrentlyInClass = bookings.some(b => b.check_in && !b.check_out);

  const getContrastColor = (hexcolor: string) => {
    if (!hexcolor) return '#64748b';
    const hex = hexcolor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#ffffff';
  };

  const getBookingStatus = useCallback((booking: Booking) => {
    if (booking.check_in) return 'green';
    const hktNow = getHKTNow();
    const bookingDate = new Date(booking.date);
    const [bStartH, bStartM] = booking.start.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(bStartH, bStartM, 0, 0);

    if (startDateTime > hktNow) return 'blue';
    return 'red';
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
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm transition-all ${isCurrentlyInClass ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {isCurrentlyInClass ? t('parent.in_class').toUpperCase() : t('parent.away').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('card.todays_schedule')}</label>
          <div className="grid gap-3">
            {bookings.map(booking => {
              const status = getBookingStatus(booking);
              const courseColor = booking.courses?.color || '#f1f5f9';
              const textColor = getContrastColor(courseColor);
              
              return (
                <div key={booking.id} className="flex flex-col p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm shrink-0"
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
                    <button 
                      onClick={() => onOpenManualModal(booking.id, student.name)}
                      className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                      title={t('card.manual')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </button>
                  </div>

                  {booking.check_in && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50 w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span className="text-[10px] font-mono font-bold text-indigo-600">
                        {booking.check_in.slice(11, 16)} — {booking.check_out ? booking.check_out.slice(11, 16) : '--:--'}
                      </span>
                    </div>
                  )}

                  {isToday && (
                    <div className="flex space-x-2">
                      {!booking.check_in ? (
                        <button 
                          onClick={() => onCheckIn(booking.id)} 
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl text-[9px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-sm"
                        >
                          {t('card.check_in')}
                        </button>
                      ) : !booking.check_out ? (
                        <button 
                          onClick={() => onCheckOut(booking.id)} 
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-2.5 rounded-xl text-[9px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-sm"
                        >
                          {t('card.check_out')}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
            {bookings.length === 0 && <p className="text-[10px] text-slate-400 italic py-2">{t('card.no_bookings')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCard;