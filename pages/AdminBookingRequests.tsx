
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { BookingRequest } from '../types';
import { useTranslation } from 'react-i18next';

const AdminBookingRequests: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [allRequests, setAllRequests] = useState<BookingRequest[]>([]);
  const [contextRequests, setContextRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter & Selection State
  const [statusFilter, setStatusFilter] = useState<'pending' | 'handled'>('pending');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Rejection Workflow
  const [rejectingRequest, setRejectingRequest] = useState<BookingRequest | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');

  const fetchRequests = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const data = await api.getAllBookingRequests(orgId);
      setAllRequests(data || []);
    } catch (err) {
      console.error('Failed to load booking requests', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const displayedRequests = useMemo(() => {
    if (statusFilter === 'pending') {
      return allRequests.filter(r => (r as any).status === 'pending');
    }
    return allRequests.filter(r => (r as any).status !== 'pending');
  }, [allRequests, statusFilter]);

  const handleRequestClick = async (request: BookingRequest) => {
    if ((request as any).status !== 'pending') return;
    
    setSelectedRequestId(request.id);
    setIsLoadingContext(true);
    try {
      const context = await api.getBookingRequestsForContext(orgId!, request.date, request.course_id);
      // Filter out the current selected request from the context list to show "Others"
      setContextRequests(context.filter((c: BookingRequest) => c.id !== request.id));
    } catch (err) {
      console.error('Failed to load context requests', err);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleApprove = async (request: BookingRequest) => {
    if (!orgId) return;
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await api.updateBookingRequest(request.id, {
        status: 'accepted',
        responded_at: new Date().toISOString(),
        responded_by: user?.id
      });
      await api.createBooking(orgId, {
        student_id: request.student_id,
        course_id: request.course_id,
        date: request.date,
        start: request.start_time,
        end: request.end_time
      });
      setSelectedRequestId(null);
      fetchRequests();
    } catch (err: any) {
      alert('Approval failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await api.updateBookingRequest(rejectingRequest.id, {
        status: 'declined',
        response_message: rejectionMessage,
        responded_at: new Date().toISOString(),
        responded_by: user?.id
      });
      setRejectingRequest(null);
      setRejectionMessage('');
      setSelectedRequestId(null);
      fetchRequests();
    } catch (err: any) {
      alert('Rejection failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedRequest = useMemo(() => 
    allRequests.find(r => r.id === selectedRequestId),
    [allRequests, selectedRequestId]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
           <button onClick={() => navigate(`/org/${orgId}/bookings`)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('bookings.pending_requests')}</h2>
             <p className="text-slate-500 font-medium text-xs">Manage incoming session requests from parents.</p>
           </div>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => { setStatusFilter('pending'); setSelectedRequestId(null); }}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pending
          </button>
          <button 
            onClick={() => { setStatusFilter('handled'); setSelectedRequestId(null); }}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === 'handled' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main List (7-8 Cols) */}
        <div className={`space-y-6 ${selectedRequestId ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] animate-pulse">Syncing Portal...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayedRequests.map((req) => {
                const isSelected = selectedRequestId === req.id;
                const status = (req as any).status;
                const responseMsg = (req as any).response_message;
                return (
                  <div 
                    key={req.id} 
                    onClick={() => handleRequestClick(req)}
                    className={`group relative bg-white border-2 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100'}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-slate-900 truncate">{req.students?.name}</h4>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">{req.courses?.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-mono font-black text-slate-400">{req.date}</p>
                        <p className="text-[11px] font-mono font-bold text-indigo-600">{req.start_time.slice(0,5)}—{req.end_time.slice(0,5)}</p>
                      </div>
                    </div>

                    {status !== 'pending' && (
                      <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 shadow-sm ${status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {status}
                      </div>
                    )}

                    {req.message && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Parent Note</span>
                        <p className="text-[10px] text-slate-600 font-bold italic line-clamp-2">"{req.message}"</p>
                      </div>
                    )}

                    {status !== 'pending' && responseMsg && (
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-4">
                        <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Academy Response</span>
                        <p className="text-[10px] text-indigo-700 font-bold italic line-clamp-2">"{responseMsg}"</p>
                      </div>
                    )}

                    {status === 'pending' && (
                      <div className="flex items-center justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                        <span>Click to Inspect Context</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    )}
                  </div>
                );
              })}
              {displayedRequests.length === 0 && (
                <div className="col-span-full py-32 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                   </div>
                   <h3 className="text-xl font-black text-slate-900">No {statusFilter} requests.</h3>
                   <p className="text-slate-400 font-medium text-sm mt-2">The portal queue is currently empty.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inspection Sidebar (4-5 Cols) */}
        {selectedRequestId && selectedRequest && (
          <aside className="lg:col-span-4 bg-slate-900 rounded-[3rem] p-10 shadow-2xl flex flex-col space-y-10 animate-in slide-in-from-right-8 duration-500 sticky top-24">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Decision Console</span>
                 <h3 className="text-2xl font-black text-white">{selectedRequest.students?.name}</h3>
               </div>
               <button onClick={() => setSelectedRequestId(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <section className="space-y-6">
               <div className="flex items-center space-x-3">
                 <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Other Requests for this Date/Course</h4>
               </div>
               
               <div className="space-y-3 min-h-[150px] max-h-[300px] overflow-y-auto no-scrollbar">
                  {isLoadingContext ? (
                    <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : contextRequests.length > 0 ? (
                    contextRequests.map(cr => (
                      <div key={cr.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-between">
                         <div className="min-w-0">
                           <p className="text-xs font-black text-white truncate">{cr.students?.name}</p>
                           <p className="text-[9px] font-mono text-slate-400">{cr.start_time.slice(0,5)}—{cr.end_time.slice(0,5)}</p>
                         </div>
                         <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${(cr as any).status === 'pending' ? 'bg-indigo-900 text-indigo-300' : 'bg-slate-700 text-slate-400'}`}>
                           {(cr as any).status}
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No conflicting requests</p>
                    </div>
                  )}
               </div>
            </section>

            {selectedRequest.message && (
               <section className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message from Parent</h4>
                 <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem]">
                    <p className="text-sm font-medium text-indigo-100 leading-relaxed italic">"{selectedRequest.message}"</p>
                 </div>
               </section>
            )}

            <div className="pt-6 border-t border-slate-800 flex flex-col space-y-3">
               <button 
                 onClick={() => handleApprove(selectedRequest)}
                 disabled={isProcessing}
                 className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/40 transition-all active:scale-95 flex items-center justify-center space-x-3"
               >
                 {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                     <span>Approve & Book</span>
                   </>
                 )}
               </button>
               <button 
                 onClick={() => setRejectingRequest(selectedRequest)}
                 disabled={isProcessing}
                 className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center"
               >
                 Decline Request
               </button>
            </div>
          </aside>
        )}
      </div>

      {/* Rejection Modal (Duplicate of logic but with refined UI) */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden animate-in fade-in zoom-in duration-300">
             <div className="px-10 py-8 border-b border-slate-50 bg-red-50/30">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Decline Request</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">For {rejectingRequest.students?.name}</p>
             </div>
             <div className="p-10 space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Optional Reason (Visible to Parent)</label>
                   <textarea 
                     value={rejectionMessage}
                     onChange={(e) => setRejectionMessage(e.target.value)}
                     placeholder="e.g. Sorry, this slot is fully booked. Please try another time."
                     rows={4}
                     className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-50 font-medium transition-all resize-none text-slate-900"
                   />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                   <button onClick={() => setRejectingRequest(null)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                   <button 
                     onClick={handleConfirmReject} 
                     disabled={isProcessing}
                     className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-xl shadow-red-100 transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center"
                   >
                     {isProcessing && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                     Confirm Reject
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingRequests;
