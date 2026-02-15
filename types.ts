
export interface Student {
  id: string;
  name: string;
  contact: string;
  level?: string;
  org_id?: string;
}

export interface Teacher {
  id: string;
  name: string;
  contact?: string;
  user_id?: string;
  org_id?: string;
}

export interface Course {
  id: string;
  name: string;
  color: string;
  org_id: string;
  description?: string;
}

export interface CoursePackage {
  id: string;
  course_id: string;
  org_id: string;
  name: string;
  count: number; // number of slots or hours
  price: number; // total price in HKD
  unit: 'sessions' | 'hours';
}

export interface CourseSchedule {
  id: string;
  course_id: string;
  org_id: string;
  is_recurring: boolean;
  is_fixed: boolean;
  is_in_person: boolean;
  start_time: string;
  end_time: string;
  price: number;
  cycle_pattern?: number[] | null; // 1,2,3,4
  anchor_date?: string | null;
  days_of_week?: number[] | null; // 0-6
  one_off_dates?: string[] | null;
}

export interface Invoice {
  id: string;
  method: string; 
  amount: number;
  currency: string;
  status: 'issued' | 'paid';
  issued_at: string;
  paid_at?: string | null;
  bookings?: Booking & { students: Student; courses: Course };
}

export interface Booking {
  id: string;
  student_id: string;
  teacher_id?: string | null;
  course_id: string;
  date: string;
  start: string;
  end: string;
  check_in?: string | null;
  check_out?: string | null;
  comment?: string | null;
  org_id: string;
  invoice_id?: string | null;
  students?: Student;
  courses?: Course;
  teachers?: Teacher;
  invoices?: Invoice[];
}

export interface BookingRequest {
  id: string;
  student_id: string;
  course_id: string;
  date: string;
  start_time: string;
  end_time: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  response_message?: string;
  created_at: string;
  students?: Student;
  courses?: Course;
}

export interface Attendance {
  id: string;
  student_id: string;
  org_id: string;
  date: string;
  start: string;
  end: string | null;
}

export interface Organization {
  id: string;
  name: string;
  owner: string;
  created_at?: string;
  backup_time?: string | null;
}

export interface StudentGroupedData {
  student: Student;
  bookings: Booking[];
}

export interface BackupFile {
  id: string;
  org_id: string;
  created_at: string;
  uploaded?: boolean;
  metadata?: {
    size: number;
    mimetype: string;
  };
}