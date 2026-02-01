
import React, { useState, useEffect } from 'react';
import { Booking, Attendance } from '../types';

interface TimelinePanelProps {
  studentName: string | null;
  bookings: Booking[];
  attendances: Attendance[];
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

const TimelinePanel: React.FC<TimelinePanelProps> = ({ studentName, bookings, attendances, date, isExpanded, onToggle }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  // Time range for the timeline: 08:00 to 23:00 (15 hours)
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
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1] || 0;
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = START_HOUR * 60;
    const percent = ((totalMinutes - startMinutes) / (TOTAL_HOURS * 60)) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  if (!studentName) return null;

  const renderBookings = () => (
    bookings.map((booking) => {
      const top = timeToPercent(booking.start);
      const bottom = timeToPercent(booking.end);
      const bgColor = hexToRgba(booking.courses?.color || '#cbd5e1', 0.2);
      const borderColor = booking.courses?.color || '#cbd5e1';
      const height = bottom - top;
      
      return (
        <div 
          key={booking.id}
          className="absolute left-0 right-1 flex flex-col justify-center px-4 overflow-hidden border-l-[6px] transition-all duration-300 pointer-events-none"
          style={{ 
            top: `${top}%`, 
            height: `${height}%`,
            backgroundColor: bgColor,
            borderLeftColor: borderColor,
          }}
        >
          {height > 1.2 && (
            <>
              <span className="text-[10px] sm:text-[11px] font-black leading-tight text-slate-800 uppercase tracking-tighter truncate">
                {booking.courses?.name}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-500">
                {booking.start.slice(0,5)}-{booking.end.slice(0,5)}
              </span>
            </>
          )}
        </div>
      );
    })
  );

  const renderAttendances = () => (
    attendances.map((att) => {
      const isLive = !att.end;
      const top = timeToPercent(att.start);
      const bottom = isLive ? timeToPercent(currentTime) : timeToPercent(att.end);
      const height = bottom - top;
      
      return (
        <div 
          key={att.id}
          className={`absolute flex flex-col justify-center items-center overflow-hidden transition-all duration-300 z-20 w-[94%] right-0 rounded-l-none rounded-r-2xl group cursor-help ${isLive ? 'bg-orange-500/50' : 'bg-indigo-600/40'}`}
          style={{ 
            top: `${top}%`, 
            height: `${height}%`,
          }}
        >
          {isLive && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '100% 200%' }} />
          )}
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 bg-black/5 flex items-center justify-center">
            <span className="text-[10px] font-black text-slate-900 bg-white/90 px-2 py-1 rounded shadow-sm border border-black/5 whitespace-nowrap">
              {att.start.slice(0, 5)} — {att.end ? att.end.slice(0, 5) : 'Present'}
            </span>
          </div>
        </div>
      );
    })
  );

  return (
    <>
      {/* Main Panel Container */}
      <div 
        className={`fixed right-0 top-[42px] sm:top-[48px] bottom-0 z-[100] bg-slate-900 shadow-2xl transition-transform duration-500 ease-in-out flex flex-col rounded-tl-[2rem] sm:rounded-tl-[3rem] w-[85vw] sm:w-96 ${isExpanded ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Toggle Handle */}
        <button 
          onClick={onToggle}
          className={`absolute -left-11 top-1/2 -translate-y-1/2 w-11 h-24 bg-slate-900 text-white rounded-l-[2rem] flex items-center justify-center shadow-2xl transition-all hover:bg-indigo-600 active:scale-95 z-[105]`}
          aria-label="Toggle Timeline"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Inner Content Wrapper - Removed 'invisible' to prevent glitches during transition */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden rounded-tl-[2rem] sm:rounded-tl-[3rem] ${!isExpanded ? 'pointer-events-none' : ''}`}>
          {/* Panel Header */}
          <div className="px-6 sm:px-8 pt-7 sm:pt-9 pb-6 bg-slate-900 text-white shrink-0 shadow-xl relative">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-[11px] font-black tracking-[0.2em] uppercase opacity-70">Daily Timeline</span>
            </div>
            <h4 className="font-black text-xl sm:text-3xl text-indigo-100 truncate mt-3 leading-tight pr-4">
              {studentName}
            </h4>
            <div className="flex items-center space-x-3 mt-3">
              <span className="text-[11px] text-slate-400 font-mono tracking-widest opacity-80 bg-slate-800/50 px-2 py-1 rounded">
                {date}
              </span>
              <div className="w-1 h-1 bg-slate-700 rounded-full" />
              <span className="text-[11px] text-indigo-400 font-black uppercase tracking-widest">HKT</span>
            </div>
          </div>

          {/* Timeline Scrollable Body */}
          <div className="flex-1 relative bg-slate-50 overflow-y-auto overflow-x-hidden scrollbar-hide">
            <div className="relative h-[1200px] flex px-4 sm:px-10 py-10"> 
              
              {/* Time Ruler Gutter */}
              <div className="w-10 sm:w-14 shrink-0 flex flex-col justify-between pointer-events-none">
                {hours.map((hour) => (
                  <div key={hour} className="relative h-0">
                    <span className="absolute -top-2 left-0 text-[10px] sm:text-[12px] font-mono font-black text-slate-400">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Main Canvas Area */}
              <div className="flex-1 relative ml-2 sm:ml-4">
                {/* Hour Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {hours.map((hour) => (
                    <div key={hour} className="w-full border-t border-slate-200/60 h-0" />
                  ))}
                </div>

                {/* Data Bars */}
                <div className="absolute inset-0 z-10">
                  {renderBookings()}
                  {renderAttendances()}
                </div>

                {/* Current Time Indicator */}
                {isToday(date) && (
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                    style={{ top: `${timeToPercent(currentTime)}%` }}
                  >
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-500 -ml-1.5 sm:-ml-2 ring-4 ring-white shadow-xl" />
                    <div className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-sm hidden sm:block">
                      LIVE
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile bottom decorative grip / bar */}
          <div className="sm:hidden p-4 bg-white border-t border-slate-100 flex justify-center shrink-0">
             <div className="w-12 h-1 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>
    </>
  );
};

function isToday(dateStr: string) {
  const hktToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
  return dateStr === hktToday;
}

export default TimelinePanel;
