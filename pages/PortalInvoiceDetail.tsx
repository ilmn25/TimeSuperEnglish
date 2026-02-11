
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Invoice } from '../types';
import { useTranslation } from 'react-i18next';

const PortalInvoiceDetail: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  const fetchInvoiceDetail = useCallback(async () => {
    if (!invoiceId) return;
    setIsLoading(true);
    try {
      const data = await api.getInvoice(invoiceId);
      if (data) {
        setInvoice(data);
        setBookings(Array.isArray(data.bookings) ? data.bookings : (data.bookings ? [data.bookings] : []));
      }
    } catch (err) {
      console.error('Failed to load portal invoice detail', err);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [fetchInvoiceDetail]);

  const handlePayNow = async () => {
    if (!invoiceId) return;
    setIsPaying(true);
    try {
      const result = await api.createInvoicePaymentSession([invoiceId]);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (err: any) {
      console.error('Payment initialization failed', err);
      alert(err.message || "Failed to initialize payment. Please try again or contact the academy.");
    } finally {
      setIsPaying(false);
    }
  };

  const getStatusColor = (status: string, amount: number) => {
    if (status === 'paid' && amount === 0) return 'bg-indigo-100 text-indigo-700';
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'issued': return 'bg-amber-100 text-amber-700'; // Changed to yellow (amber)
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-black text-slate-900">Invoice Not Found</h3>
        <button onClick={() => navigate('/portal/invoices')} className="mt-4 text-indigo-600 font-bold hover:underline">Back to Invoices</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-4 sm:px-0">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/portal/invoices')}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span>{t('nav.back')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16" />
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Invoice ID</span>
                  <h2 className="text-2xl font-black text-slate-900 font-mono">#{invoice.id.slice(0, 8).toUpperCase()}</h2>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getStatusColor(invoice.status, invoice.amount)}`}>
                  {invoice.status === 'paid' && invoice.amount === 0 ? 'waived' : invoice.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Due</span>
                  <p className="text-3xl font-black text-indigo-600">{invoice.currency} {invoice.amount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</span>
                  <p className="text-lg font-bold text-slate-700 capitalize">{invoice.method || 'Not specified'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued Date</span>
                  <p className="text-sm font-bold text-slate-600">{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Date</span>
                  <p className="text-sm font-bold text-slate-600">{invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
              Session Details
            </h3>
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Student</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.map((b: any) => (
                    <tr key={b.id}>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{b.date}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{b.start.slice(0,5)}—{b.end.slice(0,5)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.courses?.color }} />
                           <span className="text-xs font-bold text-slate-700">{b.courses?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-xs font-black text-slate-900">{b.students?.name}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8 shadow-xl">
               <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Payment Status</span>
                  <div className="mt-6 space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-bold">Child</span>
                        <span className="font-black text-sm">{bookings[0]?.students?.name || 'N/A'}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-bold">Total Sessions</span>
                        <span className="font-black text-sm">{bookings.length}</span>
                     </div>
                     <div className="h-px bg-slate-800" />
                     <div className="flex items-center justify-between">
                        <span className="text-indigo-400 text-xs font-black uppercase">Total Amount</span>
                        <span className="text-xl font-black">{invoice.currency} {invoice.amount.toFixed(2)}</span>
                     </div>
                  </div>
               </div>
               
               <div className="space-y-3">
                 {invoice.status === 'issued' && (
                    <button 
                      onClick={handlePayNow}
                      disabled={isPaying}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isPaying ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      )}
                      {isPaying ? 'Processing...' : 'Pay Now'}
                    </button>
                 )}
                 <button 
                   onClick={() => window.print()}
                   className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                   Print Receipt
                 </button>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PortalInvoiceDetail;
