
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Booking, Issue } from '../types';
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

const IssuesPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { t } = useTranslation();
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const problems = useMemo(() => {
    const { dateStr: hktToday, timeStr: hktNowTime } = getHKTNowStrings();
    const existingIssueBookingIds = new Set(issues.map(i => i.booking_id));
    
    return bookings.filter(b => {
      if (existingIssueBookingIds.has(b.id)) return false;

      const isAttended = !!b.check_in || !!b.check_out;
      const isAdhoc = isAttended && !b.invoice_id;

      const bookingEndWithSec = b.end.length === 5 ? `${b.end}:00` : b.end;
      const isPassed = (b.date < hktToday) || (b.date === hktToday && bookingEndWithSec < hktNowTime);
      const isMissed = isPassed && !isAttended && !!b.invoice_id;

      return isMissed || isAdhoc;
    }).map(b => {
       const isAttended = !!b.check_in || !!b.check_out;
       const isAdhoc = isAttended && !b.invoice_id;
       return {
         booking: b,
         type: isAdhoc ? 'adhoc_booking' : 'missed_booking' as 'missed_booking' | 'adhoc_booking'
       };
    });
  }, [bookings, issues]);

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
      const resolvedAt = (resolution !== 'pending') ? new Date().toISOString() : null;
      await api.updateIssue(issueId, { resolution, resolved_at: resolvedAt });
      await fetchData();
    } catch (err) {
      alert('Failed to update resolution');
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(() => {
    return {
      pending: issues.filter(i => i.resolution === 'pending').length,
      resolved: issues.filter(i => i.resolution !== 'pending').length,
      problems: problems.length
    };
  }, [issues, problems]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('issues.title')}</h2>
          <p className="text-slate-500 mt-1 font-medium">{t('issues.subtitle')}</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-[2rem] px-6 py-3 shadow-sm">
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

      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-6 bg-red-500 rounded-full" />
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('issues.detected_problems')}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t('issues.problems_subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {problems.map(({ booking, type }) => (
            <div key={booking.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:border-indigo-500 transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${type === 'missed_booking' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {type === 'missed_booking' ? t('issues.missed_booking') : t('issues.adhoc_booking')}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{booking.date}</span>
                </div>
                
                <div className="space-y-1 mb-6">
                  <h4 className="text-lg font-black text-slate-900 truncate">{booking.students?.name}</h4>
                  <p className="text-xs font-bold text-slate-500">{booking.courses?.name} • <span className="font-mono">{booking.start.slice(0, 5)}-{booking.end.slice(0, 5)}</span></p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase italic">
                    {type === 'adhoc_booking' ? '✓ Attended (Unbilled)' : '✗ Absent (Already Billed)'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => handleCreateIssue(booking.id, type)}
                disabled={isProcessing}
                className="w-full py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
              >
                {t('issues.create_issue')}
              </button>
            </div>
          ))}
          {problems.length === 0 && !isLoading && (
            <div className="col-span-full py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
              <p className="text-slate-400 font-bold italic text-sm">{t('issues.no_problems')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('issues.active_issues')}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t('issues.active_subtitle')}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-20 flex justify-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Discrepancy</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolution</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issues.map(issue => (
                    <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{issue.bookings?.students?.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{issue.bookings?.courses?.name} • {issue.bookings?.date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${issue.issue_type === 'missed_booking' ? 'text-red-500 bg-red-50' : 'text-amber-500 bg-amber-50'}`}>
                          {issue.issue_type === 'missed_booking' ? t('issues.missed_booking') : t('issues.adhoc_booking')}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${issue.resolution === 'pending' ? 'bg-orange-400' : 'bg-emerald-500'}`} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${issue.resolution === 'pending' ? 'text-orange-500' : 'text-emerald-600'}`}>
                             {t(`issues.${issue.resolution}`)}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {issue.resolution === 'pending' ? (
                            <>
                              {issue.issue_type === 'missed_booking' ? (
                                <>
                                  <button onClick={() => handleUpdateResolution(issue.id, 'reschedule')} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">{t('issues.reschedule')}</button>
                                  <button onClick={() => handleUpdateResolution(issue.id, 'refund')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">{t('issues.refund')}</button>
                                  <button onClick={() => handleUpdateResolution(issue.id, 'waived')} className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all">{t('issues.waived')}</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleUpdateResolution(issue.id, 'billing')} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all">{t('issues.mark_as_billing')}</button>
                                  <button onClick={() => handleUpdateResolution(issue.id, 'waived')} className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all">{t('issues.mark_as_waived')}</button>
                                </>
                              )}
                            </>
                          ) : (
                            <button onClick={() => handleUpdateResolution(issue.id, 'pending')} className="p-2 text-slate-300 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {issues.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-bold italic text-sm">{t('issues.no_issues')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default IssuesPage;
