
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const CounterPricing: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20 px-4 py-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[9px] font-black uppercase tracking-[0.3em] mb-2 shadow-sm">
          {t('pricing_page.badge')}
        </div>
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">{t('subscriptions.title')}</h2>
        <p className="text-slate-500 font-medium max-w-xl mx-auto text-lg leading-relaxed">{t('subscriptions.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-8">
        {/* Monthly Plan Card */}
        <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col transition-all duration-500 hover:shadow-2xl hover:border-indigo-100 shadow-sm">
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('subscriptions.monthly_title')}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">{t('subscriptions.monthly_desc')}</p>
            </div>
            <div className="text-4xl font-black text-slate-900">
              {t('subscriptions.monthly_price')}
            </div>
            <ul className="space-y-4 pt-4">
              {[
                t('subscriptions.unlimited_students'),
                t('subscriptions.attendance_control'),
                t('subscriptions.advanced_export'),
                t('subscriptions.priority_backups')
              ].map((feat, i) => (
                <li key={i} className="flex items-center space-x-3 text-slate-600 font-bold text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link 
            to="/login"
            className="mt-10 w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-100 text-center active:scale-95"
          >
            {t('pricing.get_started')}
          </Link>
        </div>

        {/* Lifetime Plan Card */}
        <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col transition-all duration-500 hover:shadow-2xl hover:border-indigo-100 relative overflow-hidden shadow-sm">
          <div className="absolute top-6 right-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
            {t('subscriptions.best_value')}
          </div>
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('subscriptions.lifetime_title')}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">{t('subscriptions.lifetime_desc')}</p>
            </div>
            <div className="text-4xl font-black text-slate-900">
              {t('subscriptions.lifetime_price')}
            </div>
            <ul className="space-y-4 pt-4">
              {[
                t('subscriptions.everything_monthly'),
                t('subscriptions.one_time'),
                t('subscriptions.no_fees'),
                t('subscriptions.future_updates')
              ].map((feat, i) => (
                <li key={i} className="flex items-center space-x-3 text-slate-600 font-bold text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link 
            to="/login"
            className="mt-10 w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 text-center active:scale-95"
          >
            {t('pricing.claim_access')}
          </Link>
        </div>
      </div>
      
      <div className="text-center pt-8">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
          {t('pricing_page.hero_desc')}
        </p>
      </div>
    </div>
  );
};

export default CounterPricing;
