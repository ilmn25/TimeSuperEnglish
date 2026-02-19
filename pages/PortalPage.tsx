
import React from 'react';
import { Link } from 'react-router-dom';

interface PortalPageProps {
  role: 'parent' | 'teacher' | 'admin';
}

const PortalPage: React.FC<PortalPageProps> = () => {
  const org_id = '228a7079-75c9-4417-ab52-87b9a6d06f34';
  const portalUrl = `https://ilmn25.github.io/260131-web/#/portal/${org_id}`;

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
      {/* Utility Bar to return to main site */}
      <div className="h-10 bg-slate-900 flex items-center px-4 justify-between shrink-0">
        <Link 
          to="/" 
          className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Academy Website</span>
        </Link>
        <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Secure Portal Connection</span>
        </div>
      </div>
      
      {/* ERP Embed */}
      <iframe 
        src={portalUrl}
        className="flex-1 w-full border-none"
        title={`Counter Portal`}
        allow="camera; microphone; geolocation; clipboard-read; clipboard-write"
      />
    </div>
  );
};

export default PortalPage;
