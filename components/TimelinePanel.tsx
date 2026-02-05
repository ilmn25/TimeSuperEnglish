
import React, { useState, useEffect } from 'react';
import { Booking } from '../types';

interface TimelinePanelProps {
  studentName: string | null;
  bookings: Booking[];
  date: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const hexToRgba = (hex: string, alpha: number) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(s => s + s).join('');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TimelinePanel: React.FC<TimelinePanelProps> = ({ studentName, bookings, date, isExpanded, onToggle }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const START_HOUR = 8;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  useEffect(() => {
    const updateTime = () => {
      const hktNow = new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Hong_Kong",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      });
      setCurrentTime(hktNow);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const timeToPercent = (timeStr: string | null) => {
    if (!timeStr) return 100;
    const parts = timeStr.includes('T') ? timeStr.split('T')[1].split(':') : timeStr.split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]) || 0;
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = START_HOUR * 60;
    const percent = ((totalMinutes - startMinutes) / (TOTAL_HOURS * 60)) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
  if (!studentName) return null;

  return (
    <div className={`fixed right-0 top-0 bottom-0 z-[100] bg-slate-900 shadow-2xl transition-transform duration-500 flex flex-col w-[85vw] sm:w-96 ${isExpanded ? 'translate-x-0' : 'translate-x-full'}`}>
      <button 
        onClick={onToggle} 
        className="absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-24 bg-slate-900 text-white rounded-l-2xl flex items-center justify-center hover:bg-indigo-600 transition-all z-[105] border-l border-t border-b border-slate-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <div className="px-8 pt-10 pb-8 bg-slate-900 text-white shrink-0 border-b border-slate-800">
        <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">System Timeline</span>
        <h4 className="font-black text-2xl text-white truncate mt-2">{studentName}</h4>
        <div className="flex items-center space-x-3 mt-4">
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50">{date}</span>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Live HKT</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-[#0f172a] overflow-y-auto no-scrollbar">
        <div className="relative h-[1000px] flex px-6 sm:px-8 py-12"> 
          <div className="w-12 shrink-0 flex flex-col justify-between relative z-20">
            {hours.map((hour) => (
              <div key={hour} className="relative h-0">
                <span className="absolute -top-2.5 left-0 text-[10px] font-mono font-black text-slate-500 bg-[#0f172a] pr-2">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          <div className="flex-1 relative ml-4">
            <div className="absolute inset-0 flex flex-col justify-between opacity-20">
              {hours.map((hour) => (
                <div key={hour} className="w-full border-t border-slate-700 h-0" />
              ))}
            </div>

            <div className="absolute inset-0 z-10">
              {bookings.map((booking) => {
                const top = timeToPercent(booking.start);
                const height = timeToPercent(booking.end) - top;
                const courseColor = booking.courses?.color || '#6366f1';
                
                const attTop = booking.check_in ? timeToPercent(booking.check_in) : 0;
                const attBottom = booking.check_in 
                  ? (booking.check_out ? timeToPercent(booking.check_out) : timeToPercent(currentTime))
                  : 0;
                const attHeight = attBottom - attTop;

                const tooltip = `${booking.courses?.name}\nScheduled: ${booking.start.slice(0,5)} - ${booking.end.slice(0,5)}${booking.check_in ? `\nActual: ${booking.check_in.slice(11,16)} - ${booking.check_out ? booking.check_out.slice(11,16) : 'Now'}` : ''}`;

                return (
                  <div key={booking.id} className="absolute left-0 right-0 group" style={{ top: `${top}%`, height: `${height}%` }} title={tooltip}>
                    <div 
                      className="absolute inset-0 rounded-xl border-2 transition-all group-hover:ring-4 group-hover:ring-white/5" 
                      style={{ 
                        backgroundColor: hexToRgba(courseColor, 0.1), 
                        borderColor: hexToRgba(courseColor, 0.3),
                        borderStyle: 'dashed'
                      }} 
                    />
                    
                    {booking.check_in && (
                      <div 
                        className={`absolute left-1 right-1 rounded-lg border-l-4 shadow-xl transition-all group-hover:brightness-110 ${!booking.check_out ? 'animate-pulse' : ''}`}
                        style={{ 
                          top: `${attTop - top}%`, 
                          height: `${attHeight}%`,
                          backgroundColor: hexToRgba(courseColor, 0.8),
                          borderLeftColor: courseColor,
                          borderTopColor: hexToRgba(courseColor, 0.2),
                          borderRightColor: hexToRgba(courseColor, 0.2),
                          borderBottomColor: hexToRgba(courseColor, 0.2)
                        }}
                      >
                        <div className="absolute top-2 left-3 flex flex-col">
                          <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none opacity-80 mb-1">{booking.courses?.name}</span>
                          <span className="text-[10px] font-mono font-black text-white leading-none">
                            {booking.check_in.slice(11, 16)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {date === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" }) && (
              <div className="absolute left-0 right-0 border-t border-red-500/50 z-30 flex items-center pointer-events-none" style={{ top: `${timeToPercent(currentTime)}%` }}>
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                <div className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded uppercase tracking-tighter shadow-lg">NOW</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-slate-900 border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-slate-500">
           <div className="flex items-center space-x-2">
             <div className="w-2 h-2 rounded-full border border-slate-700 border-dashed" />
             <span className="text-[9px] font-black uppercase tracking-widest">Schedule</span>
           </div>
           <div className="flex items-center space-x-2">
             <div className="w-2 h-2 rounded-full bg-slate-600" />
             <span className="text-[9px] font-black uppercase tracking-widest">Attendance</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
