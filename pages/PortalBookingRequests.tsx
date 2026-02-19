
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BookingRequest, Booking } from '../types';
import { useTranslation } from 'react-i18next';

type SortField = 'student' | 'course' | 'date' | 'status';
type SortOrder = 'asc' | 'desc';

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

  const [allRequests, setAllRequests] = useState<BookingRequest[]>([]);
  const [studentDayBookings, setStudentDayBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<any | null>(null);

  const [sortField, setSortField] = useState<SortField>('status');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [editingRequest, setEditingRequest] = useState<BookingRequest | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Hong_Kong",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getPortalBookingRequests();
      setAllRequests(data || []);
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
    return [...allRequests].sort((a, b) => {
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
          comparison = (a.status || '').localeCompare(b.status || '');
          if (comparison === 0) {
            comparison = a.date.localeCompare(b.date);
            if (comparison === 0) comparison = a.start_time.localeCompare(b.start_time);
            return -comparison;
          }
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [allRequests, sortField, sortOrder]);

  const selectedRequest = useMemo(() => 
    allRequests.find(r => r.id === selectedRequestId),
    [allRequests, selectedRequestId]
  );

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!selectedRequest) return;
      setIsLoadingTimeline(true);
      try {
        const bookings = await api.getStudentBookings(selectedRequest.student_id, { date: selectedRequest.date });
        setStudentDayBookings(bookings || []);
      } catch (err) {
        console.error('Failed to fetch student timeline', err);
      } finally {
        setIsLoadingTimeline(false);
      }
    };
    fetchTimeline();
  }, [selectedRequest]);

  const handleUpdateMessage = async () => {
    if (!editingRequest) return;
    setIsProcessing(true);
    try {
      await api.updateBookingRequest(editingRequest.id, { message: editMessage });
      setEditingRequest(null);
      await fetchRequests();
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deletingRequestId) return;
    setIsProcessing(true);
    try {
      await api.deleteBookingRequest(deletingRequestId);
      setDeletingRequestId(null);
      await fetchRequests();
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const timeToPercent = (timeStr: string) => {
    if (!timeStr) return 100;
    const parts = timeStr.includes('T') ? timeStr.split('T')[1].split(':') : timeStr.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]) || 0;
    const totalMinutes = h * 60 + m;
    const startMinutes = 8 * 60; 
    const endMinutes = 22 * 60;
    const percent = ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  // LANE ALGORITHM
  const timelineLanes = useMemo(() => {
    if (!selectedRequest) return [];

    const items = [
      {
        ...selectedRequest,
        start: selectedRequest.start_time,
        end: selectedRequest.end_time,
        type: 'target' as const
      },
      ...studentDayBookings.map(b => ({
        ...b,
        start: b.start,
        end: b.end,
        type: 'booking' as const
      }))
    ].sort((a, b) => a.start.localeCompare(b.start));

    const lanes: any[][] = [];
    items.forEach(item => {
      let placed = false;
      for (let lane of lanes) {
        const last = lane[lane.length - 1];
        if (item.start >= last.end) {
          lane.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) lanes.push([item]);
    });

    return lanes;
  }, [studentDayBookings, selectedRequest]);

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto transition-all ${selectedRequestId ? 'xl:pr-[450px]' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 sm:px-0">
        <div className="flex items-center space-x-4">
           <button onClick={() => navigate('/portal/parent/bookings')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90 shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('bookings.request_hub')}</h2>
             <p className="text-slate-500 font-medium text-xs">{t('bookings.manage_pending')}</p>
           </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm mx-4 sm:mx-0">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="py-20 text-center"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : allRequests.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold italic">{t('bookings.no_requests')}</td></tr>
              ) : displayedRequests.map((req) => {
                const isSelected = selectedRequestId === req.id;
                const status = req.status;
                return (
                  <tr key={req.id} onClick={() => setSelectedRequestId(req.id)} className={`group cursor-pointer transition-all duration-200 ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-8 py-5"><span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{req.students?.name}</span></td>
                    <td className="px-8 py-5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.courses?.name}</span></td>
                    <td className="px-8 py-5 text-center"><span className="text-[11px] font-mono font-bold text-slate-500">{req.date}</span></td>
                    <td className="px-8 py-5 text-center"><span className="text-xs font-mono font-black text-indigo-600">{req.start_time.slice(0,5)}—{req.end_time.slice(0,5)}</span></td>
                    <td className="px-8 py-5 text-right">
                       <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${status === 'accepted' ? 'bg-green-100 text-green-700' : status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-600'}`}>
                          {t(`status.${status}`)}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequestId && selectedRequest && createPortal(
        <aside className="fixed top-0 right-0 bottom-0 w-full max-w-[450px] bg-slate-900 shadow-2xl z-[200] flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-800">
          <div className="p-8 pt-12 pb-4 shrink-0 flex items-center justify-between">
             <div>
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">{selectedRequest.date}</span>
               <h3 className="text-2xl font-black text-white mt-1 leading-tight">{selectedRequest.students?.name.split(' ')[0]}</h3>
             </div>
             <button onClick={() => setSelectedRequestId(null)} className="p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>

          <div className="flex-1 min-h-0 px-8 py-4 overflow-y-auto no-scrollbar flex flex-col">
            <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 flex-1 relative flex p-6 overflow-hidden">
                
                {hoveredItem && (
                   <div className="absolute top-6 right-6 w-52 bg-slate-800 border border-slate-700 shadow-2xl rounded-2xl p-4 z-[250] pointer-events-none animate-in fade-in slide-in-from-top-4 slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                         <div className="flex flex-col">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{hoveredItem.type === 'target' ? t('timeline.pending_request').toUpperCase() : t('timeline.booked').toUpperCase()}</span>
                            <span className="text-sm font-black text-white leading-tight">{hoveredItem.courses?.name || hoveredItem.courses?.name}</span>
                         </div>
                         <div className="h-px bg-slate-700/50 w-full" />
                         <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-black text-indigo-500">{hoveredItem.start.slice(0,5)} — {hoveredItem.end.slice(0,5)}</span>
                         </div>
                      </div>
                   </div>
                )}

                <div className="w-10 shrink-0 flex flex-col justify-between py-2 border-r border-slate-800/50">
                   {Array.from({ length: 8 }, (_, i) => 8 + (i * 2)).map(hour => (
                     <div key={hour} className="text-[10px] font-mono font-black text-slate-600">{hour}:00</div>
                   ))}
                   <div className="text-[10px] font-mono font-black text-slate-600">22:00</div>
                </div>

                <div className="flex-1 relative ml-4">
                  <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                    {Array.from({ length: 15 }, (_, i) => 8 + i).map(hour => (
                      <div key={hour} className="w-full border-t border-white h-0" />
                    ))}
                  </div>

                  <div className="relative h-full w-full z-10 flex space-x-1">
                    {isLoadingTimeline ? (
                      <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : timelineLanes.map((lane, lIdx) => (
                      <div key={lIdx} className="relative h-full flex-1 min-w-[24px]">
                        {lane.map(item => {
                          const top = timeToPercent(item.start);
                          const height = timeToPercent(item.end) - top;
                          const color = item.courses?.color || '#6366f1';
                          const isTarget = item.type === 'target';
                          
                          // Attendance details for existing bookings
                          const attTop = item.check_in ? timeToPercent(item.check_in) : 0;
                          const attBottom = item.check_in ? (item.check_out ? timeToPercent(item.check_out) : timeToPercent(currentTime)) : 0;
                          const attHeight = attBottom - attTop;

                          return (
                            <div 
                              key={item.id || lIdx} 
                              className={`absolute left-0 right-0 transition-all ${isTarget ? 'z-30' : 'z-10 hover:z-40'}`}
                              style={{ top: `${top}%`, height: `${height}%` }}
                              onMouseEnter={() => setHoveredItem(item)}
                              onMouseLeave={() => setHoveredItem(null)}
                            >
                              <div 
                                className={`absolute inset-0 rounded-xl border-2 transition-all ${isTarget ? 'border-dashed border-[#6366f1] bg-indigo-500/20 ring-2 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse' : 'border-dashed'}`}
                                style={{ 
                                  backgroundColor: !isTarget ? hexToRgba(color, 0.1) : undefined, 
                                  borderColor: !isTarget ? hexToRgba(color, 0.3) : undefined 
                                }}
                              />
                              {item.type === 'booking' && item.check_in && height > 0 && (
                                <div 
                                  className={`absolute left-1 right-1 rounded-lg border-l-4 shadow-xl ${!item.check_out ? 'animate-pulse' : ''}`} 
                                  style={{ 
                                    top: `${((attTop - top) / height) * 100}%`, 
                                    height: `${(attHeight / height) * 100}%`, 
                                    backgroundColor: hexToRgba(color, 0.8), 
                                    borderLeftColor: color, 
                                    borderTopColor: hexToRgba(color, 0.2), 
                                    borderRightColor: hexToRgba(color, 0.2), 
                                    borderBottomColor: hexToRgba(color, 0.2) 
                                  }} 
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* NOW line */}
                    {selectedRequest.date === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" }) && (
                      <div className="absolute left-0 right-0 border-t border-red-500/50 z-[100] flex items-center pointer-events-none" style={{ top: `${timeToPercent(currentTime)}%` }}>
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* User's Note (Always shown in main content area) */}
            <div className="mt-8 space-y-4">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('bookings.your_note')}</h4>
              <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] shadow-inner">
                {selectedRequest.message ? (
                  <p className="text-sm font-medium text-indigo-100 leading-relaxed italic">"{selectedRequest.message}"</p>
                ) : (
                  <p className="text-sm font-medium text-indigo-200 leading-relaxed italic">{t('bookings.no_note')}</p>
                )}
              </div>
            </div>

            {/* Academy Feedback (existing) */}
            {selectedRequest.response_message && (
              <div className="mt-8 space-y-4">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('bookings.academy_feedback')}</h4>
                <div className="p-6 bg-indigo-500/20 border border-indigo-500/30 rounded-[2rem]">
                  <p className="text-sm font-black text-white leading-relaxed italic">"{selectedRequest.response_message}"</p>
                </div>
              </div>
            )}
          </div>

          {selectedRequest.status === 'pending' && (
            <div className="p-8 border-t border-slate-800 bg-slate-900 shrink-0 flex flex-col space-y-4">
               <div className="flex items-center space-x-3">
                 <button onClick={() => { setEditingRequest(selectedRequest); setEditMessage(selectedRequest.message || ''); }} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">{t('bookings.modify_request')}</button>
                 <button onClick={() => setDeletingRequestId(selectedRequest.id)} className="p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
               </div>
            </div>
          )}
        </aside>,
        document.body
      )}

      {editingRequest && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden p-10 animate-in fade-in zoom-in duration-200">
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('bookings.modify_request')}</h3>
             <textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} rows={4} className="w-full mt-6 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-medium transition-all resize-none text-slate-900" />
             <div className="flex space-x-3 mt-8">
               <button onClick={() => setEditingRequest(null)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.cancel')}</button>
               <button onClick={handleUpdateMessage} disabled={isProcessing} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">{t('bookings.save_updates')}</button>
             </div>
          </div>
        </div>,
        document.body
      )}

      {deletingRequestId && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingRequestId(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm overflow-hidden p-10 text-center animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 mb-2">{t('bookings.withdraw_request')}</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed">{t('bookings.withdraw_msg')}</p>
            <div className="flex space-x-3">
              <button onClick={() => setDeletingRequestId(null)} className="flex-1 px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.cancel')}</button>
              <button onClick={handleDeleteRequest} disabled={isProcessing} className="flex-1 px-4 py-3 text-[10px] font-black text-white rounded-xl bg-red-600 uppercase tracking-widest">{t('common.confirm')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PortalBookingRequests;
