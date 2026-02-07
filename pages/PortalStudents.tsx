import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Student } from '../types';
import { useTranslation } from 'react-i18next';

const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

const PortalStudents: React.FC = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact: '', level: '' });

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
      await api.createPortalStudent(formData.name, formData.contact, formData.level || undefined);
      setIsFormOpen(false);
      setFormData({ name: '', contact: '', level: '' });
      fetchStudents();
    } catch (err) {
      alert("Failed to create student profile.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('students.title')}</h2>
          <p className="text-slate-500 font-medium">Manage students linked to your account.</p>
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
            <div key={student.id} className="group bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 flex items-center gap-8">
              <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shrink-0">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-slate-900 truncate tracking-tight">{student.name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 mt-1">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded border border-indigo-100">{student.level || 'Unset'}</span>
                  <span className="text-xs font-bold text-slate-600">{student.contact || t('students.no_contact')}</span>
                </div>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
              <h3 className="text-xl font-black text-slate-900 mb-2">No students found</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8 font-medium">Register your first student to get started with the portal.</p>
              <button onClick={() => setIsFormOpen(true)} className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-700 underline underline-offset-8 transition-all">Add Student Now</button>
            </div>
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('students.registration')}</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Add a new student to your portal</p>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.full_name')}</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.grade_level')}</label>
                  <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold">
                    <option value="">{t('students.select')}</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('students.contact')}</label>
                  <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold" />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-4 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button type="submit" disabled={isProcessing} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl text-xs uppercase tracking-widest flex items-center">
                  {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalStudents;