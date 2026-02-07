import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Student } from '../types';
import { useTranslation } from 'react-i18next';
import { SUPABASE_ORG_ID } from '../services/supabaseClient';

const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

const PortalStudents: React.FC = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form & Action State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ name: '', contact: '', level: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getParentStudents();
      setStudents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsProcessing(true);
    try {
      if (editingStudent) {
        await api.updateStudent(SUPABASE_ORG_ID, editingStudent.id, formData.name, formData.contact, formData.level || undefined);
      } else {
        await api.createPortalStudent(formData.name, formData.contact, formData.level || undefined);
      }
      resetForm();
      fetchStudents();
    } catch (err) {
      alert(editingStudent ? "Failed to update student profile." : "Failed to create student profile.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsProcessing(true);
    try {
      await api.deleteStudent(SUPABASE_ORG_ID, confirmDeleteId);
      setConfirmDeleteId(null);
      fetchStudents();
    } catch (err) {
      alert("Failed to delete student. They may have active bookings.");
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
    <div className="space-y-10 animate-in fade-in duration-500 pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('students.title')}</h2>
          <p className="text-slate-500 font-medium">{t('students.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
          {t('students.register')}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map(i => <div key={i} className="h-32 bg-white border border-slate-100 rounded-[2.5rem] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {students.map(student => (
            <div key={student.id} className="group bg-white border-2 border-slate-100 rounded-[2.5rem] p-4 sm:p-8 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 flex items-center gap-4 sm:gap-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] sm:rounded-[1.25rem] bg-indigo-600 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-xl shrink-0">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate tracking-tight">{student.name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 mt-1">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded border border-indigo-100">{student.level || t('parent.unset')}</span>
                  <span className="text-xs font-bold text-slate-600">{student.contact || t('students.no_contact')}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 shrink-0">
                <button 
                  onClick={() => openEdit(student)}
                  className="p-2 sm:p-3 text-slate-300 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                  title={t('common.edit')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button 
                  onClick={() => setConfirmDeleteId(student.id)}
                  className="p-2 sm:p-3 text-slate-200 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl"
                  title={t('common.delete')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
              <h3 className="text-xl font-black text-slate-900 mb-2">{t('students.no_match')}</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8 font-medium">{t('students.adjust_query')}</p>
              <button onClick={() => setIsFormOpen(true)} className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-700 underline underline-offset-8 transition-all">{t('students.register_now')}</button>
            </div>
          )}
        </div>
      )}

      {/* Profile Form Modal (Used for Create & Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-6 sm:px-10 sm:py-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {editingStudent ? t('students.edit_profile') : t('students.registration')}
              </h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                {editingStudent ? `${t('parent.updating')} ${editingStudent.name}` : t('students.student_data')}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-5 sm:space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.full_name')}</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. John Doe"
                  className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-slate-900" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.grade_level')}</label>
                  <select 
                    value={formData.level} 
                    onChange={e => setFormData({...formData, level: e.target.value})} 
                    className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all appearance-none text-slate-900"
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
                    onChange={e => setFormData({...formData, contact: e.target.value})} 
                    placeholder="e.g. 555-0199"
                    className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-slate-900" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 sm:space-x-4 pt-2 sm:pt-4">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button 
                  type="submit" 
                  disabled={isProcessing} 
                  className="px-6 py-3.5 sm:px-8 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl font-black shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center"
                >
                  {isProcessing && <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  {editingStudent ? t('common.save_changes') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm overflow-hidden p-8 sm:p-10 animate-in fade-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">{t('students.delete_title')}</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-8 sm:mb-10 leading-relaxed">{t('students.delete_msg')}</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-3 text-[10px] font-black text-slate-500 bg-slate-50 rounded-xl uppercase tracking-widest">{t('common.cancel')}</button>
              <button onClick={handleDelete} disabled={isProcessing} className="flex-1 px-4 py-3 text-[10px] font-black text-white rounded-xl bg-red-600 hover:bg-red-700 shadow-lg uppercase tracking-widest transition-all active:scale-95">
                {isProcessing ? '...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalStudents;
