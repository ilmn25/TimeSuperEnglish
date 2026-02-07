import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { BackupFile, Organization } from '../types';
import { useTranslation } from 'react-i18next';

type SortOrder = 'asc' | 'desc';
const MAX_BACKUPS = 10;

const AdminBackup: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [confirmModal, setConfirmModal] = useState<{
    type: 'restore' | 'delete';
    id: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [backupsData, orgData] = await Promise.all([
        api.listBackups(orgId),
        api.getOrganization(orgId)
      ]);
      setBackups(Array.isArray(backupsData) ? backupsData : []);
      setOrganization(orgData);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const sortedBackups = useMemo(() => {
    return [...backups].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [backups, sortOrder]);

  const atLimit = backups.length >= MAX_BACKUPS;

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const handleCreateBackup = async () => {
    if (!orgId) return;
    if (atLimit) {
      showToast(t('backup.error_quota'), true);
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await api.createBackup(orgId);
      showToast(t('backup.success_create'));
      fetchInitialData();
    } catch (err) {
      showToast(t('common.error'), true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!orgId || !e.target.files || e.target.files.length === 0) return;
    if (atLimit) {
      showToast(t('backup.error_quota'), true);
      return;
    }
    const file = e.target.files[0];
    setIsUploading(true);
    setError(null);
    try {
      await api.uploadBackup(orgId, file);
      showToast(t('backup.success_upload'));
      fetchInitialData();
    } catch (err) {
      showToast(t('backup.upload_failed'), true);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (backupId: string) => {
    try {
      const { url } = await api.downloadBackup(backupId);
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `backup-${backupId}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(t('common.download_started'));
      } else {
        throw new Error('No URL');
      }
    } catch (err) {
      showToast(t('backup.download_link_failed'), true);
    }
  };

  const handleDelete = async (backupId: string) => {
    setConfirmModal(null);
    setIsLoading(true);
    try {
      const backupToDelete = backups.find(b => b.id === backupId);
      await api.deleteBackup(backupId);
      if (organization?.backup_time && backupToDelete && organization.backup_time === backupToDelete.created_at) {
        await api.updateOrganizationBackupTime(orgId!, null);
      }
      showToast(t('backup.success_delete'));
      fetchInitialData();
    } catch (err) {
      showToast(t('backup.delete_failed'), true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    setConfirmModal(null);
    setIsLoading(true);
    try {
      const backupToRestore = backups.find(b => b.id === backupId);
      if (!backupToRestore) throw new Error('Backup not found');
      await api.restoreBackup(backupId);
      await api.updateOrganizationBackupTime(orgId!, backupToRestore.created_at);
      showToast(t('backup.success_restore'));
      fetchInitialData();
    } catch (err) {
      showToast(t('backup.restore_failed'), true);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-HK', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formattedNow = now.toLocaleString('en-HK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-20 px-3 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8-4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
             </div>
             <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t('backup.title')}</h2>
          </div>
          <p className="text-slate-500 font-medium text-sm md:text-base">{t('backup.subtitle')}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
             <div className={`px-2.5 py-1 rounded-full border text-[9px] md:text-[10px] font-black uppercase tracking-widest w-fit ${atLimit ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                {backups.length} / {MAX_BACKUPS} {t('backup.snapshots')}
             </div>
             <div className="px-2.5 py-1 rounded-full border border-indigo-100 bg-indigo-50/30 text-indigo-600 text-[9px] md:text-[10px] font-mono font-black uppercase tracking-widest w-fit">
                {formattedNow}
             </div>
             {atLimit && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block w-full sm:w-auto">{t('backup.quota_full')}</span>}
          </div>
        </div>
        
        <div className="flex flex-row md:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".json" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isCreating || atLimit}
            className="group flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 md:px-6 py-3 bg-white border-2 border-slate-100 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all active:scale-95 disabled:opacity-50"
          >
            {isUploading ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : t('backup.upload')}
          </button>

          <button 
            onClick={handleCreateBackup}
            disabled={isCreating || isUploading || atLimit}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 md:space-x-3 px-4 md:px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                <span className="truncate">{t('backup.snapshot')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold animate-in fade-in slide-in-from-top-2 flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-sm font-bold animate-in fade-in slide-in-from-top-2 flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          <span>{success}</span>
        </div>
      )}

      <div className="relative pl-6 sm:pl-10 md:pl-12">
        <div className="absolute left-6 sm:left-[2.75rem] md:left-[3.25rem] top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-indigo-300 to-slate-200 rounded-full" />

        {isLoading ? (
          <div className="space-y-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="relative pl-10 md:pl-12">
                <div className="absolute left-[-1.1rem] md:left-[-1.15rem] top-2 w-9 h-9 md:w-10 md:h-10 bg-slate-100 rounded-full border-4 border-white animate-pulse z-10" />
                <div className="h-32 bg-white rounded-[2rem] border border-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : sortedBackups.length === 0 ? (
          <div className="ml-8 sm:ml-10 md:ml-12 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center">
            <h3 className="text-xl font-black text-slate-400 italic mb-4">{t('backup.empty')}</h3>
            <button onClick={handleCreateBackup} className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline">{t('backup.take_first')}</button>
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12">
            {sortedBackups.map((backup, index) => {
              const isActive = organization?.backup_time === backup.created_at;
              const isFirst = index === 0;
              const isUploaded = !!backup.uploaded;

              return (
                <div key={backup.id} className="relative group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className={`absolute left-[-1.2rem] md:left-[-1.2rem] top-4 md:top-6 w-10 h-10 md:w-11 md:h-11 rounded-full border-[5px] md:border-[6px] border-slate-50 flex items-center justify-center z-20 transition-all group-hover:scale-110 ${isActive ? 'bg-green-500 shadow-lg shadow-green-200 ring-4 ring-green-100' : isFirst ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : isUploaded ? 'bg-teal-500 shadow-lg shadow-teal-100' : 'bg-slate-200'}`}>
                    {isActive ? (
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                       </svg>
                    ) : isFirst && !isUploaded ? (
                       <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                    ) : isUploaded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12" />
                      </svg>
                    ) : null}
                  </div>

                  <div className={`ml-8 sm:ml-10 md:ml-12 bg-white border-2 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 transition-all duration-300 relative ${isActive ? 'border-green-400 shadow-xl shadow-green-50 ring-2 ring-green-50' : isUploaded ? 'border-teal-50 hover:border-teal-400 hover:shadow-2xl hover:shadow-teal-50' : 'border-slate-100 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-50'}`}>
                    <div className="flex flex-wrap gap-1.5 mb-3 md:absolute md:-top-4 md:right-8 md:mb-0">
                      {isActive && (
                        <div className="px-3 py-1 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-green-100 flex items-center space-x-1.5 shrink-0">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          <span>{t('backup.active')}</span>
                        </div>
                      )}
                      {isFirst && !isActive && (
                        <div className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-100 shrink-0">
                          {t('backup.latest')}
                        </div>
                      )}
                      {isUploaded && (
                        <div className="px-3 py-1 bg-teal-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-teal-100 shrink-0">
                          {t('backup.user_upload')}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-3">
                          <span className={`text-lg md:text-xl font-black leading-tight ${isActive ? 'text-green-900' : isUploaded ? 'text-teal-900' : 'text-slate-800'}`}>
                            {formatTimestamp(backup.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                          <span className="text-[10px] md:text-xs font-mono font-bold uppercase tracking-tight opacity-60 truncate max-w-[150px]">ID: {backup.id.slice(0, 8)}...</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                        <button 
                          onClick={() => handleDownload(backup.id)} 
                          className={`flex items-center space-x-2 px-3.5 py-2 md:px-4 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-green-50 text-green-600 hover:bg-green-100' : isUploaded ? 'bg-teal-50 text-teal-600 hover:bg-teal-100' : 'bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          <span>{t('backup.export')}</span>
                        </button>
                        
                        <div className="w-px h-5 bg-slate-100 mx-1 hidden sm:block" />

                        <button 
                          onClick={() => setConfirmModal({ type: 'restore', id: backup.id, date: formatTimestamp(backup.created_at) })} 
                          className="flex items-center space-x-2 px-4 py-2 md:px-5 md:py-2.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>{t('backup.restore')}</span>
                        </button>

                        <div className="w-px h-5 bg-slate-100 mx-1 hidden sm:block" />

                        <button 
                          onClick={() => setConfirmModal({ type: 'delete', id: backup.id, date: formatTimestamp(backup.created_at) })} 
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm overflow-hidden p-10 animate-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmModal.type === 'restore' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={confirmModal.type === 'restore' ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" : "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"} /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{confirmModal.type === 'restore' ? t('backup.restore_point') : t('backup.delete_snapshot')}</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed">{confirmModal.type === 'restore' ? t('backup.restore_msg', { date: confirmModal.date }) : t('backup.delete_msg', { id: confirmModal.id.slice(0,8) })}</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 px-6 py-3 text-xs font-black text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors uppercase tracking-widest">{t('common.cancel')}</button>
              <button onClick={() => confirmModal.type === 'restore' ? handleRestore(confirmModal.id) : handleDelete(confirmModal.id)} className={`flex-1 px-6 py-3 text-xs font-black text-white rounded-xl shadow-lg uppercase tracking-widest ${confirmModal.type === 'restore' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}>
                {confirmModal.type === 'restore' ? t('backup.restore') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBackup;