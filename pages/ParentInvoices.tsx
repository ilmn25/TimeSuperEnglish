
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Invoice } from '../types';
import { useTranslation } from 'react-i18next';

type SortField = 'date' | 'amount' | 'status' | 'student';
type SortOrder = 'asc' | 'desc';

const ParentInvoices: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayingAll, setIsPayingAll] = useState(false);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const students = await api.getParentStudents();
      const allInvoices: Invoice[] = [];
      
      for (const s of students) {
        const bookings = await api.getStudentBookings(s.id);
        bookings.forEach((b: any) => {
          if (b.invoices) {
            const invs = Array.isArray(b.invoices) ? b.invoices : [b.invoices];
            invs.forEach((inv: any) => {
              if (inv && !allInvoices.find(ai => ai.id === inv.id)) {
                allInvoices.push({
                    ...inv,
                    bookings: { ...b, students: s }
                });
              }
            });
          }
        });
      }
      
      setInvoices(allInvoices);
    } catch (err) {
      console.error('Failed to load portal invoices', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processedInvoices = useMemo(() => {
    let filtered = invoices.filter(inv => {
      const studentName = inv.bookings?.students?.name || '';
      const courseName = inv.bookings?.courses?.name || '';
      return studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             inv.id.includes(searchQuery);
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date': comparison = (a.issued_at || '').localeCompare(b.issued_at || ''); break;
        case 'amount': comparison = a.amount - b.amount; break;
        case 'status': comparison = a.status.localeCompare(b.status); break;
        case 'student': comparison = (a.bookings?.students?.name || '').localeCompare(b.bookings?.students?.name || ''); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [invoices, searchQuery, sortField, sortOrder]);

  const unpaidInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status === 'issued');
  }, [invoices]);

  const totalUnpaidAmount = useMemo(() => {
    return unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  }, [unpaidInvoices]);

  const handlePayAll = async () => {
    if (unpaidInvoices.length === 0) return;
    setIsPayingAll(true);
    try {
      const invoiceIds = unpaidInvoices.map(inv => inv.id);
      const result = await api.createInvoicePaymentSession(invoiceIds);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setIsPayingAll(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
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

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('nav.invoices')}</h2>
          <p className="text-slate-500 mt-1 font-medium">Review and settle payments for your children</p>
        </div>
        
        {unpaidInvoices.length > 1 && (
           <button 
             onClick={handlePayAll}
             disabled={isPayingAll}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-[0.15em] flex items-center gap-3 disabled:opacity-50"
           >
             {isPayingAll ? (
               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
             )}
             Pay All ({unpaidInvoices.length}) • HKD {totalUnpaidAmount.toFixed(2)}
           </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <input 
             type="text"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="Search by student, course, or ID..."
             className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-sm font-bold text-slate-700"
           />
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
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white" onClick={() => toggleSort('date')}>Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white" onClick={() => toggleSort('student')}>Child {sortField === 'student' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white" onClick={() => toggleSort('amount')}>Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white" onClick={() => toggleSort('status')}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/portal/parent/invoices/${inv.id}`)}>
                    <td className="px-6 py-5 whitespace-nowrap">
                       <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-sm font-black text-slate-900">{inv.bookings?.students?.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-xs font-bold text-slate-600">{inv.bookings?.courses?.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-sm font-black text-indigo-600">{inv.currency} {inv.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{inv.method}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${getStatusColor(inv.status, inv.amount)}`}>
                        {inv.status === 'paid' && inv.amount === 0 ? 'waived' : inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <button 
                         onClick={(e) => { e.stopPropagation(); navigate(`/portal/parent/invoices/${inv.id}`); }}
                         className="p-2 text-slate-300 hover:text-indigo-600 transition-all bg-slate-50 rounded-lg hover:bg-indigo-50"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                       </button>
                    </td>
                  </tr>
                ))}
                {processedInvoices.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-bold italic text-sm">No invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentInvoices;
