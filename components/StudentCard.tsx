
import React, { useCallback } from 'react';
import { StudentGroupedData, Booking } from '../types';
import { useTranslation } from 'react-i18next';

interface StudentCardProps {
  data: StudentGroupedData;
  onCheckIn: (bookingId: string) => void;
  onCheckOut: (bookingId: string) => void;
  onOpenManualModal: (bookingId: string, studentName: string) => void;
  onOpenNoteModal: (bookingId: string, studentName: string, initialComment: string) => void;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (studentId: string) => void;
}

const getHKTNow = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));
};

const hexToRgba = (hex: string, alpha: number) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(s => s + s).join('');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const StudentCard: React.FC<StudentCardProps> = ({ 
  data, onCheckIn, onCheckOut, onOpenManualModal, onOpenNoteModal, isToday, isSelected, onSelect
}) => {
  const { student, bookings } = data;
  const { t } = useTranslation();

  const isCurrentlyInClass = bookings.some(b => b.check_in && !b.check_out);

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
      className={`relative bg-white border-2 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.99] group flex flex-col md:flex-row ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100'}`}
    >
      {/* STUDENT SIDEBAR - COMPACT NO ICON */}
      <div className={`p-4 md:w-40 shrink-0 border-b md:border-b-0 md:border-r transition-colors ${isSelected ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-50'} flex flex-col justify-center items-center text-center`}>
        <div className="flex flex-col items-center gap-1.5 w-full">
          <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate w-full px-1">{student.name}</h3>
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100">
              {student.level || 'N/A'}
            </span>
            <div className="flex items-center gap-1">
              {isCurrentlyInClass && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
              <span className={`text-[7px] font-black uppercase tracking-widest ${isCurrentlyInClass ? t('parent.in_class') : t('parent.away')}`}>
                {isCurrentlyInClass ? t('parent.in_class') : t('parent.away')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOOKINGS MAIN PANEL */}
      <div className="flex-1 p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          {bookings.map(booking => {
            const status = getBookingStatus(booking);
            const courseColor = booking.courses?.color || '#6366f1';
            
            return (
              <div key={booking.id} className="group/row relative flex flex-col xl:flex-row gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-indigo-200 transition-all duration-300">
                
                {/* 1. COURSE INFO SECTION - LOW OPACITY BACKGROUND */}
                <div 
                  className="flex flex-col justify-center shrink-0 xl:w-44 px-3 py-2 rounded-lg border-l-4"
                  style={{ 
                    backgroundColor: hexToRgba(courseColor, 0.08),
                    borderLeftColor: courseColor
                  }}
                >
                  <p className="font-black text-slate-900 text-[11px] truncate leading-tight mb-1">{booking.courses?.name}</p>
                  <div className="flex items-center">
                    <span className="text-[9px] font-mono font-black text-indigo-600">
                      {booking.start.slice(0, 5)} — {booking.end.slice(0, 5)}
                    </span>
                  </div>
                </div>

                {/* 2. ATTENDANCE LOG SECTION */}
                <div className="flex flex-col justify-center space-y-0.5 xl:w-36 shrink-0 bg-white/50 px-2.5 py-1.5 rounded-lg border border-slate-100/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">{t('timeline.actual')}</span>
                    <button 
                      onClick={() => onOpenManualModal(booking.id, student.name)}
                      className="p-0.5 text-slate-300 hover:text-indigo-600 transition-all"
                      title={t('common.edit')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>
                  <div className="flex items-center">
                    {booking.check_in ? (
                      <span className="text-[10px] font-mono font-black text-slate-700">
                        {booking.check_in.slice(0, 5)} — {booking.check_out ? booking.check_out.slice(0, 5) : '--:--'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-slate-200 italic">--:--</span>
                    )}
                  </div>
                </div>

                {/* 3. PRIMARY ACTION SECTION */}
                <div className="flex items-center xl:w-28 shrink-0">
                  {isToday ? (
                    <>
                      {!booking.check_in ? (
                        <button 
                          onClick={() => onCheckIn(booking.id)} 
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-1.5 rounded-lg text-[8px] uppercase tracking-widest shadow-sm active:scale-[0.95]"
                        >
                          {t('card.check_in')}
                        </button>
                      ) : !booking.check_out ? (
                        <button 
                          onClick={() => onCheckOut(booking.id)} 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-1.5 rounded-lg text-[8px] uppercase tracking-widest shadow-sm active:scale-[0.95]"
                        >
                          {t('card.check_out')}
                        </button>
                      ) : (
                        <div className="w-full py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest text-center">
                          {t('status.attended')}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`${statusColors[status]} w-full py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-center ring-1 ring-inset`}>
                      {t(`status.${{red:'missed',yellow:'partial',green:'attended',blue:'future'}[status]}`)}
                    </div>
                  )}
                </div>

                {/* 4. COMMENT SECTION */}
                <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-lg p-2 flex flex-col relative group/comment">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Comment</span>
                    <button 
                      onClick={() => onOpenNoteModal(booking.id, student.name, booking.comment || '')}
                      className="p-0.5 text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                  <div className="flex-1 text-[9px] text-slate-500 font-medium leading-tight italic line-clamp-1">
                    {booking.comment ? (
                      `"${booking.comment}"`
                    ) : (
                      <span className="text-slate-200">No note...</span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentCard;
