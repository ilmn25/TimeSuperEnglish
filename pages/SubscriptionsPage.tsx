
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

const SubscriptionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      const data = await api.getUserSubscription();
      // If subscription is incomplete or canceled, treat it as non-existent to show the plan selection UI.
      if (data && (data.status === 'active' || data.status === 'past_due' || data.status === 'trialing')) {
        setSubscription(data);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Failed to fetch subscription', err);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleSubscribe = async (planType: 'monthly' | 'lifetime') => {
    setIsProcessing(planType);
    try {
      const { url } = await api.createStripeCheckout(planType);
      if (url) {
        window.open(url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start checkout');
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePortal = async () => {
    setIsProcessing('portal');
    try {
      const { url } = await api.getStripePortal();
      if (url) {
        window.open(url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to open billing portal');
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20 px-4">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t('subscriptions.title')}</h2>
        <p className="text-slate-500 font-medium max-w-xl mx-auto">{t('subscriptions.subtitle')}</p>
      </div>

      {subscription && (
        <div className="max-w-3xl mx-auto bg-indigo-600 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                  {t('subscriptions.current_plan')}
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${subscription.status === 'active' ? 'bg-green-400' : 'bg-orange-400'}`}>
                  {subscription.status}
                </div>
              </div>
              <h3 className="text-3xl font-black tracking-tight">
                {subscription.plan_type === 'monthly' ? t('subscriptions.monthly_title') : t('subscriptions.lifetime_title')}
              </h3>
              {subscription.current_period_end && (
                <p className="text-indigo-100 font-medium">
                  {t('subscriptions.expires')} <span className="font-bold">{new Date(subscription.current_period_end).toLocaleDateString()}</span>
                </p>
              )}
            </div>
            <button 
              onClick={handlePortal}
              disabled={isProcessing !== null}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 shadow-xl shadow-indigo-900/20 disabled:opacity-50 flex items-center justify-center min-w-[180px]"
            >
              {isProcessing === 'portal' ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : t('subscriptions.portal')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Monthly Plan Card */}
        <div className={`bg-white border-2 rounded-[3rem] p-10 flex flex-col transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${subscription?.plan_type === 'monthly' ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100'}`}>
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('subscriptions.monthly_title')}</h3>
              <p className="text-slate-500 text-sm font-medium">{t('subscriptions.monthly_desc')}</p>
            </div>
            <div className="text-4xl font-black text-slate-900">
              {t('subscriptions.monthly_price')}
            </div>
            <ul className="space-y-4">
              {['Unlimited Students', 'Full Attendance Control', 'Advanced CSV Export', 'Priority Backups'].map((feat, i) => (
                <li key={i} className="flex items-center space-x-3 text-slate-600 font-bold text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <button 
            onClick={() => handleSubscribe('monthly')}
            disabled={isProcessing !== null || subscription?.plan_type === 'monthly' || subscription?.plan_type === 'lifetime'}
            className={`mt-10 w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center ${subscription?.plan_type === 'monthly' || subscription?.plan_type === 'lifetime' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200'}`}
          >
            {isProcessing === 'monthly' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : subscription?.plan_type === 'monthly' ? 'Current Plan' : t('subscriptions.subscribe')}
          </button>
        </div>

        {/* Lifetime Plan Card */}
        <div className={`bg-white border-2 rounded-[3rem] p-10 flex flex-col transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden ${subscription?.plan_type === 'lifetime' ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100'}`}>
          <div className="absolute top-6 right-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
            Best Value
          </div>
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('subscriptions.lifetime_title')}</h3>
              <p className="text-slate-500 text-sm font-medium">{t('subscriptions.lifetime_desc')}</p>
            </div>
            <div className="text-4xl font-black text-slate-900">
              {t('subscriptions.lifetime_price')}
            </div>
            <ul className="space-y-4">
              {['Everything in Monthly', 'One-time Payment', 'No Recurring Fees', 'Future Pro Updates'].map((feat, i) => (
                <li key={i} className="flex items-center space-x-3 text-slate-600 font-bold text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <button 
            onClick={() => handleSubscribe('lifetime')}
            disabled={isProcessing !== null || subscription?.plan_type === 'lifetime'}
            className={`mt-10 w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center ${subscription?.plan_type === 'lifetime' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100'}`}
          >
            {isProcessing === 'lifetime' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : subscription?.plan_type === 'lifetime' ? 'Current Plan' : t('subscriptions.subscribe')}
          </button>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
          Secured by <span className="text-slate-400">Stripe</span> • Cancel anytime
        </p>
      </div>
    </div>
  );
};

export default SubscriptionsPage;
