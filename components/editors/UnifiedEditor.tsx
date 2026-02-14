
import React from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CYCLE_WEEKS = [1, 2, 3, 4];

interface UnifiedEditorProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  scheduleType: 'recurring' | 'one-off';
  setScheduleType: (type: 'recurring' | 'one-off') => void;
  selectedDates: string[];
  setSelectedDates: React.Dispatch<React.SetStateAction<string[]>>;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  editingId: string | null;
  hasOverlap: boolean; 
  t: any;
}

const UnifiedEditor: React.FC<UnifiedEditorProps> = ({ 
  formData, setFormData, scheduleType, setScheduleType, 
  selectedDates, setSelectedDates, onSubmit, isProcessing, editingId, hasOverlap, t 
}) => {
  
  const toggleCycleWeek = (week: number) => {
    const current = formData.cycle_pattern || [];
    const next = current.includes(week) 
      ? current.filter((w: number) => w !== week) 
      : [...current, week].sort();
    setFormData({ ...formData, cycle_pattern: next });
  };

  const getStrategyExamples = () => {
    if (scheduleType === 'recurring') {
      return !formData.is_fixed 
        ? ["Homework help window available every weekday", "Open office hours for student drop-ins", "Self-study lab available Mon-Fri"]
        : ["Dance class every Saturday at 2pm", "Weekly Phonics cohort at 4pm", "Routine 1-on-1 tutoring sessions"];
    } else {
      return !formData.is_fixed 
        ? ["Private consult window for parent-teacher night", "Open-door recruitment day window", "Flexible testing window for mid-terms"]
        : ["Christmas intensive workshop on Dec 24", "One-time SAT Prep seminar", "Special guest speaker event"];
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Toggles */}
      <div className="space-y-3">
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button 
            type="button" 
            onClick={() => {
              setScheduleType('recurring');
              setFormData({ ...formData, is_recurring: true });
            }} 
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${scheduleType === 'recurring' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t('course_schedule.routine')}
          </button>
          <button 
            type="button" 
            onClick={() => {
              setScheduleType('one-off');
              setFormData({ ...formData, is_recurring: false });
            }} 
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${scheduleType === 'one-off' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t('course_schedule.one_off')}
          </button>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button 
            type="button" 
            onClick={() => setFormData({ ...formData, is_fixed: true })} 
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.is_fixed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t('course_schedule.fixed_session')}
          </button>
          <button 
            type="button" 
            onClick={() => setFormData({ ...formData, is_fixed: false })} 
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${!formData.is_fixed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t('course_schedule.flexible_session')}
          </button>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button 
            type="button" 
            onClick={() => setFormData({ ...formData, is_in_person: true })} 
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.is_in_person ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t('course_schedule.in_person')}
          </button>
          <button 
            type="button" 
            onClick={() => setFormData({ ...formData, is_in_person: false })} 
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${!formData.is_in_person ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t('course_schedule.remote')}
          </button>
        </div>

        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 space-y-2">
           <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest mb-1">{t('course_schedule.recommended_usage')}</p>
           <ul className="space-y-1.5">
             {getStrategyExamples().map((ex, i) => (
               <li key={i} className="flex items-start gap-2">
                 <div className="w-1 h-1 rounded-full bg-indigo-300 mt-1.5 shrink-0" />
                 <p className="text-[10px] text-slate-600 font-medium leading-tight">{ex}</p>
               </li>
             ))}
           </ul>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Time and Price */}
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('course_schedule.start_time')}</label>
              <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('course_schedule.end_time')}</label>
              <input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{!formData.is_fixed ? t('course_schedule.hourly_price') : t('course_schedule.slot_price')}</label>
            <input 
              type="number" 
              placeholder="0.00"
              value={formData.price || ''} 
              onChange={e => setFormData({...formData, price: e.target.value ? parseFloat(e.target.value) : 0})} 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none" 
            />
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-5 pt-2 border-t border-slate-50">
          {scheduleType === 'recurring' ? (
            <>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-indigo-600">{t('course_schedule.cycle_pattern')}</label>
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {CYCLE_WEEKS.map((w) => (
                    <button 
                      key={w} 
                      type="button" 
                      onClick={() => toggleCycleWeek(w)} 
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${formData.cycle_pattern?.includes(w) ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-slate-400 mt-1.5 ml-1 italic">{t('course_schedule.cycle_help')}</p>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-indigo-600">{t('course_schedule.anchor_date')}</label>
                <input 
                  type="date" 
                  required
                  value={formData.anchor_date}
                  onChange={e => setFormData({...formData, anchor_date: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none"
                />
                <p className="text-[8px] text-slate-400 mt-1.5 ml-1 italic">{t('course_schedule.anchor_help')}</p>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-indigo-600">{t('course_schedule.days')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day, idx) => (
                    <button 
                      key={day} 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, days_of_week: prev.days_of_week.includes(idx) ? prev.days_of_week.filter(d => d !== idx) : [...prev.days_of_week, idx] }))} 
                      className={`w-8 h-8 rounded-lg text-[9px] font-black transition-all ${formData.days_of_week?.includes(idx) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300'}`}
                    >
                      {day.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('course_schedule.selected_dates', { count: selectedDates.length })}</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 no-scrollbar">
                {selectedDates.sort().map(d => <div key={d} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded-md flex items-center gap-1 shadow-sm">{d}{!editingId && <button type="button" onClick={() => setSelectedDates(prev => prev.filter(x => x !== d))} className="hover:text-indigo-900">×</button>}</div>)}
                {selectedDates.length === 0 && <span className="text-[9px] text-slate-400 italic">{t('course_schedule.select_on_calendar')}</span>}
              </div>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isProcessing || hasOverlap || (scheduleType === 'recurring' && (formData.days_of_week?.length === 0 || formData.cycle_pattern?.length === 0)) || (scheduleType === 'one-off' && selectedDates.length === 0)} 
          className={`w-full py-3 rounded-xl font-black shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest ${hasOverlap ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'}`}
        >
          {isProcessing ? t('common.loading') : hasOverlap ? t('course_schedule.overlap_detected') : editingId ? t('course_schedule.update_rule') : t('course_schedule.add_rule')}
        </button>
      </form>
    </div>
  );
};

export default UnifiedEditor;
