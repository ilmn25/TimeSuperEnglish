
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { Course } from '../types';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsCoursesLoading(true);
      try {
        const data = await api.getPublicCourses();
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load courses for landing page", err);
      } finally {
        setIsCoursesLoading(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-12 sm:space-y-24 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      {/* Academy Hero Section */}
      <section className="text-center space-y-8 pt-8">
        <div className="inline-flex items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4 shadow-sm">
          Professional English Tutoring
        </div>
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-none">
          Time Super <br />
          <span className="text-indigo-600">English Academy</span>
        </h1>
        <p className="text-slate-500 text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          Nurturing confidence and mastery in the English language. Professional tutoring for primary and secondary students.
        </p>
      </section>

      {/* Simplified About Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white rounded-[3rem] border border-slate-100 p-8 sm:p-12 shadow-sm">
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">About Our Center</h2>
          <div className="space-y-4 text-slate-500 font-medium leading-relaxed">
            <p>
              At Time Super English, we believe language learning should be immersive, engaging, and results-oriented. Our center provides a supportive environment where students can thrive and achieve academic excellence.
            </p>
            <p>
              With specialized curriculum for all grade levels (P1-F6), we focus on core competencies including grammar, creative writing, and public speaking, ensuring our students are prepared for global challenges.
            </p>
          </div>
          <div className="flex items-center space-x-6 pt-4">
             <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900">12+</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Levels Offered</span>
             </div>
             <div className="w-px h-10 bg-slate-100" />
             <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900">100%</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Attendance</span>
             </div>
          </div>
        </div>
        <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-slate-100 group shadow-2xl">
           <img 
             src="https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=1600&auto=format&fit=crop" 
             className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
             alt="Classroom Environment"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/40 to-transparent" />
        </div>
      </section>

      {/* Footer minimal info */}
      <section className="text-center pb-12">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
          Empowering Students Through Communication
        </p>
      </section>
    </div>
  );
};

export default HomePage;
