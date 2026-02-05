import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (start: string, end: string) => void;
  onClear: () => void;
  studentName: string;
  initialStart?: string | null;
  initialEnd?: string | null;
  scheduledStart?: string;
  scheduledEnd?: string;
}

const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({ 
  isOpen, onClose, onSubmit, onClear, studentName, initialStart, initialEnd, scheduledStart, scheduledEnd
}) => {
  const { t } = useTranslation();
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');

  // Helper to extract HH:mm from ISO or simple time string
  const formatForInput = (timeStr: string | null | undefined, fallback: string) => {
    if (!timeStr) return fallback;
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].slice(0, 5);
    }
    return timeStr.slice(0, 5);
  };

  useEffect(() => {
    if (isOpen) {
      // Use existing attendance if available, otherwise use scheduled times as placeholders/defaults
      const defaultStart = formatForInput(scheduledStart, '09:00');
      const defaultEnd = formatForInput(scheduledEnd, '17:00');
      
      setStart(formatForInput(initialStart, defaultStart));
      setEnd(formatForInput(initialEnd, defaultEnd));
    }
  }, [isOpen, initialStart, initialEnd, scheduledStart, scheduledEnd]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <h3 className="text-2xl font-black text-slate-900 mb-2">{t('manual.title')}</h3>
          <p className="text-slate-500 text-sm mb-8">{t('manual.subtitle')} <span className="text-indigo-600 font-bold">{studentName}</span></p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('manual.start')}</label>
              <input 
                type="time" 
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-black text-slate-900 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('manual.end')}</label>
              <input 
                type="time" 
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-black text-slate-900 transition-all"
              />
            </div>
          </div>

          {(initialStart || initialEnd) && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="w-full py-4 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-all shadow-lg shadow-red-100 active:scale-95 uppercase tracking-widest"
              >
                {t('common.remove')} Attendance
              </button>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 flex items-center justify-end space-x-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSubmit(start, end);
            }}
            className="px-8 py-4 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendanceModal;