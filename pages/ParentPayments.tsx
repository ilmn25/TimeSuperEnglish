
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  orgId: string;
}

type PaymentView = 'discrepancies' | 'resolved' | 'upcoming';

const ParentPayments: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [childrenBookings, setChildrenBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<PaymentView>('discrepancies');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStudent, setFilterStudent] = useState('');

  const [studentList, setStudentList] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const students = await api.getParentStudents();
      setStudentList(students || []);
      
      const allBookings: any[] = [];
      await Promise.all(students.map(async (s: any) => {
        const bookings = await api.getStudentBookings(s.id);
        if (bookings) {
          allBookings.push(...bookings.map((b: any) => ({ ...b, students: s })));
        }
      }));
      
      setChildrenBookings(allBookings);
    } catch (err) {
      console.error('Failed to load portal audit data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStudent('');
  };

  const derivedIssues = useMemo(() => {
    const { dateStr: hktToday, timeStr: hktNowTime } = getHKTNowStrings();
    
    return childrenBookings.map(b => {
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
        invoiceStatus,
        orgId: b.org_id
      } as DerivedIssue;
    });
  }, [childrenBookings]);

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

      // 2. Filters
      const matchesSearch = item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.courseName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStudent = !filterStudent || item.booking.student_id === filterStudent;

      return matchesSearch && matchesStudent;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [derivedIssues, activeView, searchQuery, filterStudent]);

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
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Audit Dashboard</h2>
          <p className="text-slate-500 mt-1 font-medium">Verify attendance and payment status</p>
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
               placeholder="Search course..."
               className="w-full pl-11 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-xs font-bold text-slate-700"
             />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <select 
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer"
            >
              <option value="">All Children</option>
              {studentList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
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
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Child</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Attendance</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedIssues.map(item => {
                  const invoiceId = Array.isArray(item.booking.invoices) ? item.booking.invoices[0]?.id : item.booking.invoices?.id;
                  return (
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
                      <td className="px-8 py-5 text-center">
                         <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border ${getAttendanceStyle(item.attendanceStatus)}`}>
                            {item.attendanceStatus}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                         <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border ${getInvoiceStyle(item.invoiceStatus)}`}>
                            {item.invoiceStatus === 'awaiting_payment' ? 'Awaiting' : item.invoiceStatus}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {invoiceId && (
                            <button 
                              onClick={() => navigate(`/portal/parent/invoices/${invoiceId}`)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
                            >
                              View Invoice
                            </button>
                          )}
                          {!invoiceId && item.attendanceStatus === 'attended' && (
                             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Awaiting Billing</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {processedIssues.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center text-slate-400 font-bold italic text-sm bg-slate-50/20">
                      {activeView === 'discrepancies' ? 'No payment discrepancies found!' : activeView === 'upcoming' ? 'No upcoming sessions.' : 'No resolution history found.'}
                    </td>
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

export default ParentPayments;
