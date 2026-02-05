
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Course } from '../types';
import { useTranslation } from 'react-i18next';

const AdminCourses: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation();
  
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1'
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const data = await api.getCourses(orgId);
      setCourses(data);
    } catch (err) {
      setError('Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [courses, sortOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!formData.name.trim()) return;
    setIsProcessing(true);
    
    try {
      if (editingCourse) {
        await api.updateCourse(orgId, editingCourse.id, formData.name, formData.color);
      } else {
        await api.createCourse(orgId, formData.name, formData.color);
      }
      resetForm();
      fetchCourses();
    } catch (err) {
      alert('Failed to save course');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !orgId) return;
    setIsProcessing(true);
    try {
      await api.deleteCourse(orgId, confirmDeleteId);
      setConfirmDeleteId(null);
      fetchCourses();
    } catch (err) {
      alert('Failed to delete course');
    } finally {
      setIsProcessing(false);
    }
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      color: course.color || '#6366f1'
    });
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingCourse(null);
    setFormData({ name: '', color: '#6366f1' });
    setIsFormOpen(false);
  };

  const getContrastColor = (hexcolor: string) => {
    if (!hexcolor) return '#000000';
    const hex = hexcolor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#ffffff';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('courses.title')}</h2>
          <p className="text-slate-500 mt-1 font-medium">{t('courses.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
            title="Toggle Sort Order"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            {t('courses.add')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-white border border-slate-100 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {sortedCourses.map(course => (
            <div 
              key={course.id} 
              className="group relative bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 overflow-hidden flex flex-col justify-between"
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700"
                style={{ backgroundColor: course.color || '#e2e8f0' }}
              />
              
              <div>
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner mb-6 transition-transform group-hover:rotate-6"
                  style={{ backgroundColor: course.color || '#e2e8f0', color: getContrastColor(course.color) }}
                >
                  {course.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-2">
                  {course.name}
                </h3>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{course.color}</span>
              </div>

              <div className="flex items-center space-x-2 mt-8">
                <button 
                  onClick={() => openEdit(course)}
                  className="flex-1 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all border border-transparent hover:border-indigo-100"
                >
                  {t('common.edit')}
                </button>
                <button 
                  onClick={() => setConfirmDeleteId(course.id)}
                  className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {courses.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t('courses.no_courses')}</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">{t('courses.start_building')}</p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-700 underline underline-offset-8"
              >
                {t('courses.add_now')}
              </button>
            </div>
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingCourse ? t('courses.edit_title') : t('courses.create_title')}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{t('courses.workspace_details')}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">{t('courses.subject_name')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cambridge English"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 text-slate-900 font-bold transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">{t('courses.label_color')}</label>
                <div className="flex items-center space-x-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <input 
                    type="color" 
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-16 w-16 bg-white border-4 border-white cursor-pointer rounded-2xl shadow-sm outline-none shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-700 uppercase font-mono tracking-tighter">{formData.color}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('courses.hex_code')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button type="submit" disabled={isProcessing} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center">
                  {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  {editingCourse ? t('common.save_changes') : t('courses.create_title')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden p-10 animate-in fade-in zoom-in duration-300 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{t('courses.delete_title')}</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed">{t('courses.delete_msg')}</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-6 py-3 text-xs font-black text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors uppercase tracking-widest">{t('common.cancel')}</button>
              <button onClick={handleDelete} disabled={isProcessing} className="flex-1 px-6 py-3 text-xs font-black text-white rounded-xl bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-100 uppercase tracking-widest flex items-center justify-center">
                {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
