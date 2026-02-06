
import React from 'react';
import { Link } from 'react-router-dom';

const CounterAbout: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-24 py-8 sm:py-12 lg:py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="text-center space-y-6 px-4">
        <div className="inline-flex items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4 shadow-sm">
          Institutional OS 2.5
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85]">
          Any <span className="text-indigo-600 italic">School</span>. <br className="hidden sm:block" /> End-to-End Control.
        </h1>
        <p className="text-slate-500 text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          A unified control panel designed for modern academies. From database integrity to automated billing, manage every operational pillar in one brandless environment.
        </p>
      </section>

      {/* Full-Stack Infrastructure Grid */}
      <section className="px-4">
        <div className="bg-slate-900 rounded-[4rem] p-10 sm:p-16 lg:p-24 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full -mr-64 -mt-64 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full -ml-64 -mb-64 blur-[120px]" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">Full-Stack <br/> <span className="text-indigo-400 italic">Intelligence.</span></h2>
                <p className="text-slate-400 font-bold leading-relaxed max-w-md text-lg">
                  One platform to replace your entire legacy management stack.
                </p>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
                {[
                  { label: "Core Database", desc: "Centralized, encrypted engine for all student and institutional records." },
                  { label: "Automated Payments", desc: "Native billing and subscription clearing for hands-free revenue." },
                  { label: "Client Portals", desc: "White-labeled self-service hubs for parents and students." },
                  { label: "Live Attendance", desc: "Real-time presence tracking with automated missing-class logic." },
                  { label: "Seamless Migration", desc: "Effortless data onboarding from any legacy CSV or SQL system." },
                  { label: "Brandless UI", desc: "Fully integrated into your website. No 'Powered by' watermarks." },
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
                <h3 className="text-2xl font-black text-white tracking-tight leading-tight">AI Studio Site Synthesis</h3>
                <p className="text-slate-400 text-base font-medium leading-relaxed">
                  We migrate any existing institutional site into <span className="text-white font-black underline decoration-indigo-500 underline-offset-4">Google AI Studio</span>. Transform your web presence into an intelligent engine without needing a web developer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="text-center pt-8">
         <Link to="/" className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all">
           Return Home
         </Link>
      </div>
    </div>
  );
};

export default CounterAbout;
