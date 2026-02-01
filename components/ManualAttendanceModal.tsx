
import React, { useState, useEffect } from 'react';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (start: string, end: string) => void;
  studentName: string;
}

const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({ isOpen, onClose, onSubmit, studentName }) => {
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');

  // Reset defaults when opening for a new student
  useEffect(() => {
    if (isOpen) {
      setStart('09:00');
      setEnd('17:00');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Manual Attendance</h3>
          <p className="text-slate-500 text-sm mb-6">Enter custom times for <span className="text-indigo-600 font-semibold">{studentName}</span></p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Time</label>
              <input 
                type="time" 
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Time</label>
              <input 
                type="time" 
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex items-center justify-end space-x-3">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSubmit(start, end);
            }}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 transition-all"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendanceModal;
