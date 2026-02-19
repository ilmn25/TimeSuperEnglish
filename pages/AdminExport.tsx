
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Booking } from '../types';
import { useTranslation } from 'react-i18next';

interface ExportColumn {
  id: string;
  label: string;
  default: boolean;
}

const AdminExport: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Data passed from AdminBookings
  const bookings: (Booking & { calculatedStatus: string })[] = location.state?.bookings || [];

  // Aligning with import format: student,date,start,duration,course,check_in,check_out
  // Plus extra requested options: end, status
  const columns: ExportColumn[] = [
    { id: 'student', label: t('export_page.column_student'), default: true },
    { id: 'date', label: t('export_page.column_date'), default: true },
    { id: 'start', label: t('export_page.column_start'), default: true },
    { id: 'duration', label: t('export_page.column_duration'), default: true },
    { id: 'course', label: t('export_page.column_course'), default: true },
    { id: 'check_in', label: t('export_page.column_check_in'), default: true },
    { id: 'check_out', label: t('export_page.column_check_out'), default: true },
    { id: 'end', label: t('export_page.column_end'), default: false },
    { id: 'status', label: t('export_page.column_status'), default: false },
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

  const handleDownload = () => {
    if (bookings.length === 0) return;

    // Filtered columns based on user selection, keeping header order
    const activeCols = columns.filter(c => selectedColumnIds.has(c.id));
    const headers = activeCols.map(c => c.label);

    const rows = bookings.map(b => {
      const rowData: string[] = [];
      activeCols.forEach(col => {
        switch (col.id) {
          case 'student': rowData.push(`"${b.students?.name || ''}"`); break;
          case 'date': rowData.push(b.date); break;
          case 'start': rowData.push(b.start.slice(0, 5)); break;
          case 'end': rowData.push(b.end.slice(0, 5)); break;
          case 'duration': rowData.push(calculateDurationMinutes(b.start, b.end).toString()); break;
          case 'course': rowData.push(`"${b.courses?.name || ''}"`); break;
          case 'status': rowData.push(getStatusLabel(b.calculatedStatus)); break;
          case 'check_in': rowData.push(b.check_in ? b.check_in.slice(0, 5) : ''); break;
          case 'check_out': rowData.push(b.check_out ? b.check_out.slice(0, 5) : ''); break;
        }
      });
      return rowData.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate(`/portal/admin/org/${orgId}/bookings`)} 
          className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-90"
          title={t('nav.back')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('export_page.title')}</h2>
          <p className="text-slate-500 font-medium">{t('export_page.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-10">
        <section className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('export_page.columns_title')}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {columns.map(col => (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className={`px-4 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedColumnIds.has(col.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-100 hover:text-indigo-600'}`}
              >
                {col.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('export_page.preview_title')}</h3>
          </div>
          
          <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-inner">
            <table className="w-full text-left">
              <thead className="bg-slate-900">
                <tr>
                  {columns.filter(c => selectedColumnIds.has(c.id)).map(c => (
                    <th key={c.id} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.length > 0 ? bookings.slice(0, 5).map((b, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    {selectedColumnIds.has('student') && <td className="px-5 py-4 text-xs font-black text-slate-900 truncate max-w-[150px]">{b.students?.name}</td>}
                    {selectedColumnIds.has('date') && <td className="px-5 py-4 text-[10px] font-mono font-bold text-slate-500">{b.date}</td>}
                    {selectedColumnIds.has('start') && <td className="px-5 py-4 text-[10px] font-mono font-black text-indigo-600">{b.start.slice(0, 5)}</td>}
                    {selectedColumnIds.has('duration') && <td className="px-5 py-4 text-[10px] font-mono font-bold text-slate-600">{calculateDurationMinutes(b.start, b.end)}</td>}
                    {selectedColumnIds.has('course') && <td className="px-5 py-4 text-xs font-bold text-slate-700 truncate max-w-[150px]">{b.courses?.name}</td>}
                    {selectedColumnIds.has('check_in') && <td className="px-5 py-4 text-[10px] font-mono font-bold text-emerald-600">{b.check_in ? b.check_in.slice(0, 5) : '-'}</td>}
                    {selectedColumnIds.has('check_out') && <td className="px-5 py-4 text-[10px] font-mono font-bold text-emerald-600">{b.check_out ? b.check_out.slice(0, 5) : '-'}</td>}
                    {selectedColumnIds.has('end') && <td className="px-5 py-4 text-[10px] font-mono font-black text-indigo-600">{b.end.slice(0, 5)}</td>}
                    {selectedColumnIds.has('status') && (
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ${
                          b.calculatedStatus === 'green' ? 'bg-emerald-100 text-emerald-700' : 
                          b.calculatedStatus === 'red' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {getStatusLabel(b.calculatedStatus)}
                        </span>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-400 font-bold italic text-sm">
                      {t('export_page.empty_state')}
                    </td>
                  </tr>
                )}
                {bookings.length > 5 && (
                  <tr>
                    <td colSpan={selectedColumnIds.size} className="px-5 py-3 bg-slate-50/50 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {t('export_page.more_rows', { count: bookings.length - 5 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end pt-4">
            <button 
              onClick={handleDownload}
              disabled={bookings.length === 0}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3 disabled:grayscale disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {t('export_page.download_btn')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminExport;
