
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

const getHKTNowStrings = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
  const timeStr = now.toLocaleTimeString("en-GB", { 
    timeZone: "Asia/Hong_Kong", 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return { dateStr, timeStr };
};

type AttendanceStatus = 'attended' | 'missed' | 'upcoming';
type InvoiceStatus = 'waived' | 'paid' | 'awaiting_payment' | 'unbilled';

interface DerivedIssue {
  id: string;
  booking: any;
  studentName: string;
  courseName: string;
  date: string;
  start: string;
  end: string;
  attendanceStatus: AttendanceStatus;
  invoiceStatus: InvoiceStatus;
}

type PaymentView = 'discrepancies' | 'resolved' | 'upcoming';

const AdminPayments: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState<PaymentView>('discrepancies');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAttendance, setFilterAttendance] = useState<AttendanceStatus | ''>('');
  const [filterInvoice, setFilterInvoice] = useState<InvoiceStatus | ''>('');

  const [rescheduleModalItem, setRescheduleModalItem] = useState<DerivedIssue | null>(null);
  const [rescheduleFormData, setRescheduleFormData] = useState({
    date: '',
    start: '',
    end: ''
  });

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const data = await api.getAllBookings(orgId);
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings for audit', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterAttendance('');
    setFilterInvoice('');
  };

  // DERIVE DISCREPANCIES
  const derivedIssues = useMemo(() => {
    const { dateStr: hktToday, timeStr: hktNowTime } = getHKTNowStrings();
    
    return bookings.map(b => {
      const hasAttendance = !!b.check_in || !!b.check_out;
      const invoiceData = b.invoices;
      const invoice = Array.isArray(invoiceData) ? invoiceData[0] : invoiceData;
      const invoiceStatusRaw = invoice?.status;
      const invoiceAmount = invoice?.amount ?? 0;
      
      const bookingEndWithSec = b.end.length === 5 ? `${b.end}:00` : b.end;
      const isPast = (b.date < hktToday) || (b.date === hktToday && bookingEndWithSec < hktNowTime);

      let attendanceStatus: AttendanceStatus = 'upcoming';
      if (hasAttendance) attendanceStatus = 'attended';
      else if (isPast) attendanceStatus = 'missed';

      let invoiceStatus: InvoiceStatus = 'unbilled';
      if (invoiceStatusRaw === 'paid') {
        invoiceStatus = invoiceAmount === 0 ? 'waived' : 'paid';
      } else if (invoiceStatusRaw === 'issued') {
        invoiceStatus = 'awaiting_payment';
      }

      return {
        id: b.id,
        booking: b,
        studentName: b.students?.name || 'Unknown',
        courseName: b.courses?.name || 'Unknown',
        date: b.date,
        start: b.start,
        end: b.end,
        attendanceStatus,
        invoiceStatus
      } as DerivedIssue;
    });
  }, [bookings]);

  const processedIssues = useMemo(() => {
    return derivedIssues.filter(item => {
      // 1. View Selection Filter
      if (activeView === 'upcoming') {
        if (item.attendanceStatus !== 'upcoming') return false;
      } else if (activeView === 'resolved') {
        const isClean = item.attendanceStatus === 'attended' && (item.invoiceStatus === 'paid' || item.invoiceStatus === 'waived');
        if (!isClean) return false;
      } else if (activeView === 'discrepancies') {
        const isProblem = 
          (item.attendanceStatus === 'attended' && item.invoiceStatus !== 'paid' && item.invoiceStatus !== 'waived') ||
          (item.attendanceStatus === 'missed');
        if (!isProblem) return false;
      }

      // 2. Multi-Dimension Filters
      const matchesSearch = item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.courseName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAttendance = !filterAttendance || item.attendanceStatus === filterAttendance;
      const matchesInvoice = !filterInvoice || item.invoiceStatus === filterInvoice;

      return matchesSearch && matchesAttendance && matchesInvoice;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [derivedIssues, activeView, searchQuery, filterAttendance, filterInvoice]);

  const handleApproveReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalItem || !orgId) return;
    setIsProcessing(true);
    try {
      await api.updateBooking(orgId, rescheduleModalItem.id, {
        date: rescheduleFormData.date,
        start: rescheduleFormData.start,
        end: rescheduleFormData.end,
        check_in: null,
        check_out: null
      });
      setRescheduleModalItem(null);
      await fetchData();
    } catch (err) {
      alert('Reschedule failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm("Permanently delete this missed booking?")) return;
    setIsProcessing(true);
    try {
      await api.deleteBooking(orgId!, id);
      await fetchData();
    } catch (err) {
      alert('Deletion failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const navigateToCreateInvoice = (item: DerivedIssue) => {
    navigate(`/org/${orgId}/invoices/new?studentId=${item.booking.student_id}&bookingId=${item.id}`);
  };

  const getAttendanceStyle = (status: AttendanceStatus) => {
    switch (status) {
      case 'attended': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'missed': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'upcoming': return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  const getInvoiceStyle = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid': return 'bg-emerald-600 text-white border-emerald-600';
      case 'waived': return 'bg-indigo-600 text-white border-indigo-600';
      case 'awaiting_payment': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'unbilled': return 'bg-slate-100 text-slate-400 border-slate-200';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Payments & Audit</h2>
          <p className="text-slate-500 mt-1 font-medium">Verify attendance against billing and resolve discrepancies</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
        <div className="flex p-1.5 bg-white border border-slate-200 rounded-[1.75rem] shadow-sm w-full lg:w-auto shrink-0">
          <button 
            onClick={() => { setActiveView('discrepancies'); clearFilters(); }}
            className={`px-6 py-2.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'discrepancies' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Discrepancies
          </button>
          <button 
            onClick={() => { setActiveView('upcoming'); clearFilters(); }}
            className={`px-6 py-2.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'upcoming' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => { setActiveView('resolved'); clearFilters(); }}
            className={`px-6 py-2.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'resolved' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Resolved
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-4 shadow-sm flex flex-col md:flex-row items-center gap-4 flex-1 w-full">
          <div className="relative flex-1 w-full">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <input 
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Search student or course..."
               className="w-full pl-11 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-xs font-bold text-slate-700"
             />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {activeView === 'discrepancies' && (
              <select 
                value={filterAttendance}
                onChange={(e) => setFilterAttendance(e.target.value as any)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="attended">Attended</option>
                <option value="missed">Missed</option>
              </select>
            )}
            <button 
              onClick={clearFilters}
              className="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-20 flex justify-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedIssues.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap">
                       <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">{item.date}</span>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-sm font-black text-slate-900">{item.studentName}</span>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-xs font-bold text-slate-600">{item.courseName}</span>
                    </td>
                    <td className="px-8 py-5">
                       <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border ${getAttendanceStyle(item.attendanceStatus)}`}>
                          {item.attendanceStatus}
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border ${getInvoiceStyle(item.invoiceStatus)}`}>
                          {item.invoiceStatus === 'awaiting_payment' ? 'Awaiting' : item.invoiceStatus}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {activeView === 'discrepancies' && (
                          <>
                            {/* CASE: PAID + MISSED */}
                            {item.attendanceStatus === 'missed' && (item.invoiceStatus === 'paid' || item.invoiceStatus === 'waived') && (
                              <>
                                <button 
                                  onClick={() => { setRescheduleModalItem(item); setRescheduleFormData({ date: item.date, start: item.start.slice(0,5), end: item.end.slice(0,5) }); }}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
                                >
                                  Reschedule
                                </button>
                                <button 
                                  onClick={() => navigate(`/org/${orgId}/invoices/${item.booking.invoice_id}`)}
                                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                                >
                                  Refund / Edit
                                </button>
                              </>
                            )}

                            {/* CASE: UNPAID + MISSED */}
                            {item.attendanceStatus === 'missed' && (item.invoiceStatus === 'unbilled' || item.invoiceStatus === 'awaiting_payment') && (
                              <>
                                <button 
                                  onClick={() => handleCancelBooking(item.id)}
                                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                                >
                                  Cancel Booking
                                </button>
                                <button 
                                  onClick={() => { setRescheduleModalItem(item); setRescheduleFormData({ date: item.date, start: item.start.slice(0,5), end: item.end.slice(0,5) }); }}
                                  className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                >
                                  Reschedule
                                </button>
                              </>
                            )}

                            {/* CASE: ATTENDED + UNBILLED */}
                            {item.attendanceStatus === 'attended' && item.invoiceStatus === 'unbilled' && (
                              <button onClick={() => navigateToCreateInvoice(item)} disabled={isProcessing} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-sm">Create Invoice</button>
                            )}
                            
                            {/* CASE: ATTENDED + AWAITING */}
                            {item.attendanceStatus === 'attended' && item.invoiceStatus === 'awaiting_payment' && (
                              <button 
                                onClick={() => navigate(`/org/${orgId}/invoices/${item.booking.invoice_id}`)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
                              >
                                View Invoice
                              </button>
                            )}
                          </>
                        )}
                        
                        {activeView === 'upcoming' && (
                          <>
                            {item.invoiceStatus === 'unbilled' ? (
                              <button onClick={() => navigateToCreateInvoice(item)} disabled={isProcessing} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all">Pre-bill</button>
                            ) : (
                              <button 
                                onClick={() => navigate(`/org/${orgId}/invoices/${item.booking.invoice_id}`)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
                              >
                                View Invoice
                              </button>
                            )}
                            <button 
                              onClick={() => { setRescheduleModalItem(item); setRescheduleFormData({ date: item.date, start: item.start.slice(0,5), end: item.end.slice(0,5) }); }}
                              className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-indigo-600 transition-all"
                            >
                              Edit
                            </button>
                          </>
                        )}

                        {activeView === 'resolved' && (
                           <button 
                             onClick={() => navigate(`/org/${orgId}/invoices/${item.booking.invoice_id}`)}
                             className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm"
                           >
                             Details
                           </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {processedIssues.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center text-slate-400 font-bold italic text-sm bg-slate-50/20">
                      {activeView === 'discrepancies' ? 'Everything looks perfectly aligned!' : activeView === 'upcoming' ? 'No upcoming sessions scheduled.' : 'No resolution history found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModalItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-slate-50 bg-indigo-50/30">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Reschedule Session</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                For {rescheduleModalItem.studentName}
              </p>
            </div>
            
            <form onSubmit={handleApproveReschedule} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">New Date</label>
                <input 
                  type="date" 
                  required
                  value={rescheduleFormData.date}
                  onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, date: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Start</label>
                  <input 
                    type="time" 
                    required
                    value={rescheduleFormData.start}
                    onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, start: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">End</label>
                  <input 
                    type="time" 
                    required
                    value={rescheduleFormData.end}
                    onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, end: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <button type="button" onClick={() => setRescheduleModalItem(null)} className="px-4 py-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Cancel</button>
                <button type="submit" disabled={isProcessing} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center">
                  {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  Save Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
