
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Attendance, Student } from '../types';
import { useTranslation } from 'react-i18next';

type Preset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all' | 'custom';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getPresetDates = (preset: Preset): [string, string] => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      break;
    case 'this_week':
      const firstDayOfWeek = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1); // Monday as first day
      start.setDate(firstDayOfWeek);
      end.setDate(firstDayOfWeek + 6);
      break;
    case 'last_week':
      const prevWeekStart = new Date();
      prevWeekStart.setDate(now.getDate() - now.getDay() - 6);
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
      start = prevWeekStart;
      end = prevWeekEnd;
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
    case 'all':
      start = new Date(2000, 0, 1); // A reasonable start date for "all time"
      end = new Date(); // Up to today
      break;
    default:
      break;
  }
  return [formatDate(start), formatDate(end)];
};

const AdminAttendanceExport: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { t } = useTranslation();

  const today = formatDate(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePreset, setActivePreset] = useState<Preset>('today');
  
  const presets: { id: Preset, label: string }[] = [
    { id: 'today', label: t('attendance_export_page.presets.today') },
    { id: 'yesterday', label: t('attendance_export_page.presets.yesterday') },
    { id: 'this_week', label: t('attendance_export_page.presets.this_week') },
    { id: 'last_week', label: t('attendance_export_page.presets.last_week') },
    { id: 'this_month', label: t('attendance_export_page.presets.this_month') },
    { id: 'last_month', label: t('attendance_export_page.presets.last_month') },
    { id: 'this_year', label: t('attendance_export_page.presets.this_year') },
    { id: 'last_year', label: t('attendance_export_page.presets.last_year') },
    { id: 'all', label: t('attendance_export_page.presets.all') },
  ];

  useEffect(() => {
    // Check if current start/end dates match any preset
    const matchingPreset = presets.find(p => {
      const [start, end] = getPresetDates(p.id);
      return start === startDate && end === endDate;
    });
    setActivePreset(matchingPreset ? matchingPreset.id : 'custom');
  }, [startDate, endDate]);


  const handlePresetClick = (preset: Preset) => {
    const [start, end] = getPresetDates(preset);
    setStartDate(start);
    setEndDate(end);
    setActivePreset(preset);
  };

  const calculateDurationMinutes = (start: string, end: string | null): number | '' => {
    if (!end || !start) return '';
    try {
      const startTime = new Date(`1970-01-01T${start}`);
      const endTime = new Date(`1970-01-01T${end}`);
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return '';
      const diffMs = endTime.getTime() - startTime.getTime();
      return Math.round(diffMs / 60000);
    } catch {
      return '';
    }
  };

  const handleExport = async () => {
    if (!orgId) return;
    setIsProcessing(true);

    try {
      const [attendances, students] = await Promise.all([
        api.getAllAttendances(orgId, { startDate, endDate }),
        api.getStudents(orgId)
      ]);

      if (!Array.isArray(attendances) || attendances.length === 0) {
        alert("No attendance records found for the selected period.");
        setIsProcessing(false);
        return;
      }

      const studentMap = new Map<string, string>();
      if (Array.isArray(students)) {
        students.forEach((s: Student) => studentMap.set(s.id, s.name));
      }

      const headers = ['student', 'date', 'start', 'end', 'duration'];
      const rows = attendances.map((att: Attendance) => {
        const studentName = studentMap.get(att.student_id) || 'Unknown Student';
        const duration = calculateDurationMinutes(att.start, att.end);
        
        return [
          studentName,
          att.date,
          att.start ? att.start.slice(0, 5) : '',
          att.end ? att.end.slice(0, 5) : '',
          duration
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_export_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      alert('Failed to export data. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('attendance_export_page.title')}</h2>
        <p className="text-slate-500 font-medium">{t('attendance_export_page.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Presets Sidebar */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('attendance_export_page.presets.title')}</h3>
          </div>
          <div className="space-y-3">
            {presets.map(p => (
              <button 
                key={p.id}
                onClick={() => handlePresetClick(p.id)}
                className={`w-full text-left px-5 py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all ${activePreset === p.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-100 hover:text-indigo-600'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range & Export */}
        <div className="lg:col-span-2 bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('attendance_export_page.custom_range')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">{t('attendance_export_page.start_date')}</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 text-slate-900 font-bold transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">{t('attendance_export_page.end_date')}</label>
                <input 
                  type="date" 
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 text-slate-900 font-bold transition-all"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end pt-8 border-t border-slate-100">
            <button 
              onClick={handleExport}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center space-x-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('common.processing')}</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>{t('attendance_export_page.download_btn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAttendanceExport;
