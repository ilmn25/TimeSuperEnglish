import React from 'react';
import { Attendance } from '../types';
import { useTranslation } from 'react-i18next';

interface AttendanceRecordProps {
  attendance: Attendance;
  onRemove: (id: string) => void;
  isToday: boolean;
}

const AttendanceRecord: React.FC<AttendanceRecordProps> = ({ attendance, onRemove, isToday }) => {
  const { t } = useTranslation();
  // Format time (assuming HH:mm:ss format)
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return timeStr.slice(0, 5);
  };

  const isComplete = !!attendance.end;

  return (
    <div className="flex items-center justify-between p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 transition-all hover:bg-indigo-50 group gap-2">
      <div className="flex items-center space-x-2 min-w-0">
        <div className={`w-2 h-2 shrink-0 rounded-full ${isComplete ? 'bg-indigo-400' : 'bg-green-500 animate-pulse'}`} />
        <span className="font-mono text-slate-700 font-bold text-[10px] sm:text-xs whitespace-nowrap">
          {formatTime(attendance.start)} — {formatTime(attendance.end)}
        </span>
      </div>
      <button
        onClick={() => onRemove(attendance.id)}
        className="text-[9px] text-red-500 hover:text-white hover:bg-red-500 font-black px-1.5 py-1 rounded border border-red-100 transition-all uppercase tracking-tighter shrink-0"
      >
        {t('common.remove')}
      </button>
    </div>
  );
};

export default AttendanceRecord;