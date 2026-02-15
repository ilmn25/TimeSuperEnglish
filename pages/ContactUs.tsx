import React from 'react';
import { useTranslation } from 'react-i18next';

const ContactUs: React.FC = () => {
  const { t } = useTranslation();

  const contactItems = [
    {
      label: t('contact_page.phone'),
      value: t('contact_page.phone_val'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
    {
      label: t('contact_page.office_hours'),
      value: t('contact_page.office_hours_val'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 px-4 sm:px-6 lg:px-8">
      
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] shadow-sm">
            {t('nav.contact')}
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-none">
            {t('contact_page.hero_title')} <br />
            <span className="text-indigo-600 italic">{t('contact_page.hero_italic')}</span>
          </h2>
          <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed max-w-xl">
            {t('contact_page.subtitle')}
          </p>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* WhatsApp Button */}
          <a 
            href="https://wa.me/85293194533" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex flex-col items-center text-center p-5 bg-emerald-50 border border-emerald-100 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-emerald-100/50 hover:-translate-y-1 active:scale-95"
          >
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform mb-3">
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.12.551 4.189 1.597 6.048L0 24l6.117-1.605a11.803 11.803 0 005.925 1.577h.005c6.632 0 12.032-5.4 12.035-12.034a11.761 11.761 0 00-3.517-8.414z"/>
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-900 leading-none">{t('contact_page.whatsapp_btn')}</h4>
              <p className="text-emerald-700/60 text-[9px] font-black uppercase tracking-widest mt-1.5">+852 9319 4533</p>
            </div>
          </a>

          {/* Facebook Button */}
          <a 
            href="https://www.facebook.com/TimeSuperEnglish/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex flex-col items-center text-center p-5 bg-blue-50 border border-blue-100 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 active:scale-95"
          >
            <div className="w-12 h-12 bg-[#1877F2] rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform mb-3">
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-black text-blue-900 leading-none">{t('contact_page.facebook_btn')}</h4>
              <p className="text-blue-700/60 text-[9px] font-black uppercase tracking-widest mt-1.5">{t('status.accepted')}</p>
            </div>
          </a>

          {/* Email Button */}
          <a 
            href="mailto:admin@time-super.com" 
            className="group flex flex-col items-center text-center p-5 bg-slate-50 border border-slate-100 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 active:scale-95"
          >
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 leading-none">{t('contact_page.email_btn')}</h4>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1.5">admin@time-super.com</p>
            </div>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Left Section: Info Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              {t('contact_page.visit_us')}
            </h3>
            
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('contact_page.location')}</span>
                  <p className="text-sm font-black text-slate-900 leading-snug">{t('contact_page.location_val')}</p>
                </div>
              </div>

              {contactItems.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{item.label}</span>
                    <p className="text-sm font-black text-slate-900 leading-tight whitespace-pre-line">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section: Large Map */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm h-[400px] lg:h-[550px] relative">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3691.3115456447885!2d114.1837651!3d22.3040375!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x340400e979c39591%3A0xc3f172152646270!2s70-74%20Wuhu%20St%2C%20Hung%20Hom!5e0!3m2!1sen!2shk!4v1710000000000!5m2!1sen!2shk"
              className="w-full h-full border-0"
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            {/* Elegant overlay shadow for the map */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.05)]"></div>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 opacity-20">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em]">
          Time Super • Hong Kong
        </p>
      </div>
    </div>
  );
};

export default ContactUs;
