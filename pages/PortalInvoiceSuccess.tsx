
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

const PortalInvoiceSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const sessionId = searchParams.get('session_id');
  const invoiceIds = searchParams.get('invoice_ids')?.split(',') || [];
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [paidCount, setPaidCount] = useState(0);

  useEffect(() => {
    let pollCount = 0;
    const MAX_POLLS = 10;
    
    const verifyPayments = async () => {
      if (invoiceIds.length === 0) {
        setIsVerifying(false);
        return;
      }

      try {
        let confirmedCount = 0;
        for (const id of invoiceIds) {
          const inv = await api.getInvoice(id);
          if (inv && inv.status === 'paid') {
            confirmedCount++;
          }
        }
        
        setPaidCount(confirmedCount);

        if (confirmedCount === invoiceIds.length || pollCount >= MAX_POLLS) {
          setIsVerifying(false);
        } else {
          pollCount++;
          setTimeout(verifyPayments, 2000); // Poll every 2 seconds
        }
      } catch (err) {
        console.error("Verification failed", err);
        setIsVerifying(false);
      }
    };

    verifyPayments();
  }, [sessionId]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:py-20 animate-in fade-in zoom-in duration-500">
      <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 sm:p-16 text-center shadow-2xl shadow-indigo-100/50">
        <div className="mb-10 flex justify-center">
          <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-100 relative">
             <div className="absolute inset-0 bg-emerald-400/20 rounded-[2.5rem] animate-ping" />
             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
             </svg>
          </div>
        </div>

        <div className="space-y-4 mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t('common.success')}!
          </h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Your payment was processed successfully. 
            {isVerifying ? " We're just confirming with the system..." : " All records have been updated."}
          </p>
        </div>

        {isVerifying ? (
          <div className="flex flex-col items-center space-y-4 mb-12">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Verifying Transaction</span>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-12 space-y-3">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices Settle</span>
                <span className="text-sm font-black text-emerald-600">{paidCount} of {invoiceIds.length}</span>
             </div>
             <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-1000" 
                  style={{ width: `${(paidCount / invoiceIds.length) * 100}%` }} 
                />
             </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => navigate('/portal/parent/payments')}
            className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95"
          >
            Go to Audit Hub
          </button>
          {invoiceIds.length === 1 && (
            <button 
              onClick={() => navigate(`/portal/parent/invoices/${invoiceIds[0]}`)}
              className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              View Invoice
            </button>
          )}
          {invoiceIds.length > 1 && (
             <button 
              onClick={() => navigate('/portal/parent/invoices')}
              className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Browse Invoices
            </button>
          )}
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link to="/" className="text-[10px] font-black text-slate-300 hover:text-indigo-600 uppercase tracking-[0.4em] transition-colors">
          Return to Academy Home
        </Link>
      </div>
    </div>
  );
};

export default PortalInvoiceSuccess;
