
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BookingRequest } from '../types';
import { useTranslation } from 'react-i18next';

const PortalBookingRequests: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [allRequests, setAllRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'handled'>('pending');
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit/Delete State
  const [editingRequest, setEditingRequest] = useState<BookingRequest | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

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

  const displayedRequests = useMemo(() => {
    if (statusFilter === 'pending') {
      return allRequests.filter(r => (r as any).status === 'pending');
    }
    return allRequests.filter(r => (r as any).status !== 'pending');
  }, [allRequests, statusFilter]);

  const handleOpenEdit = (req: BookingRequest) => {
    setEditingRequest(req);
    setEditMessage(req.message || '');
  };

  const handleUpdateMessage = async () => {
    if (!editingRequest) return;
    setIsProcessing(true);
    try {
      await api.updateBookingRequest(editingRequest.id, { message: editMessage });
      setEditingRequest(null);
      await fetchRequests();
    } catch (err) {
      alert('Failed to update message.');
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
      alert('Failed to delete request.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
           <button onClick={() => navigate('/portal/bookings')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">Request Hub</h2>
             <p className="text-slate-500 font-medium text-xs">Track your session requests and academy feedback.</p>
           </div>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setStatusFilter('pending')}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Awaiting
          </button>
          <button 
            onClick={() => setStatusFilter('handled')}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === 'handled' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            History
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] animate-pulse">Syncing Hub...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedRequests.map((req) => {
            const status = (req as any).status;
            const responseMsg = (req as any).response_message;
            const isPending = status === 'pending';

            return (
              <div 
                key={req.id} 
                className={`group relative bg-white border-2 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 border-slate-100 overflow-hidden flex flex-col h-full`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-black text-slate-900 truncate">{req.students?.name}</h4>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">{req.courses?.name}</p>
                  </div>
                  <div className="shrink-0 text-right ml-4">
                    <p className="text-[10px] font-mono font-black text-slate-400">{req.date}</p>
                    <p className="text-[11px] font-mono font-bold text-indigo-600">{req.start_time.slice(0,5)}—{req.end_time.slice(0,5)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${status === 'accepted' ? 'bg-green-100 text-green-700' : status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-600'}`}>
                    {status}
                  </div>
                  {isPending && (
                    <div className="flex items-center space-x-2">
                       <button 
                        onClick={() => handleOpenEdit(req)}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Message"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                       </button>
                       <button 
                        onClick={() => setDeletingRequestId(req.id)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Request"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {req.message && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Your Message</span>
                      <p className="text-[10px] text-slate-600 font-bold italic line-clamp-3">"{req.message}"</p>
                    </div>
                  )}

                  {status !== 'pending' && responseMsg && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Academy Response</span>
                      <p className="text-[10px] text-indigo-700 font-bold italic line-clamp-3">"{responseMsg}"</p>
                    </div>
                  )}
                </div>
                
                {isPending && (
                  <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between shrink-0">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Awaiting school approval</span>
                     <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
          {displayedRequests.length === 0 && (
            <div className="col-span-full py-32 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               </div>
               <h3 className="text-xl font-black text-slate-900">No {statusFilter} requests.</h3>
               <p className="text-slate-400 font-medium text-sm mt-2">You haven't made any requests recently.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Message Modal */}
      {editingRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingRequest(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">Modify Request</h3>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Update message for your booking</p>
            </div>
            
            <div className="p-10 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Your Message</label>
                <textarea 
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="e.g. Please let us know if we need to bring anything..."
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-medium transition-all resize-none text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button onClick={() => setEditingRequest(null)} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">{t('common.cancel')}</button>
                <button 
                  onClick={handleUpdateMessage} 
                  disabled={isProcessing}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center"
                >
                  {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  Save Updates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRequestId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingRequestId(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm overflow-hidden p-10 animate-in fade-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete Request?</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed">Are you sure you want to withdraw this session request? This action cannot be undone.</p>
            <div className="flex space-x-3">
              <button onClick={() => setDeletingRequestId(null)} className="flex-1 px-6 py-3 text-xs font-black text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors uppercase tracking-widest">{t('common.cancel')}</button>
              <button 
                onClick={handleDeleteRequest} 
                disabled={isProcessing} 
                className="flex-1 px-6 py-3 text-xs font-black text-white rounded-xl bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-100 uppercase tracking-widest flex items-center justify-center"
              >
                {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" /> : 'Confirm Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalBookingRequests;
