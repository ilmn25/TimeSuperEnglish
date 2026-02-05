
import { supabase } from './supabaseClient';

const SUPABASE_URL = 'https://cxjkcrpapxlrceelzshu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_27zWxhCOkv7vnnXEOA8qmQ_e2tp76FD';

const getHeaders = async (isMutation = false) => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${session?.access_token || SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
  
  if (isMutation) {
    headers['Prefer'] = 'return=representation';
  }
  
  return headers;
};

const handleResponse = async (response: Response, errorMessage: string) => {
  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorData = await response.json();
      console.error(`API Error Detail [${response.status}]:`, errorData);
      errorDetail = errorData.message || errorData.details || errorDetail;
    } catch (e) {
      // Fallback if not JSON
      const text = await response.text();
      if (text) errorDetail = text;
    }
    throw new Error(`${errorMessage}: ${errorDetail}`);
  }

  const text = await response.text();
  if (!text) return null;
  
  try {
    // Return raw data. Unwrapping single-element arrays here causes issues
    // for list endpoints that may return one item.
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};

export const api = {
  // STRIPE SUBSCRIPTION METHODS
  async createStripeCheckout(planType: 'monthly' | 'lifetime') {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/functions/v1/stripe-create`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ planType })
    });
    return handleResponse(response, 'Failed to create checkout session');
  },

  async getStripePortal() {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/functions/v1/stripe-portal`;
    const response = await fetch(url, {
      method: 'POST',
      headers
    });
    return handleResponse(response, 'Failed to get billing portal URL');
  },

  async getUserSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&select=*`;
    const response = await fetch(url, { headers });
    const data = await handleResponse(response, 'Failed to fetch subscription');
    return Array.isArray(data) ? data[0] : null;
  },

  // ORGANIZATION METHODS
  async getOrganizations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/user_orgs?user_id=eq.${user.id}&select=organizations(*)`;
    const response = await fetch(url, { headers });
    const data = await handleResponse(response, 'Failed to fetch organizations');
    const orgs = Array.isArray(data) ? data : (data ? [data] : []);
    return orgs.map((item: any) => item.organizations).filter((o: any) => o !== null);
  },

  async getOrganization(id: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(id)}&select=*`;
    const response = await fetch(url, { headers });
    const data = await handleResponse(response, 'Failed to fetch organization');
    // Supabase select returns an array, we want the first element or undefined.
    return Array.isArray(data) ? data[0] : null;
  },

  async createOrganization(name: string) {
    const headers = await getHeaders(true);
    const orgResponse = await fetch(`${SUPABASE_URL}/rest/v1/organizations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name })
    });
    return handleResponse(orgResponse, 'Failed to create organization');
  },

  async updateOrganization(id: string, name: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name })
    });
    return handleResponse(response, 'Failed to update organization');
  },

  async updateOrganizationBackupTime(id: string, backupTime: string | null) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ backup_time: backupTime })
    });
    return handleResponse(response, 'Failed to update organization backup point');
  },

  async deleteOrganization(id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers
    });
    return handleResponse(response, 'Failed to delete organization');
  },

  // BOOKING METHODS
  async getBookings(orgId: string, date: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/bookings?org_id=eq.${encodeURIComponent(orgId)}&date=eq.${encodeURIComponent(date)}&select=id,date,start,end,student_id,students(name,contact,id,level),courses(name,color)`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch bookings');
  },

  async getAllBookings(orgId: string, filters?: { dates?: string[]; student_id?: string; course_id?: string; startDate?: string; endDate?: string }) {
    const headers = await getHeaders();
    let query = `org_id=eq.${encodeURIComponent(orgId)}&select=id,date,start,end,student_id,course_id,students(name,contact,id,level),courses(name,color)&order=date.desc,start.asc`;
    
    if (filters?.dates && filters.dates.length > 0) {
      const dateList = filters.dates.map(d => `"${d}"`).join(',');
      query += `&date=in.(${dateList})`;
    } else {
      if (filters?.startDate) query += `&date=gte.${encodeURIComponent(filters.startDate)}`;
      if (filters?.endDate) query += `&date=lte.${encodeURIComponent(filters.endDate)}`;
    }
    
    if (filters?.student_id) query += `&student_id=eq.${encodeURIComponent(filters.student_id)}`;
    if (filters?.course_id) query += `&course_id=eq.${encodeURIComponent(filters.course_id)}`;
    
    const url = `${SUPABASE_URL}/rest/v1/bookings?${query}`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch bookings list');
  },

  async createBooking(orgId: string, data: { student_id: string; course_id: string; date: string; start: string; end: string }) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/bookings`;
    // Explicitly set the org_id to ensure it matches current workspace
    const payload = { ...data, org_id: orgId };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return handleResponse(response, 'Failed to create booking');
  },

  async updateBooking(orgId: string, id: string, data: Partial<{ student_id: string; course_id: string; date: string; start: string; end: string }>) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/bookings?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    return handleResponse(response, 'Failed to update booking');
  },

  async deleteBooking(orgId: string, id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/bookings?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Failed to delete booking');
  },

  // ATTENDANCE METHODS
  async getAttendances(orgId: string, date: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/attendances?org_id=eq.${encodeURIComponent(orgId)}&date=eq.${encodeURIComponent(date)}&select=*`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch attendances');
  },

  async getAllAttendances(orgId: string, filters?: { dates?: string[]; student_id?: string; startDate?: string; endDate?: string }) {
    const headers = await getHeaders();
    let query = `org_id=eq.${encodeURIComponent(orgId)}&select=*&order=date.desc,start.asc`;
    
    if (filters?.dates && filters.dates.length > 0) {
      const dateList = filters.dates.map(d => `"${d}"`).join(',');
      query += `&date=in.(${dateList})`;
    } else {
      if (filters?.startDate) query += `&date=gte.${encodeURIComponent(filters.startDate)}`;
      if (filters?.endDate) query += `&date=lte.${encodeURIComponent(filters.endDate)}`;
    }
    
    if (filters?.student_id) query += `&student_id=eq.${encodeURIComponent(filters.student_id)}`;
    
    const url = `${SUPABASE_URL}/rest/v1/attendances?${query}`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch attendances list');
  },

  async updateAttendance(orgId: string, id: string, data: Partial<{ start: string; end: string | null; date: string }>) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/attendances?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    return handleResponse(response, 'Failed to update attendance');
  },

  async checkIn(orgId: string, studentId: string, date: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/rpc/attendance_check_in`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_student: studentId, p_date: date })
    });
    return handleResponse(response, 'Check-in failed');
  },

  async checkOut(orgId: string, studentId: string, date: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/rpc/attendance_check_out`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_student: studentId, p_date: date })
    });
    return handleResponse(response, 'Check-out failed');
  },

  async deleteAttendance(orgId: string, id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/attendances?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Delete attendance failed');
  },

  async createAttendanceManual(orgId: string, data: { student_id: string, date: string, start: string, end: string }) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/attendances`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, org_id: orgId })
    });
    return handleResponse(response, 'Manual check-in failed');
  },

  // COURSE METHODS
  async getCourses(orgId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/courses?org_id=eq.${encodeURIComponent(orgId)}&select=*&order=name`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch courses');
  },

  async createCourse(orgId: string, name: string, color: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/courses`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, color, org_id: orgId })
    });
    return handleResponse(response, 'Failed to create course');
  },

  async updateCourse(orgId: string, id: string, name: string, color: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/courses?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name, color })
    });
    return handleResponse(response, 'Failed to update course');
  },

  async deleteCourse(orgId: string, id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/courses?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Failed to delete course');
  },

  // STUDENT METHODS
  async getStudents(orgId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/students?org_id=eq.${encodeURIComponent(orgId)}&select=*&order=name`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch students');
  },

  async createStudent(orgId: string, name: string, contact: string, level?: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/students`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, contact, level, org_id: orgId })
    });
    return handleResponse(response, 'Failed to create student');
  },

  async updateStudent(orgId: string, id: string, name: string, contact: string, level?: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/students?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name, contact, level })
    });
    return handleResponse(response, 'Failed to update student');
  },

  async deleteStudent(orgId: string, id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/students?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Failed to delete student');
  },

  // BACKUP METHODS (EDGE FUNCTIONS)
  async listBackups(orgId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/functions/v1/backup-list`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: orgId })
    });
    return handleResponse(response, 'Failed to fetch backups');
  },

  async createBackup(orgId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/functions/v1/backup-create`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: orgId })
    });
    return handleResponse(response, 'Failed to create backup');
  },

  async uploadBackup(orgId: string, file: File) {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${session?.access_token || SUPABASE_KEY}`
    };
    
    const formData = new FormData();
    formData.append('org_id', orgId);
    formData.append('file', file);

    const url = `${SUPABASE_URL}/functions/v1/backup-upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });
    return handleResponse(response, 'Failed to upload backup');
  },

  async downloadBackup(backupId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/functions/v1/backup-download`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: backupId })
    });
    return handleResponse(response, 'Failed to fetch backup download URL');
  },

  async deleteBackup(backupId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/functions/v1/backup-delete`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: backupId })
    });
    return handleResponse(response, 'Failed to delete backup');
  },

  async restoreBackup(backupId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/functions/v1/backup-restore`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: backupId })
    });
    return handleResponse(response, 'Failed to restore backup');
  },

  // ACCESS MANAGEMENT
  async getStudentAccessList(studentId: string) {
    const { data, error } = await supabase
      .from('user_students')
      .select('email')
      .eq('student_id', studentId);
    
    if (error) {
      console.error('Error fetching student access list:', error);
      throw error;
    }

    return (data || []).map((item: any) => item.email).filter(Boolean);
  },

  async linkUserToStudent(studentId: string, email: string) {
    const { error } = await supabase.rpc('user_student_link', {
      p_email: email,
      p_student_id: studentId
    });
    if (error) throw error;
    return true;
  },

  async unlinkUserFromStudent(studentId: string, email: string) {
    const { error } = await supabase.rpc('user_student_unlink', {
      p_email: email,
      p_student_id: studentId
    });
    if (error) throw error;
    return true;
  },

  // PARENT DASHBOARD METHODS
  async getParentStudents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/user_students?user_id=eq.${user.id}&select=students(*,organizations(name))`;
    const response = await fetch(url, { headers });
    const data = await handleResponse(response, 'Failed to fetch parent students');
    const items = Array.isArray(data) ? data : (data ? [data] : []);
    return items.map((item: any) => {
      if (!item.students) return null;
      return {
        ...item.students,
        organization_name: item.students.organizations?.name
      };
    }).filter((s: any) => s !== null);
  },

  async getStudentBookings(studentId: string, filters?: { date?: string; startDate?: string; endDate?: string }) {
    const headers = await getHeaders();
    let query = `student_id=eq.${encodeURIComponent(studentId)}&select=id,date,start,end,student_id,course_id,courses(name,color)&order=date.desc,start.asc`;
    if (filters?.date) {
      query += `&date=eq.${encodeURIComponent(filters.date)}`;
    } else {
      if (filters?.startDate) query += `&date=gte.${encodeURIComponent(filters.startDate)}`;
      if (filters?.endDate) query += `&date=lte.${encodeURIComponent(filters.endDate)}`;
    }
    const url = `${SUPABASE_URL}/rest/v1/bookings?${query}`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch student bookings');
  },

  async getStudentAttendances(studentId: string, filters?: { date?: string; startDate?: string; endDate?: string }) {
    const headers = await getHeaders();
    let query = `student_id=eq.${encodeURIComponent(studentId)}&select=*&order=date.desc,start.desc`;
    if (filters?.date) {
      query += `&date=eq.${encodeURIComponent(filters.date)}`;
    } else {
      if (filters?.startDate) query += `&date=gte.${encodeURIComponent(filters.startDate)}`;
      if (filters?.endDate) query += `&date=lte.${encodeURIComponent(filters.endDate)}`;
    }
    const url = `${SUPABASE_URL}/rest/v1/attendances?${query}`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch student attendances');
  }
};
