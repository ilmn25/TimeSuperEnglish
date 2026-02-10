
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Teacher } from '../types';
import { useTranslation } from 'react-i18next';

type SortField = 'name' | 'contact';
type SortOrder = 'asc' | 'desc';

const AdminTeachers: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation();
  
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: ''
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Access Management State
  const [accessModalTeacher, setAccessModalTeacher] = useState<Teacher | null>(null);
  const [accessEmail, setAccessEmail] = useState('');
  const [linkedAccounts, setLinkedAccounts] = useState<string[]>([]);
  const [orgAdmins, setOrgAdmins] = useState<string[]>([]);
  const [isAccessLoading, setIsAccessLoading] = useState(false);

  const fetchTeachers = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [data, admins] = await Promise.all([
        api.getTeachers(orgId),
        api.getOrgAdmins(orgId)
      ]);
      setTeachers(data);
      setOrgAdmins(admins);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Fetch access list when modal opens
  useEffect(() => {
    const fetchAccess = async () => {
      if (!accessModalTeacher) {
        setLinkedAccounts([]);
        return;
      }
      setIsAccessLoading(true);
      try {
        const ids = await api.getTeacherAccessList(accessModalTeacher.id);
        setLinkedAccounts(ids);
      } catch (err) {
        console.error('Failed to fetch access list', err);
      } finally {
        setIsAccessLoading(false);
      }
    };
    fetchAccess();
  }, [accessModalTeacher]);

  const processedTeachers = useMemo(() => {
    let result = [...teachers];
    
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(tchr => 
        tchr.name.toLowerCase().includes(lowerQuery) || 
        (tchr.contact && tchr.contact.toLowerCase().includes(lowerQuery))
      );
    }

    return result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'contact') {
        comparison = (a.contact || '').localeCompare(b.contact || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [teachers, sortField, sortOrder, searchQuery]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!formData.name.trim()) return;
    setIsProcessing(true);
    
    try {
      if (editingTeacher) {
        await api.updateTeacher(orgId, editingTeacher.id, formData.name, formData.contact || undefined);
      } else {
        await api.createTeacher(orgId, formData.name, formData.contact || undefined);
      }
      resetForm();
      fetchTeachers();
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !orgId) return;
    setIsProcessing(true);
    try {
      await api.deleteTeacher(orgId, confirmDeleteId);
      setConfirmDeleteId(null);
      fetchTeachers();
    } catch (err) {
      alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkAccess = async () => {
    if (!accessModalTeacher || !accessEmail.trim()) return;
    setIsProcessing(true);
    try {
      await api.linkUserToTeacher(accessModalTeacher.id, accessEmail.trim());
      const updatedIds = await api.getTeacherAccessList(accessModalTeacher.id);
      setLinkedAccounts(updatedIds);
      setAccessEmail('');
      fetchTeachers();
    } catch (err: any) {
      alert(err.message || 'Failed to link user.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlinkAccess = async () => {
    if (!accessModalTeacher) return;
    setIsProcessing(true);
    try {
      const userId = linkedAccounts[0];
      if (userId && orgAdmins.includes(userId)) {
        await api.removeAdmin(orgId!, userId);
      }

      await api.unlinkUserFromTeacher(accessModalTeacher.id);
      setLinkedAccounts([]);
      fetchTeachers();
    } catch (err: any) {
      alert(err.message || 'Failed to unlink user.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAdminStatus = async () => {
    if (!orgId || linkedAccounts.length === 0) return;
    const userId = linkedAccounts[0];
    const isAdmin = orgAdmins.includes(userId);
    
    setIsProcessing(true);
    try {
      if (isAdmin) {
        await api.removeAdmin(orgId, userId);
      } else {
        await api.addAdmin(orgId, userId);
      }
      const updatedAdmins = await api.getOrgAdmins(orgId);
      setOrgAdmins(updatedAdmins);
    } catch (err: any) {
      alert('Failed to update admin status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      contact: teacher.contact || ''
    });
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingTeacher(null);
    setFormData({ name: '', contact: '' });
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-0.5 sm:space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('teachers.title')}</h2>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">{t('teachers.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
          {t('teachers.add')}
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
        <div className="relative flex-1 w-full">
           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <input 
             type="text"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder={t('teachers.search')}
             className="w-full pl-11 pr-6 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900 shadow-sm transition-all text-xs sm:text-sm"
           />
        </div>
        <div className="flex items-center w-full md:w-auto bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
           <button 
             onClick={() => toggleSort('name')}
             className={`flex-1 md:flex-none px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${sortField === 'name' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
           >
             {t('teachers.sort_name')} {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
           <button 
             onClick={() => toggleSort('contact')}
             className={`flex-1 md:flex-none px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${sortField === 'contact' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
           >
             {t('teachers.sort_contact')} {sortField === 'contact' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white border border-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {processedTeachers.map(teacher => (
            <div 
              key={teacher.id} 
              className="group bg-white border border-slate-100 rounded-xl p-3 sm:p-4 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                   <h3 className="text-sm font-black text-slate-900 truncate tracking-tight">{teacher.name}</h3>
                   {teacher.user_id && orgAdmins.includes(teacher.user_id) && (
                     <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded border border-amber-100">
                       Admin
                     </span>
                   )}
                </div>
                <div className="flex items-center space-x-1.5 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="text-[10px] font-bold text-slate-600 tracking-tight">{teacher.contact || t('teachers.no_contact')}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button 
                  onClick={() => setAccessModalTeacher(teacher)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-indigo-100 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  <span className="hidden sm:inline">{t('students.access')}</span>
                </button>
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg p-0.5 shrink-0">
                  <button onClick={() => openEdit(teacher)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                  <button onClick={() => setConfirmDeleteId(teacher.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            </div>
          ))}

          {processedTeachers.length === 0 && (
            <div className="py-12 text-center bg-white border border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{t('teachers.no_match')}</p>
            </div>
          )}
        </div>
      )}

      {/* Profile Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingTeacher ? t('teachers.edit_profile') : t('teachers.registration')}</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('teachers.full_name')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('teachers.contact')}</label>
                <input 
                  type="text" 
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="e.g. 555-0199"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center">
                  {isProcessing && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  {editingTeacher ? t('common.save_changes') : t('teachers.register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Modal & Delete Confirmation */}
      {accessModalTeacher && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Teacher Access</h3>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">Manage link for <span className="text-indigo-600">{accessModalTeacher.name}</span></p>
                </div>
                <button onClick={() => setAccessModalTeacher(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="min-h-[100px] flex flex-col items-center justify-center">
                {isAccessLoading ? (
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : linkedAccounts.length > 0 ? (
                  <div className="w-full space-y-6">
                      <div className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <div className="flex items-center space-x-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />
                              <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Authorized User ID</span>
                                  <span className="text-xs font-mono font-bold text-slate-700 truncate max-w-[220px]">{linkedAccounts[0]}</span>
                              </div>
                          </div>
                          <button onClick={handleUnlinkAccess} disabled={isProcessing} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                      </div>

                      <div className="w-full p-4 bg-slate-900 rounded-2xl border border-slate-800">
                          <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Admin Privileges</h4>
                                  <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Manage organization data</p>
                              </div>
                              <button 
                                  onClick={toggleAdminStatus}
                                  disabled={isProcessing}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${orgAdmins.includes(linkedAccounts[0]) ? 'bg-indigo-600' : 'bg-slate-700'}`}
                              >
                                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${orgAdmins.includes(linkedAccounts[0]) ? 'translate-x-5' : 'translate-x-1'}`} />
                              </button>
                          </div>
                      </div>
                  </div>
                ) : (
                  <div className="w-full space-y-6">
                      <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No account linked yet</p>
                      </div>
                      <div className="space-y-4">
                          <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Invite Teacher</label>
                          <div className="flex gap-2">
                              <input 
                                  type="email" 
                                  value={accessEmail}
                                  onChange={(e) => setAccessEmail(e.target.value)}
                                  placeholder="teacher@email.com"
                                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 text-xs font-bold text-slate-900"
                              />
                              <button onClick={handleLinkAccess} disabled={isProcessing || !accessEmail.trim()} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50">
                                  {isProcessing ? '...' : 'Link'}
                              </button>
                          </div>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-sm overflow-hidden p-8 animate-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-2">{t('teachers.delete_title')}</h3>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed">{t('teachers.delete_msg')}</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2.5 text-[10px] font-black text-slate-500 bg-slate-50 rounded-xl uppercase tracking-widest">{t('common.cancel')}</button>
              <button onClick={handleDelete} disabled={isProcessing} className="flex-1 px-4 py-2.5 text-[10px] font-black text-white rounded-xl bg-red-600 hover:bg-red-700 uppercase tracking-widest shadow-lg transition-all active:scale-95">
                {isProcessing ? '...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeachers;
