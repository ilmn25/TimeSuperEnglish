
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

  const columns: ExportColumn[] = [
    { id: 'student', label: t('export_page.column_student'), default: true },
    { id: 'date', label: t('export_page.column_date'), default: true },
    { id: 'start', label: t('export_page.column_start'), default: true },
    { id: 'end', label: t('export_page.column_end'), default: true },
    { id: 'duration', label: t('export_page.column_duration'), default: true },
    { id: 'course', label: t('export_page.column_course'), default: true },
    { id: 'status', label: t('export_page.column_status'), default: true },
    { id: 'check_in_out', label: t('nav.attendance'), default: true }
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

  /**
   * Generates and downloads the CSV file based on selected columns.
   */
  const handleDownload = () => {
    if (bookings.length === 0) return;

    const headers = columns
      .filter(c => selectedColumnIds.has(c.id))
      .map(c => c.label);

    const rows = bookings.map(b => {
      const rowData: string[] = [];
      if (selectedColumnIds.has('student')) rowData.push(`"${b.students?.name || ''}"`);
      if (selectedColumnIds.has('date')) rowData.push(b.date);
      if (selectedColumnIds.has('start')) rowData.push(b.start.slice(0, 5));
      if (selectedColumnIds.has('end')) rowData.push(b.end.slice(0, 5));
      if (selectedColumnIds.has('duration')) rowData.push(calculateDurationMinutes(b.start, b.end).toString());
      if (selectedColumnIds.has('course')) rowData.push(`"${b.courses?.name || ''}"`);
      if (selectedColumnIds.has('status')) rowData.push(getStatusLabel(b.calculatedStatus));
      if (selectedColumnIds.has('check_in_out')) {
        // Fix: Use slice(0, 5) for HH:mm format consistency
        const checkIn = b.check_in ? b.check_in.slice(0, 5) : '';
        const checkOut = b.check_out ? b.check_out.slice(0, 5) : '';
        rowData.push(`"${checkIn}${checkIn && checkOut ? '-' : ''}${checkOut}"`);
      }
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
          onClick={() => navigate(`/org/${orgId}/bookings`)} 
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {columns.map(col => (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className={`px-4 py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all ${selectedColumnIds.has(col.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-100 hover:text-indigo-600'}`}
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
          {/* Fix: Added table preview and download button to complete the truncated file */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  {columns.filter(c => selectedColumnIds.has(c.id)).map(c => (
                    <th key={c.id} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.slice(0, 5).map((b, i) => (
                  <tr key={i}>
                    {selectedColumnIds.has('student') && <td className="px-4 py-3 text-xs font-bold">{b.students?.name}</td>}
                    {selectedColumnIds.has('date') && <td className="px-4 py-3 text-xs">{b.date}</td>}
                    {selectedColumnIds.has('start') && <td className="px-4 py-3 text-xs">{b.start.slice(0, 5)}</td>}
                    {selectedColumnIds.has('end') && <td className="px-4 py-3 text-xs">{b.end.slice(0, 5)}</td>}
                    {selectedColumnIds.has('duration') && <td className="px-4 py-3 text-xs">{calculateDurationMinutes(b.start, b.end)}</td>}
                    {selectedColumnIds.has('course') && <td className="px-4 py-3 text-xs">{b.courses?.name}</td>}
                    {selectedColumnIds.has('status') && <td className="px-4 py-3 text-xs">{getStatusLabel(b.calculatedStatus)}</td>}
                    {selectedColumnIds.has('check_in_out') && (
                      <td className="px-4 py-3 text-xs">
                        {b.check_in ? b.check_in.slice(0, 5) : ''}
                        {b.check_in && b.check_out ? '-' : ''}
                        {b.check_out ? b.check_out.slice(0, 5) : ''}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-4">
            <button 
              onClick={handleDownload}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
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

// Fix: Added missing default export
export default AdminExport;
