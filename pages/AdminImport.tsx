
import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Student, Course, Booking } from '../types';
import { useTranslation } from 'react-i18next';
import { useImportStatus } from '../App';

interface CSVRow {
  student: string;
  date: string;
  start: string;
  duration: number;
  course: string;
  check_in?: string;
  check_out?: string;
}

interface ResolvedBooking {
  studentName: string;
  courseName: string;
  studentId: string;
  courseId: string;
  date: string;
  start: string;
  end: string;
  check_in?: string;
  check_out?: string;
}

const normalizeTime = (timeStr: string | undefined | null): string => {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().split(' ')[0]; // Remove potential timezone or extra text
  const parts = cleanTime.split(':');
  if (parts.length < 2) return cleanTime;
  const hours = parts[0].padStart(2, '0');
  const minutes = parts[1].padStart(2, '0');
  return `${hours}:${minutes}`;
};

const EXAMPLE_CSV = `student,date,start,duration,course,check_in,check_out
Liam Wong,2026-03-02,14:00,60,Mathematics,13:55,15:05
Liam Wong,2026-03-09,14:00,60,Physics,,
Maya Tan,2026-03-02,15:30,60,English Writing,15:28,16:35
Noah Lim,2026-03-03,10:00,90,Chemistry,10:00,11:30
Noah Lim,2026-03-10,10:00,60,Biology,,
Maya Tan,2026-03-09,15:30,60,History,15:32,16:31`;

const AdminImport: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startImport, updateImportProgress, finishImport } = useImportStatus();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [existingStudents, setExistingStudents] = useState<Student[]>([]);
  const [existingCourses, setExistingCourses] = useState<Course[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mappings: { CSV_NAME: SYSTEM_ID | 'create' }
  const [studentMap, setStudentMap] = useState<Record<string, string>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});

  // Resolved list for step 3 preview
  const [resolvedBookings, setResolvedBookings] = useState<ResolvedBooking[]>([]);
  const [importSuccessCount, setImportSuccessCount] = useState(0);

  // Modal states
  const [duplicateBookings, setDuplicateBookings] = useState<Booking[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  const uniqueCsvStudents = useMemo(() => Array.from(new Set(csvData.map(r => r.student))), [csvData]);
  const uniqueCsvCourses = useMemo(() => Array.from(new Set(csvData.map(r => r.course))), [csvData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(r => r.trim());
      if (rows.length < 2) {
        alert(t('import_page.error_file'));
        return;
      }

      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      const data: CSVRow[] = rows.slice(1).map(row => {
        const cols = row.split(',').map(c => c.trim());
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = cols[i];
        });
        return {
          student: obj.student,
          date: obj.date,
          start: obj.start,
          duration: parseInt(obj.duration) || 60,
          course: obj.course,
          check_in: obj.check_in || undefined,
          check_out: obj.check_out || undefined
        };
      }).filter(r => r.student && r.date && r.start);

      if (data.length === 0) {
        alert(t('import_page.error_no_data'));
        return;
      }

      setCsvData(data);
      if (orgId) {
        setIsProcessing(true);
        try {
          const [sData, cData] = await Promise.all([api.getStudents(orgId), api.getCourses(orgId)]);
          const s = Array.isArray(sData) ? sData : (sData ? [sData] : []);
          const c = Array.isArray(cData) ? cData : (cData ? [cData] : []);
          
          setExistingStudents(s);
          setExistingCourses(c);
          
          const sMap: Record<string, string> = {};
          const cMap: Record<string, string> = {};
          
          const uniqueStudents = Array.from(new Set(data.map(r => r.student)));
          const uniqueCourses = Array.from(new Set(data.map(r => r.course)));

          uniqueStudents.forEach(name => {
            const match = s.find(es => es.name.toLowerCase() === name.toLowerCase());
            sMap[name] = match ? match.id : 'create';
          });
          
          uniqueCourses.forEach(name => {
            const match = c.find(ec => ec.name.toLowerCase() === name.toLowerCase());
            cMap[name] = match ? match.id : 'create';
          });

          setStudentMap(sMap);
          setCourseMap(cMap);
          setShowBackupModal(true);
        } catch (err: any) {
          alert('Failed to fetch org details: ' + err.message);
        } finally {
          setIsProcessing(false);
        }
      }
    };
    reader.readAsText(file);
  };
  
  const handleProceedToMapping = () => {
    setShowBackupModal(false);
    setStep(2);
  };
  
  const handleGoToBackup = () => {
    navigate(`/portal/admin/org/${orgId}/backup`);
  };
  
  const handleCancelBackupDialog = () => {
    setShowBackupModal(false);
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const parts = startTime.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]) || 0;
    const totalMins = h * 60 + m + duration;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const resolveEntities = async () => {
    if (!orgId) return;
    setIsProcessing(true);
    try {
      const resolvedStudents: Record<string, string> = {};
      for (const name of uniqueCsvStudents) {
        if (studentMap[name] === 'create') {
          const newStudentResponse = await api.createStudent(orgId, name, '');
          const newStudent = Array.isArray(newStudentResponse) ? newStudentResponse[0] : newStudentResponse;
          resolvedStudents[name] = newStudent.id;
        } else {
          resolvedStudents[name] = studentMap[name];
        }
      }

      const resolvedCourses: Record<string, string> = {};
      for (const name of uniqueCsvCourses) {
        if (courseMap[name] === 'create') {
          const newCourseResponse = await api.createCourse(orgId, name, '#6366f1');
          const newCourse = Array.isArray(newCourseResponse) ? newCourseResponse[0] : newCourseResponse;
          resolvedCourses[name] = newCourse.id;
        } else {
          resolvedCourses[name] = courseMap[name];
        }
      }

      const resolved: ResolvedBooking[] = csvData.map(row => {
        const normStart = normalizeTime(row.start);
        return {
          studentName: row.student,
          courseName: row.course,
          studentId: resolvedStudents[row.student],
          courseId: resolvedCourses[row.course],
          date: row.date,
          start: normStart,
          end: calculateEndTime(normStart, row.duration),
          check_in: normalizeTime(row.check_in) || undefined,
          check_out: normalizeTime(row.check_out) || undefined
        };
      });
      setResolvedBookings(resolved);

      const allExistingBookings: Booking[] = (await api.getAllBookings(orgId)) || [];
      const existingBookingsMap = new Map<string, Booking>();
      allExistingBookings.forEach(b => {
        const key = `${b.student_id}|${b.course_id}|${b.date}|${normalizeTime(b.start)}|${normalizeTime(b.end)}`;
        existingBookingsMap.set(key, b);
      });

      const duplicates: Booking[] = [];
      resolved.forEach(rb => {
        const key = `${rb.studentId}|${rb.courseId}|${rb.date}|${rb.start}|${rb.end}`;
        const existingBooking = existingBookingsMap.get(key);
        if (existingBooking) {
          duplicates.push(existingBooking);
        }
      });
      
      if (duplicates.length > 0) {
        setDuplicateBookings(duplicates);
        setShowDuplicateModal(true);
      } else {
        setStep(3);
      }

    } catch (err: any) {
      alert('Resolution failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportAll = () => {
    setShowDuplicateModal(false);
    setStep(3);
  };

  const handleSkipDuplicates = () => {
    const duplicateKeys = new Set(
      duplicateBookings.map(d => `${d.student_id}|${d.course_id}|${d.date}|${normalizeTime(d.start)}|${normalizeTime(d.end)}`)
    );
    
    const nonDuplicates = resolvedBookings.filter(b => {
      const key = `${b.studentId}|${b.courseId}|${b.date}|${b.start}|${b.end}`;
      return !duplicateKeys.has(key);
    });
    
    setResolvedBookings(nonDuplicates);
    setShowDuplicateModal(false);
    setStep(3);
  };

  const handleCancelDuplicateCheck = () => {
    setShowDuplicateModal(false);
    setStep(2); 
  };
  
  const handleImportBookings = async () => {
    if (!orgId || resolvedBookings.length === 0) {
        if (resolvedBookings.length === 0) setStep(4);
        return;
    }
    setIsProcessing(true);
    setImportSuccessCount(0);
    startImport(resolvedBookings.length);
    let successCount = 0;
    try {
      for (const booking of resolvedBookings) {
        const createResult = await api.createBooking(orgId, {
          student_id: booking.studentId,
          course_id: booking.courseId,
          date: booking.date,
          start: booking.start,
          end: booking.end
        });
        
        const newBooking = Array.isArray(createResult) ? createResult[0] : createResult;

        if (newBooking?.id && (booking.check_in || booking.check_out)) {
          await api.updateBooking(orgId, newBooking.id, {
            check_in: booking.check_in || null,
            check_out: booking.check_out || null
          });
        }

        successCount++;
        setImportSuccessCount(successCount);
        updateImportProgress(successCount);
      }
      setStep(4);
    } catch (err: any) {
      alert(`Import process interrupted. Completed ${successCount} of ${resolvedBookings.length} bookings.\n\nError: ${err.message}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
      finishImport();
    }
  };

  const copyExample = () => {
    navigator.clipboard.writeText(EXAMPLE_CSV);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('nav.import')}</h2>
        <p className="text-slate-500 font-medium">{t('import_page.subtitle')}</p>
      </div>

      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all ${step === s ? 'bg-indigo-600 text-white shadow-lg' : step > s ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 4 && <div className={`w-8 sm:w-12 h-1 mx-1 sm:mx-2 rounded-full ${step > s ? 'bg-green-500' : 'bg-slate-100'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 sm:p-10 shadow-sm min-h-[400px]">
        {step === 1 && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 py-10">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <div className="text-center space-y-4 w-full flex flex-col items-center">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">{t('import_page.step1_title')}</h3>
                <p className="text-slate-400 text-sm">{t('import_page.step1_headers')} <code className="bg-slate-50 px-1 rounded text-[10px]">student, date, start, duration, course, check_in, check_out</code></p>
              </div>

              <div className="w-full max-w-lg bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left relative group">
                <div className="flex items-center justify-between mb-3">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('import_page.example_title')}</span>
                   <button 
                    onClick={copyExample}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm active:scale-95 transition-all"
                   >
                     {t('common.copy')}
                   </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-600 overflow-x-auto no-scrollbar whitespace-pre leading-relaxed">
                  {EXAMPLE_CSV}
                </pre>
              </div>
            </div>
            
            <label className="cursor-pointer group">
              <div className="bg-indigo-600 group-hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center space-x-3">
                <span>{t('import_page.select_file')}</span>
              </div>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <section className="space-y-6">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('import_page.map_students')}</h4>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                  {uniqueCsvStudents.map(name => (
                    <div key={name} className="flex flex-col space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-500 truncate uppercase tracking-tight">{name}</span>
                      <select 
                        value={studentMap[name] || 'create'}
                        onChange={(e) => setStudentMap({...studentMap, [name]: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="create">{t('import_page.create_student')}</option>
                        {existingStudents.map(es => (
                          <option key={es.id} value={es.id}>{es.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('import_page.map_courses')}</h4>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                  {uniqueCsvCourses.map(name => (
                    <div key={name} className="flex flex-col space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-500 truncate uppercase tracking-tight">{name}</span>
                      <select 
                        value={courseMap[name] || 'create'}
                        onChange={(e) => setCourseMap({...courseMap, [name]: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="create">{t('import_page.create_course')}</option>
                        {existingCourses.map(ec => (
                          <option key={ec.id} value={ec.id}>{ec.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-8 border-t border-slate-50">
               <button 
                 onClick={() => setStep(1)}
                 className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
               >
                 {t('import_page.back_to_upload')}
               </button>
               <button 
                 onClick={resolveEntities}
                 disabled={isProcessing}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center"
               >
                 {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />}
                 {t('import_page.resolve_review')}
               </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <h3 className="text-xl font-black text-slate-900">{t('import_page.review_title')}</h3>
                 <p className="text-slate-500 text-xs font-medium">{t('import_page.review_subtitle')}</p>
               </div>
               <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                 {t('import_page.bookings_count', { count: resolvedBookings.length })}
               </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-slate-100 shadow-inner no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.student')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.course')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.date')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.time')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('export_page.column_check_in')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('export_page.column_check_out')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {resolvedBookings.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">{b.studentName}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{b.courseName}</td>
                      <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400">{b.date}</td>
                      <td className="px-6 py-4 text-[10px] font-mono font-black text-indigo-600">{b.start} - {b.end}</td>
                      <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400">{b.check_in || '-'}</td>
                      <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400">{b.check_out || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-8 border-t border-slate-50">
              <div className="flex items-center justify-end space-x-4">
                 <button 
                   onClick={() => setStep(2)}
                   className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                 >
                   {t('import_page.back_to_mapping')}
                 </button>
                 <button 
                   onClick={handleImportBookings}
                   disabled={isProcessing}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center min-w-[200px] justify-center"
                 >
                   {isProcessing ? (
                     <>
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                       <span>{t('common.processing')} ({importSuccessCount}/{resolvedBookings.length})</span>
                     </>
                   ) : (
                     t('import_page.confirm_import')
                   )}
                 </button>
              </div>
              {isProcessing && (
                <div className="w-full mt-4">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300" 
                      style={{ width: `${(importSuccessCount / resolvedBookings.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 py-10">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-slate-900">{t('import_page.complete_title')}</h3>
              <p className="text-slate-500 font-medium">{t('import_page.complete_subtitle', { count: resolvedBookings.length })}</p>
            </div>
            <button 
              onClick={() => navigate(`/portal/admin/org/${orgId}/bookings`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              {t('import_page.view_bookings')}
            </button>
          </div>
        )}
      </div>

      {showBackupModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={handleCancelBackupDialog}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-lg overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-10 py-8 border-b border-amber-100 bg-amber-50/30 shrink-0 flex items-start space-x-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-amber-900 tracking-tight">{t('import_page.backup_title')}</h3>
                        <p className="text-amber-700/80 text-sm font-medium mt-1">{t('import_page.backup_subtitle')}</p>
                    </div>
                </div>
                
                <div className="p-10 bg-slate-50 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                    <button onClick={handleCancelBackupDialog} className="w-full sm:w-auto px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('common.cancel')}</button>
                    <button onClick={handleProceedToMapping} className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest">{t('import_page.continue_anyway')}</button>
                    <button onClick={handleGoToBackup} className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black shadow-xl shadow-amber-100 transition-all active:scale-95 text-xs uppercase tracking-widest">{t('import_page.go_to_backup')}</button>
                </div>
            </div>
        </div>
      )}

      {showDuplicateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={handleCancelDuplicateCheck}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="px-10 py-8 border-b border-red-100 bg-red-50/30 shrink-0 flex items-start space-x-6">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-red-900 tracking-tight">{t('import_page.duplicate_title')}</h3>
                        <p className="text-red-700/80 text-sm font-medium mt-1">{t('import_page.duplicate_subtitle', { count: duplicateBookings.length })}</p>
                    </div>
                </div>
                
                <div className="p-10 flex-1 flex flex-col overflow-hidden">
                    <div className="rounded-2xl border border-slate-100 shadow-inner overflow-y-auto no-scrollbar flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-20">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.student')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.course')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.date')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bookings.time')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {duplicateBookings.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-900">{existingStudents.find(s => s.id === b.student_id)?.name}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{existingCourses.find(c => c.id === b.course_id)?.name}</td>
                                        <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400">{b.date}</td>
                                        <td className="px-6 py-4 text-[10px] font-mono font-black text-indigo-600">{normalizeTime(b.start)} - {normalizeTime(b.end)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-10 bg-slate-50 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                    <button onClick={handleCancelDuplicateCheck} className="w-full sm:w-auto px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">{t('import_page.cancel_import')}</button>
                    <button onClick={handleSkipDuplicates} className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest">{t('import_page.skip_duplicates')}</button>
                    <button onClick={handleImportAll} className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-xl shadow-red-100 transition-all active:scale-95 text-xs uppercase tracking-widest">{t('import_page.import_all')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminImport;
