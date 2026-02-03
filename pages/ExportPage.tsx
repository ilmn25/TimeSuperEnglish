
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Booking, Attendance } from '../types';
import { useTranslation } from 'react-i18next';

interface ExportColumn {
  id: string;
  label: string;
  default: boolean;
}

const ExportPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Data passed from BookingsPage
  const bookings: (Booking & { calculatedStatus: string })[] = location.state?.bookings || [];
  const attendances: Attendance[] = location.state?.attendances || [];

  const columns: ExportColumn[] = [
    { id: 'student', label: t('export_page.column_student'), default: true },
    { id: 'date', label: t('export_page.column_date'), default: true },
    { id: 'start', label: t('export_page.column_start'), default: true },
    { id: 'end', label: t('export_page.column_end'), default: true },
    { id: 'duration', label: t('export_page.column_duration'), default: true },
    { id: 'course', label: t('export_page.column_course'), default: true },
    { id: 'status', label: t('export_page.column_status'), default: true },
    { id: 'attendance', label: t('export_page.column_attendance'), default: true }
  ];

  const [selectedColumnIds, setSelectedColumnIds] = useState<Set<string>>(
    new Set(columns.filter(c => c.default).map(c => c.id))
  );

  const toggleColumn = (id: string) => {
    const next = new Set(selectedColumnIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedColumnIds(next);
  };

  const calculateDurationMinutes = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const totalMinutes = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
    return totalMinutes;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'red': return t('status.missed');
      case 'yellow': return t('status.partial');
      case 'green': return t('status.attended');
      case 'blue': return t('status.future');
      default: return status;
    }
  };

  // Find the maximum number of attendance records for any booking in the set
  const maxAttendanceCount = useMemo(() => {
    if (bookings.length === 0) return 0;
    return bookings.reduce((max, b) => {
      const count = attendances.filter(a => a.student_id === b.student_id && a.date === b.date).length;
      return Math.max(max, count);
    }, 0);
  }, [bookings, attendances]);

  const generateCSV = () => {
    if (bookings.length === 0) return;

    // Header row
    const csvHeaders: string[] = columns
      .filter(c => selectedColumnIds.has(c.id) && c.id !== 'attendance')
      .map(c => c.id);
    
    if (selectedColumnIds.has('attendance')) {
      for (let i = 1; i <= maxAttendanceCount; i++) {
        csvHeaders.push(`checkin${i}`);
        csvHeaders.push(`checkout${i}`);
      }
    }

    const rows = bookings.map(b => {
      const rowData: (string|number)[] = [];
      if (selectedColumnIds.has('student')) rowData.push(b.students?.name || '');
      if (selectedColumnIds.has('date')) rowData.push(b.date);
      if (selectedColumnIds.has('start')) rowData.push(b.start.slice(0, 5));
      if (selectedColumnIds.has('end')) rowData.push(b.end.slice(0, 5));
      if (selectedColumnIds.has('duration')) rowData.push(calculateDurationMinutes(b.start, b.end));
      if (selectedColumnIds.has('course')) rowData.push(b.courses?.name || '');
      if (selectedColumnIds.has('status')) rowData.push(getStatusLabel(b.calculatedStatus));

      if (selectedColumnIds.has('attendance')) {
        const studentDayAtts = attendances
          .filter(a => a.student_id === b.student_id && a.date === b.date)
          .sort((a, b) => a.start.localeCompare(b.start));

        for (let i = 0; i < maxAttendanceCount; i++) {
          const att = studentDayAtts[i];
          rowData.push(att ? att.start.slice(0, 5) : '');
          rowData.push(att ? (att.end ? att.end.slice(0, 5) : 'Live') : '');
        }
      }

      return rowData.join(',');
    });

    const csvContent = [csvHeaders.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 py-20 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
        </div>
        <h2 className="text-2xl font-black text-slate-900">{t('export_page.empty_state')}</h2>
        <button 
          onClick={() => navigate(`/org/${orgId}/bookings`)}
          className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:text-indigo-700 underline underline-offset-8 mt-4"
        >
          {t('nav.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('export_page.title')}</h2>
          <p className="text-slate-500 mt-1 font-medium">{t('export_page.subtitle')}</p>
        </div>
        <button 
          onClick={generateCSV}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center space-x-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span>{t('export_page.download_btn')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Column Selection */}
        <section className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('export_page.columns_title')}</h3>
          </div>
          <div className="space-y-3">
            {columns.map(col => (
              <label 
                key={col.id} 
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group ${selectedColumnIds.has(col.id) ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 bg-slate-50/30 grayscale opacity-60'}`}
              >
                <div className="flex flex-col">
                  <span className={`text-xs font-black uppercase tracking-tight ${selectedColumnIds.has(col.id) ? 'text-indigo-900' : 'text-slate-400'}`}>{col.label}</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={selectedColumnIds.has(col.id)}
                  onChange={() => toggleColumn(col.id)}
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Preview Panel */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('export_page.preview_title')}</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{bookings.length} {t('bookings.total_entries')}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    {columns.filter(c => selectedColumnIds.has(c.id) && c.id !== 'attendance').map(col => (
                      <th key={col.id} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.label}</th>
                    ))}
                    {selectedColumnIds.has('attendance') && (
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('export_page.column_attendance')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.slice(0, 10).map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {selectedColumnIds.has('student') && <td className="px-6 py-4 text-xs font-bold text-slate-900">{b.students?.name}</td>}
                      {selectedColumnIds.has('date') && <td className="px-6 py-4 text-[10px] font-mono text-slate-400">{b.date}</td>}
                      {selectedColumnIds.has('start') && <td className="px-6 py-4 text-[10px] font-mono font-black text-indigo-600">{b.start.slice(0,5)}</td>}
                      {selectedColumnIds.has('end') && <td className="px-6 py-4 text-[10px] font-mono font-black text-indigo-600">{b.end.slice(0,5)}</td>}
                      {selectedColumnIds.has('duration') && <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-500">{calculateDurationMinutes(b.start, b.end)}m</td>}
                      {selectedColumnIds.has('course') && <td className="px-6 py-4 text-xs font-bold text-slate-600">{b.courses?.name}</td>}
                      {selectedColumnIds.has('status') && <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-600">{getStatusLabel(b.calculatedStatus)}</td>}
                      {selectedColumnIds.has('attendance') && (
                        <td className="px-6 py-4 text-[10px] font-mono text-slate-400 italic">
                          {(() => {
                            const count = attendances.filter(a => a.student_id === b.student_id && a.date === b.date).length;
                            return count > 0 ? `${count} logs found` : 'None';
                          })()}
                        </td>
                      )}
                    </tr>
                  ))}
                  {bookings.length > 10 && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={columns.length} className="px-6 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">... and {bookings.length - 10} more rows ...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExportPage;
