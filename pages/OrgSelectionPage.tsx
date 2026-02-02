
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';
import { Organization } from '../types';
import { useTranslation } from 'react-i18next';

const OrgSelectionPage: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const { t } = useTranslation();

  // CRUD State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const navigate = useNavigate();

  const fetchOrgs = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const mappedOrgs = await api.getOrganizations();
      setOrgs(mappedOrgs);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleOrgSelect = (orgId: string) => {
    navigate(`/org/${orgId}/attendance`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsProcessing(true);

    try {
      if (editingOrg) {
        await api.updateOrganization(editingOrg.id, formData.name);
      } else {
        await api.createOrganization(formData.name);
      }
      resetForm();
      fetchOrgs();
    } catch (err) {
      console.error(err);
      alert('Failed to save organization. Please check your ownership permissions.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsProcessing(true);
    try {
      await api.deleteOrganization(confirmDeleteId);
      setConfirmDeleteId(null);
      fetchOrgs();
    } catch (err) {
      console.error(err);
      alert('Failed to delete organization. Only owners can delete a workspace.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openEdit = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrg(org);
    setFormData({ name: org.name });
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingOrg(null);
    setFormData({ name: '' });
    setIsFormOpen(false);
  };
  
  const orgToDelete = orgs.find(org => org.id === confirmDeleteId);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('org.select')}</h2>
          <p className="text-slate-500 mt-1">{t('org.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          <span>{t('org.new')}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgs.map((org) => {
            const isOwner = org.owner === currentUserId;
            return (
              <div
                key={org.id}
                onClick={() => handleOrgSelect(org.id)}
                className="group relative bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 cursor-pointer active:scale-[0.99]"
              >
                <div className="absolute top-4 right-4 flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                  {isOwner && (
                    <>
                      <button 
                        onClick={(e) => openEdit(org, e)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-100 transition-colors"
                        title={t('common.edit')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(org.id); setDeleteConfirmationInput(''); }} 
                        className="p-2 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-slate-100 transition-colors"
                        title={t('common.delete')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </>
                  )}
                </div>
                
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                  <span className="text-xl font-black text-indigo-600 group-hover:text-white transition-colors">
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1 pr-16 truncate">
                  {org.name}
                </h3>
                
                <div className="flex items-center space-x-2 mt-2">
                  {isOwner ? (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded-md">
                      {t('org.owner')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-md">
                      {t('org.member')}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={org.id}>
                    ID: {org.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            );
          })}
          
          {orgs.length === 0 && (
            <div className="col-span-full text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{t('org.no_orgs')}</h3>
              <p className="text-slate-500 text-sm mb-6">{t('org.start_create')}</p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="text-indigo-600 font-bold hover:text-indigo-700 text-sm"
              >
                {t('org.create_new')} &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editingOrg ? t('org.edit') : t('org.new')}</h3>
                <p className="text-slate-500 text-xs">{t('org.details')}</p>
              </div>
              <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t('org.name')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. My School"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm flex items-center"
                >
                  {isProcessing && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                  {editingOrg ? t('common.save_changes') : t('org.create_new')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && orgToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 animate-in fade-in zoom-in duration-200 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{t('org.delete_title')}</h3>
            <p className="text-slate-500 text-sm mb-6">{t('org.delete_msg')}</p>

            <div className="space-y-4">
              <label htmlFor="delete-confirm-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('org.name')}</label>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-slate-900 font-medium"
                placeholder={orgToDelete.name}
                autoComplete="off"
                autoFocus
              />
            </div>
            
            <div className="flex space-x-4 mt-8">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors">{t('common.cancel')}</button>
              <button 
                onClick={handleDelete} 
                disabled={isProcessing || deleteConfirmationInput !== orgToDelete.name} 
                className="flex-1 px-6 py-3 text-sm font-bold text-white rounded-2xl bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgSelectionPage;
