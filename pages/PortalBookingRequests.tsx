import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BookingRequest } from '../types';
import { useTranslation } from 'react-i18next';

type SortField = 'student' | 'course' | 'date' | 'status';
type SortOrder = 'asc' | 'desc';

// Fix: Completed hexToRgba function and added the PortalBookingRequests component with default export.
const hexToRgba = (hex: string, alpha: number) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(s => s + s).join('');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const PortalBookingRequests: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getPortalBookingRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to load booking requests', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const displayedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'student':
          comparison = (a.students?.name || '').localeCompare(b.students?.name || '');
          break;
        case 'course':
          comparison = (a.courses?.name || '').localeCompare(b.courses?.name || '');
          break;
        case 'date':
          comparison = a.date.localeCompare(b.date);
          if (comparison === 0) comparison = a.start_time.localeCompare(b.start_time);
          break;
        case 'status':
          const statusOrder = { pending: 0, accepted: 1, declined: 2 };
          comparison = (statusOrder[a.status as 'pending' | 'accepted' | 'declined'] ?? 3) - (statusOrder[b.status as 'pending' | 'accepted' | 'declined'] ?? 3);
          if (comparison === 0) {
            comparison = a.date.localeCompare(b.date);
          }
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [requests, sortField, sortOrder]);

  const handleDelete = async (id: string) => {
    setIsProcessing(true);
    try {
      await api.deleteBookingRequest(id);
      setConfirmDeleteId(null);
      fetchRequests();
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
           <button onClick={() => navigate('/portal/bookings')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90 shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div>
             <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('bookings.pending_requests')}</h2>
             <p className="text-slate-500 font-medium text-xs">{t('bookings.manage_pending')}</p>
           </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th onClick={() => toggleSort('student')} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                  {t('bookings.student')} {sortField === 'student' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => toggleSort('course')} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                  {t('bookings.course')} {sortField === 'course' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => toggleSort('date')} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:text-white transition-colors">
                  {t('bookings.date')} {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('bookings.time')}</th>
                <th onClick={() => toggleSort('status')} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-white transition-colors">
                  {t('common.status')} {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('bookings.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : displayedRequests.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold italic">{t('bookings.no_requests')}</td></tr>
              ) : displayedRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5"><span className="text-sm font-black text-slate-900">{req.students?.name}</span></td>
                  <td className="px-8 py-5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.courses?.name}</span></td>
                  <td className="px-8 py-5 text-center"><span className="text-[11px] font-mono font-bold text-slate-500">{req.date}</span></td>
                  <td className="px-8 py-5 text-center"><span className="text-xs font-mono font-black text-indigo-600">{req.start_time.slice(0,5)}—{req.end_time.slice(0,5)}</span></td>
                  <td className="px-8 py-5 text-right">
                    <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${req.status === 'accepted' ? 'bg-green-100 text-green-700' : req.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-600'}`}>
                      {req.status}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {req.status === 'pending' && (
                      <button onClick={() => setConfirmDeleteId(req.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm overflow-hidden p-10 text-center animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 mb-2">{t('bookings.withdraw_request')}</h3>
            <p className="text-slate-500 text-xs mb-8">{t('bookings.withdraw_msg')}</p>
            <div className="flex gap-4">
               <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-3 text-[10px] font-black text-slate-500 bg-slate-50 rounded-xl uppercase tracking-widest">{t('common.cancel')}</button>
               <button onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)} disabled={isProcessing} className="flex-1 px-4 py-3 text-[10px] font-black text-white rounded-xl bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-100 uppercase tracking-widest">
                 {isProcessing ? '...' : t('common.confirm')}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalBookingRequests;
