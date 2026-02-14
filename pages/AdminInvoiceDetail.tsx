
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Invoice } from '../types';
import { useTranslation } from 'react-i18next';

const AdminInvoiceDetail: React.FC = () => {
  const { orgId, invoiceId } = useParams<{ orgId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    method: 'cash',
    amount: 0,
    status: 'issued' as Invoice['status']
  });

  const fetchInvoiceDetail = useCallback(async () => {
    if (!invoiceId) return;
    setIsLoading(true);
    try {
      const data = await api.getInvoice(invoiceId);
      if (data) {
        setInvoice(data);
        setBookings(Array.isArray(data.bookings) ? data.bookings : (data.bookings ? [data.bookings] : []));
        setFormData({
          method: data.method,
          amount: data.amount,
          status: data.status
        });
      }
    } catch (err) {
      console.error('Failed to load invoice detail', err);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [fetchInvoiceDetail]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;
    setIsProcessing(true);
    try {
      const updateData: any = {
        method: formData.method,
        amount: formData.amount,
        status: formData.status
      };
      
      if (formData.status === 'paid' && invoice?.status !== 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else if (formData.status !== 'paid' && invoice?.status === 'paid') {
        updateData.paid_at = null;
      }

      await api.updateInvoice(invoiceId, updateData);
      setIsEditMode(false);
      await fetchInvoiceDetail();
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string, amount: number) => {
    if (status === 'paid' && amount === 0) return 'bg-indigo-100 text-indigo-700';
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'issued': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabelFormatted = (status: string, amount: number) => {
    if (status === 'paid' && amount === 0) return t('status.waived');
    return t(`status.${status}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{t('invoices.loading_detail')}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-black text-slate-900">{t('invoices.not_found')}</h3>
        <button onClick={() => navigate(`/org/${orgId}/invoices`)} className="mt-4 text-indigo-600 font-bold hover:underline">{t('invoices.back_to_list')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(`/org/${orgId}/invoices`)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span>{t('nav.back')}</span>
        </button>
        
        {!isEditMode && (
          <button 
            onClick={() => setIsEditMode(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span>{t('common.edit')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16" />
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('invoices.id')}</span>
                  <h2 className="text-2xl font-black text-slate-900 font-mono">#{invoice.id.slice(0, 8).toUpperCase()}</h2>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getStatusColor(invoice.status, invoice.amount)}`}>
                  {getStatusLabelFormatted(invoice.status, invoice.amount)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('invoices.amount_due')}</span>
                  <p className="text-3xl font-black text-indigo-600">{invoice.currency} {invoice.amount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('invoices.payment_method')}</span>
                  <p className="text-lg font-bold text-slate-700 capitalize">{invoice.method}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('invoices.issued_at')}</span>
                  <p className="text-sm font-bold text-slate-600">{new Date(invoice.issued_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('invoices.paid_at')}</span>
                  <p className="text-sm font-bold text-slate-600">{invoice.paid_at ? new Date(invoice.paid_at).toLocaleString() : '--'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
              {t('invoices.linked_bookings')}
            </h3>
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.date')} & {t('bookings.time')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.course')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('bookings.student')}</th>
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
                  {bookings.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">No bookings linked.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {isEditMode ? (
            <div className="bg-white border-2 border-indigo-500 rounded-[2.5rem] p-8 shadow-xl animate-in zoom-in duration-300">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">{t('invoices.edit_settings')}</h4>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('invoices.column_amount')}</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('invoices.column_method')}</label>
                  <select 
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="stripe">Stripe</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('invoices.column_status')}</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900"
                  >
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="pt-4 space-y-3">
                  <button type="submit" disabled={isProcessing} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center">
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('common.save_changes')}
                  </button>
                  <button type="button" onClick={() => setIsEditMode(false)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.cancel')}</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8 shadow-xl">
               <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('invoices.summary')}</span>
                  <div className="mt-6 space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-bold">{t('invoices.invoiced_to')}</span>
                        <span className="font-black text-sm">{bookings[0]?.students?.name || 'N/A'}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-bold">{t('invoices.main_course')}</span>
                        <span className="font-black text-sm">{bookings[0]?.courses?.name || 'N/A'}</span>
                     </div>
                     <div className="h-px bg-slate-800" />
                     <div className="flex items-center justify-between">
                        <span className="text-indigo-400 text-xs font-black uppercase">{t('invoices.total')}</span>
                        <span className="text-xl font-black">{invoice.currency} {invoice.amount.toFixed(2)}</span>
                     </div>
                  </div>
               </div>
               
               <button 
                 onClick={() => window.print()}
                 className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                 {t('invoices.print')}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInvoiceDetail;
