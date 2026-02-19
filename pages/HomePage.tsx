
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IMAGES } from '../constants/images';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-12 sm:space-y-32 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      {/* Academy Hero Section */}
      <section className="flex flex-col lg:flex-row items-center gap-12 pt-8">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4 shadow-sm">
            {t('homepage.hero_badge')}
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-none">
            {t('homepage.hero_title')} <br />
            <span className="text-indigo-600">{t('homepage.hero_subtitle')}</span>
          </h1>
          <p className="text-slate-500 text-lg sm:text-xl font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            {t('homepage.hero_desc')}
          </p> 
        </div>
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-indigo-600/5 -rotate-3 rounded-[3rem]" />
          <div className="relative aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
            <img 
              src={IMAGES.HERO} 
              className="w-full h-full object-cover" 
              alt="Education Banner"
            />
          </div>
        </div>
      </section>

      {/* Interactive Engagement Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1 relative group">
           <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-100 to-transparent rounded-[3rem] blur-xl opacity-50" />
           <div className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl">
             <img 
               src={IMAGES.STUDENTS_GROUP} 
               className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
               alt="Group Activity"
             />
           </div>
        </div>
        <div className="order-1 md:order-2 space-y-6">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {t('homepage.community_title_prefix')} <span className="text-indigo-600">{t('homepage.community_title_span')}</span> <br />
            {t('homepage.community_title_suffix')}
          </h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            {t('homepage.community_desc')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
               <span className="block text-2xl font-black text-indigo-600">85%</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('homepage.speaking_focus')}</span>
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
               <span className="block text-2xl font-black text-indigo-600">{t('bookings.only')}</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('homepage.group_sizes')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white rounded-[3rem] border border-slate-100 p-8 sm:p-16 shadow-sm">
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('homepage.about_title')}</h2>
          <div className="space-y-4 text-slate-500 font-medium leading-relaxed">
            <p>
              {t('homepage.about_p1')}
            </p>
            <p>
              {t('homepage.about_p2')}
            </p>
          </div>
          <div className="flex items-center space-x-6 pt-4">
             <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900">P1 - S3</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('homepage.levels_offered')}</span>
             </div>
             <div className="w-px h-10 bg-slate-100" />
             <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900">100%</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('homepage.digital_attendance')}</span>
             </div>
          </div>
        </div>
        <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-slate-100 group shadow-2xl">
           <img 
             src={IMAGES.COMPUTER} 
             className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
             alt="Modern Learning"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/40 to-transparent" />
        </div>
      </section>

      {/* Modern Learning Philosophy */}
      <section className="space-y-12 pb-12">
        <div className="max-w-3xl space-y-6">
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight">
            {t('homepage.philosophy_title_prefix')} <span className="text-indigo-600">{t('homepage.philosophy_title_span')}</span>
          </h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            {t('homepage.philosophy_desc')}
          </p>
          <div className="flex flex-wrap gap-6">
            {[t('homepage.philosophy_feat_1'), t('homepage.philosophy_feat_2'), t('homepage.philosophy_feat_3')].map((item, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                <span className="text-sm font-black text-slate-700 uppercase tracking-widest">{item}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Overlapping Images Layout */}
        <div className="relative flex flex-col items-center justify-center pt-10 sm:pt-20 pb-20 sm:pb-32">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-64 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
           <div className="relative w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-0">
             <div className="relative z-0 w-[90%] md:w-[55%] lg:w-[50%] -rotate-3 transition-all hover:rotate-0 hover:z-30 duration-500 group">
               <div className="aspect-[4/3] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl border-4 sm:border-8 border-white bg-slate-200">
                 <img 
                    src={IMAGES.LEARNING_ENVIRONMENT} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" 
                    alt="Learning Environment" 
                 />
               </div>
             </div>
             <div className="relative z-10 w-[90%] md:w-[55%] lg:w-[50%] -mt-20 md:-mt-0 md:-ml-32 lg:-ml-40 rotate-3 transition-all hover:rotate-0 hover:z-30 duration-500 group">
               <div className="aspect-[4/3] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl border-4 sm:border-8 border-white bg-slate-200">
                 <img 
                    src={IMAGES.ACTIVITY} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" 
                    alt="Class Activity" 
                 />
               </div>
             </div>
           </div>
        </div>
      </section>

      {/* Footer minimal info */}
      <section className="text-center pb-20 pt-10 border-t border-slate-50">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
          {t('homepage.footer_slogan')}
        </p>
      </section>
    </div>
  );
};

export default HomePage;
