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

  const getBookingStatus = useCallback((booking: Booking): 'blue' | 'green' | 'yellow' | 'red' => {
    if (booking.check_in) return 'green';
    const hktNow = getHKTNow();
    const bookingDate = new Date(booking.date);
    const [bStartH, bStartM] = booking.start.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(bStartH, bStartM, 0, 0);

    if (startDateTime > hktNow) return 'blue';
    return 'red';
  }, []);

  const statusColors = { 
    blue: 'bg-blue-50 text-blue-600 ring-blue-500/10', 
    green: 'bg-emerald-50 text-emerald-600 ring-emerald-500/10', 
    red: 'bg-rose-50 text-rose-600 ring-rose-500/10',
    yellow: 'bg-amber-50 text-amber-600 ring-amber-500/10'
  };

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
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm transition-all ${isCurrentlyInClass ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {isCurrentlyInClass ? t('parent.in_class').toUpperCase() : t('parent.away').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('card.todays_schedule')}</label>
          <div className="grid gap-4">
            {bookings.map(booking => {
              const status = getBookingStatus(booking);
              const courseColor = booking.courses?.color || '#f1f5f9';
              const textColor = getContrastColor(courseColor);
              
              return (
                <div key={booking.id} className="relative flex flex-col p-5 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-slate-50 hover:border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-sm shrink-0"
                        style={{ backgroundColor: courseColor, color: textColor }}
                      >
                         {booking.courses?.name?.slice(0, 1) || 'B'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate leading-tight">{booking.courses?.name}</p>
                        <div className="mt-1">
                          <span className={`${statusColors[status]} inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ring-inset tracking-tighter transition-all`}>
                            {status === 'red' ? t('status.missed') : 
                             status === 'yellow' ? t('status.partial') :
                             status === 'green' ? t('status.attended') : t('status.future')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onOpenManualModal(booking.id, student.name)}
                      className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 rounded-xl transition-all shadow-sm active:scale-90"
                      title={t('card.manual')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{t('timeline.schedule')}:</span>
                       <span className="text-xs font-mono font-black text-indigo-600 tracking-tight">{booking.start.slice(0, 5)} — {booking.end.slice(0, 5)}</span>
                    </div>

                    {booking.check_in && (
                      <div className="flex items-center space-x-2 px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50 w-fit">
                        <div className={`w-1.5 h-1.5 rounded-full ${booking.check_out ? 'bg-indigo-400' : 'bg-emerald-500 animate-pulse'}`} />
                        <span className="text-[10px] font-mono font-bold text-indigo-600">
                          {booking.check_in.slice(11, 16)} — {booking.check_out ? booking.check_out.slice(11, 16) : '--:--'}
                        </span>
                      </div>
                    )}
                  </div>

                  {isToday && (
                    <div className="flex space-x-2 mt-4">
                      {!booking.check_in ? (
                        <button 
                          onClick={() => onCheckIn(booking.id)} 
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-[0.97] shadow-md shadow-indigo-100"
                        >
                          {t('card.check_in')}
                        </button>
                      ) : !booking.check_out ? (
                        <button 
                          onClick={() => onCheckOut(booking.id)} 
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-[0.97] shadow-md shadow-orange-100"
                        >
                          {t('card.check_out')}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCard;