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
  const END_HOUR = 23;
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
    // Handle both HH:mm:ss and ISO strings
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
    <div className={`fixed right-0 top-[42px] sm:top-[48px] bottom-0 z-[100] bg-slate-900 shadow-2xl transition-transform duration-500 flex flex-col rounded-tl-[2rem] sm:rounded-tl-[3rem] w-[85vw] sm:w-96 ${isExpanded ? 'translate-x-0' : 'translate-x-full'}`}>
      <button onClick={onToggle} className="absolute -left-11 top-1/2 -translate-y-1/2 w-11 h-24 bg-slate-900 text-white rounded-l-[2rem] flex items-center justify-center hover:bg-indigo-600 transition-all z-[105]">
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <div className="px-6 sm:px-8 pt-7 sm:pt-9 pb-6 bg-slate-900 text-white shrink-0">
        <span className="text-[11px] font-black tracking-[0.2em] uppercase opacity-70">Daily Timeline</span>
        <h4 className="font-black text-xl sm:text-3xl text-indigo-100 truncate mt-3">{studentName}</h4>
        <div className="flex items-center space-x-3 mt-3">
          <span className="text-[11px] text-slate-400 font-mono bg-slate-800/50 px-2 py-1 rounded">{date}</span>
          <span className="text-[11px] text-indigo-400 font-black uppercase">HKT</span>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-50 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="relative h-[1200px] flex px-4 sm:px-10 py-10"> 
          <div className="w-10 sm:w-14 shrink-0 flex flex-col justify-between">
            {hours.map((hour) => (
              <div key={hour} className="relative h-0"><span className="absolute -top-2 left-0 text-[10px] font-mono font-black text-slate-400">{hour.toString().padStart(2, '0')}:00</span></div>
            ))}
          </div>

          <div className="flex-1 relative ml-2 sm:ml-4">
            <div className="absolute inset-0 flex flex-col justify-between">
              {hours.map((hour) => (<div key={hour} className="w-full border-t border-slate-200/60 h-0" />))}
            </div>

            <div className="absolute inset-0 z-10">
              {bookings.map((booking) => {
                const top = timeToPercent(booking.start);
                const height = timeToPercent(booking.end) - top;
                return (
                  <div key={booking.id} className="absolute left-0 right-1 border-l-[6px] transition-all" style={{ top: `${top}%`, height: `${height}%`, backgroundColor: hexToRgba(booking.courses?.color || '#cbd5e1', 0.2), borderLeftColor: booking.courses?.color || '#cbd5e1' }} />
                );
              })}
              {bookings.filter(b => b.check_in).map((b) => {
                const top = timeToPercent(b.check_in!);
                const bottom = b.check_out ? timeToPercent(b.check_out) : timeToPercent(currentTime);
                return (
                  <div key={`att-${b.id}`} className={`absolute right-0 w-[94%] rounded-r-2xl ${!b.check_out ? 'bg-orange-500/50 animate-pulse' : 'bg-indigo-600/40'}`} style={{ top: `${top}%`, height: `${bottom - top}%` }} />
                );
              })}
            </div>

            {date === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" }) && (
              <div className="absolute left-0 right-0 border-t-2 border-red-500 z-30 flex items-center" style={{ top: `${timeToPercent(currentTime)}%` }}>
                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 ring-4 ring-white shadow-xl" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;