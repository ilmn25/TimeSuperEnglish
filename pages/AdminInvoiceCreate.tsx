
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Student } from '../types';
import { useTranslation } from 'react-i18next';

const AdminInvoiceCreate: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const initialStudentId = searchParams.get('studentId');
  const initialBookingId = searchParams.get('bookingId');

  const [student, setStudent] = useState<Student | null>(null);
  const [unbilledBookings, setUnbilledBookings] = useState<any[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    method: 'cash',
    currency: 'HKD',
    status: 'paid' as 'paid' | 'issued',
    customAmount: null as number | null
  });

  const fetchData = useCallback(async () => {
    if (!orgId || !initialStudentId) return;
    setIsLoading(true);
    try {
      // Fetch unbilled bookings for this student
      const allBookings = await api.getAllBookings(orgId, { student_id: initialStudentId });
      // Filter for those without an invoice ID
      const unbilled = allBookings.filter((b: any) => !b.invoice_id);
      setUnbilledBookings(unbilled);
      
      // Auto-select the initial booking if it exists
      if (initialBookingId) {
        setSelectedBookingIds(new Set([initialBookingId]));
      }

      // Identify student name from bookings or fetch student separately if needed
      if (unbilled.length > 0) {
        setStudent(unbilled[0].students);
      } else {
        const students = await api.getStudents(orgId);
        const match = students.find((s: Student) => s.id === initialStudentId);
        setStudent(match || null);
      }
    } catch (err) {
      console.error('Failed to load data for invoice creation', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, initialStudentId, initialBookingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleBooking = (id: string) => {
    const next = new Set(selectedBookingIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBookingIds(next);
  };

  const calculatedTotal = useMemo(() => {
    return unbilledBookings
      .filter(b => selectedBookingIds.has(b.id))
      .reduce((sum, b) => sum + (b.courses?.price || 0), 0);
  }, [unbilledBookings, selectedBookingIds]);

  const finalAmount = formData.customAmount !== null ? formData.customAmount : calculatedTotal;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBookingIds.size === 0) {
      alert(t('invoices.select_at_least_one'));
      return;
    }
    if (!orgId) return;
    setIsProcessing(true);
    try {
      await api.createInvoice({
        org_id: orgId,
        booking_ids: Array.from(selectedBookingIds),
        method: formData.status === 'paid' ? formData.method : 'none',
        amount: finalAmount,
        currency: formData.currency,
        status: formData.status
      });
      navigate(`/org/${orgId}/payments`);
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{t('invoices.preparing')}</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-black text-slate-900">{t('students.no_match')}</h3>
        <button onClick={() => navigate(`/org/${orgId}/payments`)} className="mt-4 text-indigo-600 font-bold hover:underline">{t('nav.back')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(`/org/${orgId}/payments`)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span>{t('nav.back')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center space-x-4 mb-8">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {student.name.charAt(0).toUpperCase()}
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{student.name}</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('invoices.select_sessions')}</p>
                 </div>
              </div>

              <div className="space-y-3">
                 {unbilledBookings.map(b => (
                   <div 
                     key={b.id} 
                     onClick={() => toggleBooking(b.id)}
                     className={`p-5 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${selectedBookingIds.has(b.id) ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-50 hover:border-slate-200 bg-slate-50/50'}`}
                   >
                     <div className="flex items-center space-x-4">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedBookingIds.has(b.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white group-hover:border-indigo-300'}`}>
                           {selectedBookingIds.has(b.id) && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div>
                           <div className="flex items-center space-x-2">
                              <span className="text-sm font-black text-slate-900">{b.courses?.name}</span>
                              <div className="w-1 h-1 bg-slate-200 rounded-full" />
                              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">{b.date}</span>
                           </div>
                           <p className="text-[10px] font-mono text-slate-500">{b.start.slice(0,5)} — {b.end.slice(0,5)}</p>
                        </div>
                     </div>
                     <span className="text-sm font-black text-slate-900">{formData.currency} {b.courses?.price || 0}</span>
                   </div>
                 ))}
                 {unbilledBookings.length === 0 && (
                   <div className="py-20 text-center text-slate-400 italic">{t('invoices.no_unbilled')}</div>
                 )}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl sticky top-28">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                {t('invoices.group_summary')}
              </h3>

              <form onSubmit={handleCreate} className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('invoices.selected_sessions')}</span>
                      <span className="text-sm font-black text-slate-900">{selectedBookingIds.size}</span>
                   </div>
                   <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('invoices.total_amount')}</span>
                      <div className="text-right">
                         <div className="text-2xl font-black text-slate-900">{formData.currency} {finalAmount.toFixed(2)}</div>
                         {formData.customAmount !== null && (
                            <button type="button" onClick={() => setFormData({...formData, customAmount: null})} className="text-[9px] font-bold text-indigo-500 hover:underline">{t('invoices.reset_auto')}</button>
                         )}
                      </div>
                   </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('invoices.custom_amount')}</label>
                  <input 
                    type="number" 
                    value={formData.customAmount || ''}
                    onChange={(e) => setFormData({...formData, customAmount: e.target.value ? parseFloat(e.target.value) : null})}
                    placeholder={t('invoices.custom_amount_placeholder')}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Currency</label>
                  <input 
                    type="text" 
                    required
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('invoices.payment_status')}</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900"
                  >
                    <option value="paid">{t('invoices.pay_immediately')}</option>
                    <option value="issued">{t('invoices.issued_awaiting')}</option>
                  </select>
                </div>

                {formData.status === 'paid' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('invoices.payment_method')}</label>
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
                )}

                <button 
                  type="submit" 
                  disabled={isProcessing || selectedBookingIds.size === 0} 
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                >
                  {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {t('invoices.generate_btn')}
                </button>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInvoiceCreate;
