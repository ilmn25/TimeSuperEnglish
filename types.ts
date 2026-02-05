
export interface Student {
  id: string;
  name: string;
  contact: string;
  level?: string;
  org_id?: string;
}

export interface Course {
  id: string;
  name: string;
  color: string;
}

export interface Booking {
  id: string;
  student_id: string;
  course_id: string;
  date: string;
  start: string;
  end: string;
  check_in?: string | null;
  check_out?: string | null;
  org_id: string;
  invoice_id?: string | null;
  students?: Student;
  courses?: Course;
}

export interface Issue {
  id: string;
  booking_id: string;
  issue_type: 'missed_booking' | 'adhoc_booking';
  resolution: 'pending' | 'reschedule' | 'refund' | 'waived' | 'billing';
  billing_status?: 'unpaid' | 'paid' | null;
  amount?: number | null;
  created_at: string;
  resolved_at?: string | null;
  notes?: string | null;
  bookings?: Booking & { students: Student; courses: Course };
}

// Added Attendance interface to fix build errors in components and pages
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
