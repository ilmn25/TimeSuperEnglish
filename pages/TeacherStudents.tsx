
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Added missing useNavigate import from react-router-dom
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Student, Teacher } from '../types';
import { useTranslation } from 'react-i18next';

const TeacherStudents: React.FC = () => {
  const { t } = useTranslation();
  // Initialized navigate hook using useNavigate
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const teacherProfile = await api.getTeacherByUserId(user.id);
      if (!teacherProfile) {
        setIsLoading(false);
        return;
      }
      setTeacher(teacherProfile);

      // Fetch all bookings for this teacher to identify their students
      const bookings = await api.getAllBookings(teacherProfile.org_id!, { 
        teacher_id: teacherProfile.id 
      });
      
      const studentMap = new Map<string, Student>();
      bookings.forEach((b: any) => {
        if (b.students) studentMap.set(b.students.id, b.students);
      });
      
      setStudents(Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.level && s.level.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [students, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!teacher) {
    return <div className="text-center py-20 font-black text-slate-400">Teacher profile not found.</div>;
  }

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Your Students</h2>
          <p className="text-slate-500 font-medium text-xs">Profiles of students enrolled in your classes</p>
        </div>
        <div className="relative w-full sm:w-64">
          <input 
            type="text" 
            placeholder="Search students..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-xs transition-all"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredStudents.map(student => (
          <div key={student.id} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-indigo-500 hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black">
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">{student.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                   <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100">{student.level || 'N/A'}</span>
                   <span className="text-[10px] text-slate-400 font-bold">{student.contact || 'No contact'}</span>
                </div>
              </div>
            </div>
            {/* Fixed: Use navigate hook from react-router-dom to fix the 'navigate' undefined error */}
            <button 
               onClick={() => navigate(`/teacher/attendance?studentId=${student.id}`)}
               className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </button>
          </div>
        ))}
        {filteredStudents.length === 0 && (
          <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
            <p className="text-slate-400 font-bold italic">No students matched your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudents;
