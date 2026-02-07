
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CounterAbout: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto space-y-24 py-8 sm:py-12 lg:py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="text-center space-y-6 px-4">
        <div className="inline-flex items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4 shadow-sm">
          {t('about_page.hero_badge')}
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85]">
          {t('about_page.hero_title_part1')} <span className="text-indigo-600 italic">{t('about_page.hero_title_italic')}</span> <br className="hidden sm:block" /> {t('about_page.hero_title_part2')}
        </h1>
        <p className="text-slate-500 text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          {t('about_page.hero_desc')}
        </p>
      </section>

      {/* Full-Stack Infrastructure Grid */}
      <section className="px-4">
        <div className="bg-slate-900 rounded-[4rem] p-10 sm:p-16 lg:p-24 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full -mr-64 -mt-64 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full -ml-64 -mb-64 blur-[120px]" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
                  {t('about_page.full_stack_title')} <br/> <span className="text-indigo-400 italic">{t('about_page.full_stack_italic')}</span>
                </h2>
                <p className="text-slate-400 font-bold leading-relaxed max-w-md text-lg">
                  {t('about_page.full_stack_desc')}
                </p>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
                {[
                  { label: t('about_page.core_db'), desc: t('about_page.core_db_desc') },
                  { label: t('about_page.auto_payments'), desc: t('about_page.auto_payments_desc') },
                  { label: t('about_page.client_portals'), desc: t('about_page.client_portals_desc') },
                  { label: t('about_page.live_attendance'), desc: t('about_page.live_attendance_desc') },
                  { label: t('about_page.seamless_migration'), desc: t('about_page.seamless_migration_desc') },
                  { label: t('about_page.brandless_ui'), desc: t('about_page.brandless_ui_desc') },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-4">
                    <div className="mt-2 w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_15px_rgba(99,102,241,1)]" />
                    <div>
                      <span className="block text-[11px] font-black text-white uppercase tracking-[0.2em] mb-1">{item.label}</span>
                      <span className="text-[12px] text-slate-500 font-bold leading-relaxed">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 sm:p-12 space-y-8 shadow-2xl">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-[1.5rem] flex items-center justify-center text-indigo-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{t('about_page.ai_studio_title')}</h3>
                <p className="text-slate-400 text-base font-medium leading-relaxed">
                  {t('about_page.ai_studio_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="text-center pt-8">
         <Link to="/" className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
           {t('about_page.return_home')}
         </Link>
      </div>
    </div>
  );
};

export default CounterAbout;
