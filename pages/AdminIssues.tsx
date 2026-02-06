
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Booking, Issue, Student, Course } from '../types';
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

type UnifiedIssue = {
  id?: string; // If undefined, it's a detected problem not yet in DB
  booking_id: string;
  issue_type: 'missed_booking' | 'adhoc_booking';
  resolution: string | 'unrecorded'; // 'unrecorded' for detected but not saved
  date: string;
  student_name: string;
  course_name: string;
  booking: Booking;
  created_at?: string;
};

type SortField = 'date' | 'student' | 'course' | 'type' | 'status';
type SortOrder = 'asc' | 'desc';

const AdminIssues: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { t } = useTranslation();
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [issuesData, bookingsData] = await Promise.all([
        api.getIssues(orgId),
        api.getAllBookings(orgId)
      ]);
      setIssues(issuesData || []);
      setBookings(bookingsData || []);
    } catch (err) {
      console.error('Failed to load issues data', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Merge recorded issues and detected problems into one list
  const unifiedDiscrepancies = useMemo(() => {
    const { dateStr: hktToday, timeStr: hktNowTime } = getHKTNowStrings();
    const existingIssueBookingIds = new Map(issues.map(i => [i.booking_id, i]));
    
    const allItems: UnifiedIssue[] = [];

    // Add recorded issues
    issues.forEach(issue => {
      if (issue.bookings) {
        allItems.push({
          id: issue.id,
          booking_id: issue.booking_id,
          issue_type: issue.issue_type,
          resolution: issue.resolution,
          date: issue.bookings.date,
          student_name: issue.bookings.students?.name || 'Unknown',
          course_name: issue.bookings.courses?.name || 'Unknown',
          booking: issue.bookings,
          created_at: issue.created_at
        });
      }
    });

    // Add unrecorded detected problems
    bookings.forEach(b => {
      if (existingIssueBookingIds.has(b.id)) return;

      const isAttended = !!b.check_in || !!b.check_out;
      const isAdhoc = isAttended && !b.invoice_id;
      const bookingEndWithSec = b.end.length === 5 ? `${b.end}:00` : b.end;
      const isPassed = (b.date < hktToday) || (b.date === hktToday && bookingEndWithSec < hktNowTime);
      const isMissed = isPassed && !isAttended && !!b.invoice_id;

      if (isMissed || isAdhoc) {
        allItems.push({
          booking_id: b.id,
          issue_type: isAdhoc ? 'adhoc_booking' : 'missed_booking',
          resolution: 'unrecorded',
          date: b.date,
          student_name: b.students?.name || 'Unknown',
          course_name: b.courses?.name || 'Unknown',
          booking: b
        });
      }
    });

    return allItems;
  }, [bookings, issues]);

  // Apply filtering and sorting
  const processedDiscrepancies = useMemo(() => {
    let filtered = unifiedDiscrepancies.filter(item => {
      const matchesSearch = item.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.course_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !filterType || item.issue_type === filterType;
      const matchesStatus = !filterStatus || item.resolution === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date': comparison = a.date.localeCompare(b.date); break;
        case 'student': comparison = a.student_name.localeCompare(b.student_name); break;
        case 'course': comparison = a.course_name.localeCompare(b.course_name); break;
        case 'type': comparison = a.issue_type.localeCompare(b.issue_type); break;
        case 'status': comparison = a.resolution.localeCompare(b.resolution); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [unifiedDiscrepancies, searchQuery, filterType, filterStatus, sortField, sortOrder]);

  const handleCreateIssue = async (bookingId: string, type: 'missed_booking' | 'adhoc_booking') => {
    setIsProcessing(true);
    try {
      await api.createIssue({
        booking_id: bookingId,
        issue_type: type,
        resolution: 'pending'
      });
      await fetchData();
    } catch (err) {
      alert('Failed to create issue');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateResolution = async (issueId: string, resolution: string) => {
    setIsProcessing(true);
    try {
      await api.updateIssue(issueId, { resolution });
      await fetchData();
    } catch (err) {
      alert('Failed to update resolution');
    } finally {
      setIsProcessing(false);
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

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="ml-1 text-[10px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const stats = useMemo(() => {
    return {
      pending: unifiedDiscrepancies.filter(i => i.resolution === 'pending').length,
      resolved: unifiedDiscrepancies.filter(i => i.resolution !== 'pending' && i.resolution !== 'unrecorded').length,
      unrecorded: unifiedDiscrepancies.filter(i => i.resolution === 'unrecorded').length
    };
  }, [unifiedDiscrepancies]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('issues.title')}</h2>
          <p className="text-slate-500 mt-1 font-medium">{t('issues.subtitle')}</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-[2rem] px-6 py-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('issues.detected_problems')}</span>
              <span className="text-xl font-black text-red-500 leading-none">{stats.unrecorded}</span>
            </div>
            <div className="w-px h-6 bg-slate-100 mx-2" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('issues.pending')}</span>
              <span className="text-xl font-black text-orange-500 leading-none">{stats.pending}</span>
            </div>
            <div className="w-px h-6 bg-slate-100 mx-2" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('issues.resolved')}</span>
              <span className="text-xl font-black text-emerald-500 leading-none">{stats.resolved}</span>
            </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <input 
             type="text"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="Search by student or course..."
             className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-sm font-bold text-slate-700"
           />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-slate-600 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="missed_booking">{t('issues.missed_booking')}</option>
            <option value="adhoc_booking">{t('issues.adhoc_booking')}</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-slate-600 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="unrecorded">Unrecorded</option>
            <option value="pending">{t('issues.pending')}</option>
            <option value="reschedule">{t('issues.reschedule')}</option>
            <option value="refund">{t('issues.refund')}</option>
            <option value="waived">{t('issues.waived')}</option>
            <option value="billing">{t('issues.billing')}</option>
          </select>

          <button 
            onClick={() => { setSearchQuery(''); setFilterType(''); setFilterStatus(''); }}
            className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Reset
          </button>
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
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('date')}>Date {renderSortArrow('date')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('student')}>Student {renderSortArrow('student')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('course')}>Course {renderSortArrow('course')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('type')}>Type {renderSortArrow('type')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('status')}>Resolution {renderSortArrow('status')}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedDiscrepancies.map(item => (
                  <tr key={item.booking_id} className={`hover:bg-slate-50 transition-colors ${item.resolution === 'unrecorded' ? 'bg-red-50/20' : ''}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                       <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">{item.date}</span>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-sm font-black text-slate-900">{item.student_name}</span>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-xs font-bold text-slate-600">{item.course_name}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${item.issue_type === 'missed_booking' ? 'text-red-500 bg-red-50' : 'text-amber-500 bg-amber-50'}`}>
                        {item.issue_type === 'missed_booking' ? t('issues.missed_booking') : t('issues.adhoc_booking')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${
                           item.resolution === 'unrecorded' ? 'bg-red-400 animate-pulse' :
                           item.resolution === 'pending' ? 'bg-orange-400' : 'bg-emerald-500'
                         }`} />
                         <span className={`text-[10px] font-black uppercase tracking-widest ${
                           item.resolution === 'unrecorded' ? 'text-red-500' :
                           item.resolution === 'pending' ? 'text-orange-500' : 'text-emerald-600'
                         }`}>
                           {item.resolution === 'unrecorded' ? 'UNRECORDED' : t(`issues.${item.resolution}`)}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {item.resolution === 'unrecorded' ? (
                          <button 
                            onClick={() => handleCreateIssue(item.booking_id, item.issue_type)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                          >
                            {t('issues.create_issue')}
                          </button>
                        ) : item.resolution === 'pending' ? (
                          <>
                            {item.issue_type === 'missed_booking' ? (
                              <>
                                <button onClick={() => handleUpdateResolution(item.id!, 'reschedule')} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">{t('issues.reschedule')}</button>
                                <button onClick={() => handleUpdateResolution(item.id!, 'refund')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">{t('issues.refund')}</button>
                                <button onClick={() => handleUpdateResolution(item.id!, 'waived')} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all active:scale-95">{t('issues.waived')}</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleUpdateResolution(item.id!, 'billing')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-sm">{t('issues.mark_as_billing')}</button>
                                <button onClick={() => handleUpdateResolution(item.id!, 'waived')} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all active:scale-95">{t('issues.mark_as_waived')}</button>
                              </>
                            )}
                          </>
                        ) : (
                          <button onClick={() => handleUpdateResolution(item.id!, 'pending')} className="p-2 text-slate-300 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {processedDiscrepancies.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-bold italic text-sm">No issues found matching your criteria.</td>
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

export default AdminIssues;
