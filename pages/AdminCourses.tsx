
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Course } from '../types';
import { useTranslation } from 'react-i18next';

const AdminCourses: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-0.5 sm:space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('courses.title')}</h2>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">{t('courses.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
            {t('courses.add')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedCourses.map(course => (
            <div 
              key={course.id} 
              className="group bg-white border border-slate-100 rounded-xl p-3 sm:p-4 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex items-center gap-4"
            >
              <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: course.color || '#e2e8f0' }} />
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{course.name}</h3>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{course.color}</span>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button 
                  onClick={() => navigate(`/org/${orgId}/courses/${course.id}/schedule`)}
                  className="hidden md:block px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-lg text-[8px] uppercase tracking-widest transition-all"
                >
                  {t('courses.manage_schedule')}
                </button>
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg p-0.5">
                  <button onClick={() => openEdit(course)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                  <button onClick={() => setConfirmDeleteId(course.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            </div>
          ))}

          {courses.length === 0 && (
            <div className="py-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{t('courses.no_courses')}</p>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingCourse ? t('courses.edit_title') : t('courses.create_title')}</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('courses.subject_name')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('courses.subject_name')}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 text-slate-900 font-bold transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('courses.label_color')}</label>
                <div className="flex items-center space-x-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10 w-10 bg-white border-2 border-white cursor-pointer rounded-lg shadow-sm outline-none shrink-0" />
                  <span className="text-xs font-black text-slate-700 font-mono uppercase tracking-tighter">{formData.color}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center">
                  {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                  {editingCourse ? t('common.save') : t('common.create')}
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
            <h3 className="text-lg font-black text-slate-900 mb-2">{t('courses.delete_title')}</h3>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed">{t('courses.delete_msg')}</p>
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

export default AdminCourses;
