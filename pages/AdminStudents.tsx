
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Student } from '../types';
import { useTranslation } from 'react-i18next';

const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

const AdminStudents: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation();
  
  const [sortField, setSortField] = useState<'name' | 'level'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    level: ''
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Access Management State
  const [accessModalStudent, setAccessModalStudent] = useState<Student | null>(null);
  const [accessEmail, setAccessEmail] = useState('');
  const [linkedEmails, setLinkedEmails] = useState<string[]>([]);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [confirmUnlinkEmail, setConfirmUnlinkEmail] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const data = await api.getStudents(orgId);
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch access list when modal opens
  useEffect(() => {
    const fetchAccess = async () => {
      if (!accessModalStudent) {
        setLinkedEmails([]);
        return;
      }
      setIsAccessLoading(true);
      try {
        const emails = await api.getStudentAccessList(accessModalStudent.id);
        setLinkedEmails(emails);
      } catch (err) {
        console.error('Failed to fetch access list', err);
      } finally {
        setIsAccessLoading(false);
      }
    };
    fetchAccess();
  }, [accessModalStudent]);

  const processedStudents = useMemo(() => {
    let result = [...students];
    
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(lowerQuery) || 
        (s.contact && s.contact.toLowerCase().includes(lowerQuery)) ||
        (s.level && s.level.toLowerCase().includes(lowerQuery))
      );
    }

    return result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'level') {
        const indexA = a.level ? LEVELS.indexOf(a.level) : -1;
        const indexB = b.level ? LEVELS.indexOf(b.level) : -1;
        comparison = indexA - indexB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [students, sortField, sortOrder, searchQuery]);

  const toggleSort = (field: 'name' | 'level') => {
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
      if (editingStudent) {
        await api.updateStudent(orgId, editingStudent.id, formData.name, formData.contact, formData.level || undefined);
      } else {
        await api.createStudent(orgId, formData.name, formData.contact, formData.level || undefined);
      }
      resetForm();
      fetchStudents();
    } catch (err) {
      alert('Failed to save student');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !orgId) return;
    setIsProcessing(true);
    try {
      await api.deleteStudent(orgId, confirmDeleteId);
      setConfirmDeleteId(null);
      fetchStudents();
    } catch (err) {
      alert('Failed to delete student');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkAccess = async () => {
    if (!accessModalStudent || !accessEmail.trim()) return;
    setIsProcessing(true);
    try {
      await api.linkUserToStudent(accessModalStudent.id, accessEmail.trim());
      const updatedEmails = await api.getStudentAccessList(accessModalStudent.id);
      setLinkedEmails(updatedEmails);
      setAccessEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to link user.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlinkAccess = async () => {
    if (!accessModalStudent || !confirmUnlinkEmail) return;
    
    setIsProcessing(true);
    try {
      await api.unlinkUserFromStudent(accessModalStudent.id, confirmUnlinkEmail);
      const updatedEmails = await api.getStudentAccessList(accessModalStudent.id);
      setLinkedEmails(updatedEmails);
      setConfirmUnlinkEmail(null);
    } catch (err: any) {
      alert(err.message || 'Failed to unlink user.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      contact: student.contact || '',
      level: student.level || ''
    });
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({ name: '', contact: '', level: '' });
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-0.5 sm:space-y-1">
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">{t('students.title')}</h2>
          <p className="text-slate-500 font-medium text-sm sm:text-lg">{t('students.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-[1.5rem] font-black shadow-lg sm:shadow-xl shadow-indigo-100 transition-all active:scale-95 text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          {t('students.register')}
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
        <div className="relative flex-1 w-full">
           <div className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <input 
             type="text"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder={t('students.search')}
             className="w-full pl-11 sm:pl-14 pr-6 sm:pr-8 py-3.5 sm:py-5 bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold text-slate-900 shadow-sm transition-all text-sm sm:text-lg"
           />
        </div>
        <div className="flex items-center w-full md:w-auto bg-white border border-slate-200 rounded-xl sm:rounded-[1.5rem] p-1 shadow-sm shrink-0 overflow-x-auto no-scrollbar">
           <button 
             onClick={() => toggleSort('name')}
             className={`flex-1 md:flex-none px-4 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all whitespace-nowrap ${sortField === 'name' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
           >
             {t('students.sort_name')} {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
           <button 
             onClick={() => toggleSort('level')}
             className={`flex-1 md:flex-none px-4 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all whitespace-nowrap ${sortField === 'level' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
           >
             {t('students.sort_level')} {sortField === 'level' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 sm:space-y-6">
          {[1, 2, 3].map(i => <div key={i} className="h-20 sm:h-32 bg-white border border-slate-100 rounded-2xl sm:rounded-[2.5rem] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-6">
          {processedStudents.map(student => (
            <div 
              key={student.id} 
              className="group bg-white border-2 border-slate-100 rounded-2xl sm:rounded-[2.5rem] p-3.5 sm:p-8 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 flex items-center gap-3 sm:gap-8"
            >
              <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-[1.75rem] bg-indigo-600 flex items-center justify-center text-white text-lg sm:text-3xl font-black shadow-md sm:shadow-xl shrink-0">
                {student.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 sm:mb-3">
                   <h3 className="text-base sm:text-2xl font-black text-slate-900 truncate tracking-tight">{student.name}</h3>
                   {student.level && (
                     <span className="hidden sm:inline-flex px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">
                       {student.level}
                     </span>
                   )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
                  {student.level && (
                    <span className="sm:hidden text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                      {student.level}
                    </span>
                  )}
                  <div className="flex items-center space-x-1.5 sm:space-x-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="text-[10px] sm:text-sm font-bold text-slate-600 tracking-tight">{student.contact || t('students.no_contact')}</span>
                  </div>
                  <div className="hidden sm:flex items-center space-x-2 opacity-60">
                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="text-[10px] font-mono tracking-widest uppercase font-bold">ID: {student.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 sm:space-x-4 shrink-0">
                <button 
                  onClick={() => setAccessModalStudent(student)}
                  className="p-2 sm:px-6 sm:py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl sm:rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-100 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:mr-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  <span className="hidden sm:inline">{t('students.access')}</span>
                </button>
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl sm:rounded-[1.25rem] p-0.5 sm:p-1.5 shrink-0">
                  <button 
                    onClick={() => openEdit(student)} 
                    className="p-2 sm:p-3 text-slate-300 hover:text-indigo-600 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(student.id)} 
                    className="p-2 sm:p-3 text-slate-200 hover:text-red-500 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {processedStudents.length === 0 && (
            <div className="py-16 sm:py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem] sm:rounded-[3rem]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">{t('students.no_match')}</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6 sm:mb-8 font-medium">{t('students.adjust_query')}</p>
              <button onClick={() => { setSearchQuery(''); fetchStudents(); }} className="text-indigo-600 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] hover:text-indigo-700 underline underline-offset-8 transition-all">{t('students.clear_filters')}</button>
            </div>
          )}
        </div>
      )}

      {/* Registration Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-6 sm:px-10 sm:py-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{editingStudent ? t('students.edit_profile') : t('students.registration')}</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{t('students.student_data')}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-5 sm:space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.full_name')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.grade_level')}</label>
                  <select 
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all appearance-none text-slate-900"
                  >
                    <option value="">{t('students.select')}</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.contact')}</label>
                  <input 
                    type="text" 
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="e.g. 555-0199"
                    className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all text-slate-900"
                />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 sm:space-x-4 pt-2 sm:pt-4">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-3.5 sm:px-8 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl font-black shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center">
                  {isProcessing && <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  {editingStudent ? t('common.save_changes') : t('students.register_now')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Management Modal */}
      {accessModalStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-6 sm:px-10 sm:py-8 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center justify-between">
                 <div>
                   <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">{t('students.dashboard_access')}</h3>
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{t('students.manage_links')} <span className="text-indigo-600">{accessModalStudent.name}</span></p>
                 </div>
                 <button onClick={() => setAccessModalStudent(null)} className="p-2 text-slate-400 hover:text-slate-600">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
            </div>
            
            <div className="p-6 sm:p-10 space-y-6 sm:space-y-10">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 ml-1">{t('students.authorized_parents')}</label>
                <div className="space-y-2 sm:space-y-3">
                  {isAccessLoading ? (
                    <div className="py-8 flex justify-center">
                      <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : linkedEmails.length > 0 ? (
                    linkedEmails.map(email => (
                      <div key={email} className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl group">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                           <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500" />
                           <span className="text-xs sm:text-sm font-bold text-slate-700 truncate max-w-[150px] sm:max-w-none">{email}</span>
                        </div>
                        <button 
                          onClick={() => setConfirmUnlinkEmail(email)}
                          disabled={isProcessing}
                          className="p-2 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 sm:py-12 text-center bg-slate-50/50 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('students.no_accounts')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 sm:pt-8 border-t border-slate-100">
                <div className="bg-indigo-50/30 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-indigo-100/50">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 sm:mb-4 ml-1">{t('students.invite')}</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input 
                      type="email" 
                      value={accessEmail}
                      onChange={(e) => setAccessEmail(e.target.value)}
                      placeholder="parent@email.com"
                      className="flex-1 px-4 py-3 sm:px-5 sm:py-4 bg-white border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 text-xs sm:text-sm font-bold shadow-sm text-slate-900"
                    />
                    <button 
                      onClick={handleLinkAccess}
                      disabled={isProcessing || !accessEmail.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? '...' : t('students.link')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmUnlinkEmail && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={() => setConfirmUnlinkEmail(null)}>
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-sm overflow-hidden p-8 sm:p-10 animate-in fade-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">{t('students.unlink_title')}</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-8 sm:mb-10 leading-relaxed">{t('students.unlink_msg')}<br/><span className="font-bold text-slate-900">{confirmUnlinkEmail}</span>?</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmUnlinkEmail(null)} className="flex-1 px-4 py-3 text-[10px] font-black text-slate-500 bg-slate-50 rounded-xl uppercase tracking-widest">{t('common.cancel')}</button>
              <button onClick={handleUnlinkAccess} disabled={isProcessing} className="flex-1 px-4 py-3 text-[10px] font-black text-white rounded-xl bg-red-600 hover:bg-red-700 transition-all shadow-lg uppercase tracking-widest">
                {isProcessing ? '...' : t('students.unlink')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm overflow-hidden p-8 sm:p-10 animate-in fade-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">{t('students.delete_title')}</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-8 sm:mb-10 leading-relaxed">{t('students.delete_msg')}</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-3 text-[10px] font-black text-slate-500 bg-slate-50 rounded-xl uppercase tracking-widest">{t('common.cancel')}</button>
              <button onClick={handleDelete} disabled={isProcessing} className="flex-1 px-4 py-3 text-[10px] font-black text-white rounded-xl bg-red-600 hover:bg-red-700 shadow-lg uppercase tracking-widest">
                {isProcessing ? '...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
