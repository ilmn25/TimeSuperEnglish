
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useTranslation } from 'react-i18next';

const AuthPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Unify logic: Try to sign in first. If it fails, attempt to sign up.
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        // If login fails, attempt to create an account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) throw signUpError;

        // If user is created but needs email confirmation
        if (signUpData.user && !signUpData.session) {
          alert(t('auth.check_email'));
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="p-8 sm:p-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{t('app.name')}</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-10">{t('auth.access')}</p>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-4">
            <div className="text-left">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('auth.email')}</label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700"
              />
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('auth.password')}</label>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700"
              />
            </div>

            {errorMsg && (
              <p className="text-[11px] font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                {errorMsg}
              </p>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                "Sign In / Register"
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 border-t border-slate-100 p-6 text-center">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">{t('app.dashboard')} • {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
