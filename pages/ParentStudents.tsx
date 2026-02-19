
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Student } from '../types';
import { useTranslation } from 'react-i18next';
import { SUPABASE_ORG_ID } from '../services/supabaseClient';

const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

const ParentStudents: React.FC = () => {
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12 max-w-4xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-0.5 sm:space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('students.title')}</h2>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">{t('students.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
          {t('students.register')}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-16 bg-white border border-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {students.map(student => (
            <div key={student.id} className="group bg-white border border-slate-100 rounded-xl p-4 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight">{student.name}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 mt-0.5">
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100">{student.level || t('parent.unset')}</span>
                  <span className="text-[10px] font-bold text-slate-500">{student.contact || t('students.no_contact')}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 shrink-0">
                <button 
                  onClick={() => openEdit(student)}
                  className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all"
                  title={t('common.edit')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button 
                  onClick={() => setConfirmDeleteId(student.id)}
                  className="p-1.5 text-slate-200 hover:text-red-500 transition-all"
                  title={t('common.delete')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="py-12 text-center bg-white border border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{t('students.no_match')}</p>
            </div>
          )}
        </div>
      )}

      {/* Profile Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {editingStudent ? t('students.edit_profile') : t('students.registration')}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.full_name')}</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. John Doe"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-slate-900" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.grade_level')}</label>
                  <select 
                    value={formData.level} 
                    onChange={e => setFormData({...formData, level: e.target.value})} 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all appearance-none text-slate-900"
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
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold transition-all text-slate-900" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button 
                  type="submit" 
                  disabled={isProcessing} 
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center"
                >
                  {isProcessing && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-sm overflow-hidden p-8 animate-in fade-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-2">{t('students.delete_title')}</h3>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed">{t('students.delete_msg')}</p>
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

export default ParentStudents;
