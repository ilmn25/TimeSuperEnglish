
import React from 'react';
import { useTranslation } from 'react-i18next';

const ContactUs: React.FC = () => {
  const { t } = useTranslation();

  const contactItems = [
    {
      label: t('contact_page.location'),
      value: t('contact_page.location_val'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: t('contact_page.phone'),
      value: t('contact_page.phone_val'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
    {
      label: t('contact_page.email'),
      value: t('contact_page.email_val'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: t('contact_page.office_hours'),
      value: t('contact_page.office_hours_val'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in duration-700 py-12 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
          {t('nav.contact')}
        </div>
        <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
          Let’s Start a <br />
          <span className="text-indigo-600 italic">Conversation.</span>
        </h2>
        <p className="text-slate-500 font-medium max-w-xl mx-auto text-lg leading-relaxed">
          {t('contact_page.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 pb-12">
        {contactItems.map((item, idx) => (
          <div key={idx} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 flex items-start space-x-8 transition-all hover:border-indigo-100 hover:shadow-2xl group">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
              {item.icon}
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{item.label}</span>
              <p className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactUs;
