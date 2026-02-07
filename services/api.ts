
import { supabase, SUPABASE_URL, SUPABASE_KEY, SUPABASE_ORG_ID } from './supabaseClient';

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
      const text = await response.text();
      if (text) errorDetail = text;
    }
    throw new Error(`${errorMessage}: ${errorDetail}`);
  }

  const text = await response.text();
  if (!text) return null;
  
  try {
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
    const { data, error } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', id);
    
    if (error) throw new Error(`Failed to update organization: ${error.message}`);
    return data;
  },

  async updateOrganizationBackupTime(id: string, backupTime: string | null) {
    const { data, error } = await supabase
      .from('organizations')
      .update({ backup_time: backupTime })
      .eq('id', id);

    if (error) throw new Error(`Failed to update backup point: ${error.message}`);
    return data;
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
    const url = `${SUPABASE_URL}/rest/v1/bookings?org_id=eq.${encodeURIComponent(orgId)}&date=eq.${encodeURIComponent(date)}&select=id,date,start,end,check_in,check_out,student_id,invoice_id,students(name,contact,id,level),courses(name,color)`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch bookings');
  },

  async getAllBookings(orgId: string, filters?: { dates?: string[]; student_id?: string; course_id?: string; startDate?: string; endDate?: string }) {
    const headers = await getHeaders();
    let query = `org_id=eq.${encodeURIComponent(orgId)}&select=id,date,start,end,check_in,check_out,student_id,course_id,invoice_id,students(name,contact,id,level,org_id),courses(name,color)&order=date.desc,start.asc`;
    
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
    const payload = { ...data, org_id: orgId };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const result = await handleResponse(response, 'Failed to create booking');
    // Supabase returns an array of objects for 'return=representation' on POST.
    // We expect a single booking creation, so return the first item.
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    return null; // Return null if nothing was created or response format is unexpected
  },

  async updateBooking(orgId: string, id: string, data: Partial<{ student_id: string; course_id: string; date: string; start: string; end: string; check_in: string | null; check_out: string | null }>) {
    const { data: updated, error } = await supabase
      .from('bookings')
      .update(data)
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw new Error(`Failed to update booking: ${error.message}`);
    return updated;
  },

  async deleteBooking(orgId: string, id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/bookings?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Failed to delete booking');
  },

  // COURSE METHODS
  async getPublicCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('name');
    
    if (error) {
      console.warn("Public Courses Fetch Warning:", error.message);
      return [];
    }
    return data || [];
  },

  async getCourses(orgId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/courses?org_id=eq.${encodeURIComponent(orgId)}&select=*&order=name`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch courses');
  },

  async getCourse(orgId: string, courseId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/courses?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(courseId)}&select=*`;
    const response = await fetch(url, { headers });
    const data = await handleResponse(response, 'Failed to fetch course');
    return Array.isArray(data) ? data[0] : null;
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
    const { data, error } = await supabase
      .from('courses')
      .update({ name, color })
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw new Error(`Failed to update course: ${error.message}`);
    return data;
  },

  async deleteCourse(orgId: string, id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/courses?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Failed to delete course');
  },

  // COURSE SCHEDULE METHODS
  async getCourseSchedules(courseId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/course_schedule?course_id=eq.${encodeURIComponent(courseId)}&select=*`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch course schedules');
  },

  async createCourseSchedule(data: { 
    course_id: string; 
    start_time: string; 
    end_time: string; 
    date?: string | null; 
    days_of_week?: number[] | null; 
    starts_on?: string | null; 
    biweekly: boolean;
  }) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/course_schedule`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return handleResponse(response, 'Failed to create course schedule');
  },

  async updateCourseSchedule(id: string, data: Partial<{
    start_time: string;
    end_time: string;
    date: string | null;
    days_of_week: number[] | null;
    starts_on: string | null;
    biweekly: boolean;
  }>) {
    const { data: updated, error } = await supabase
      .from('course_schedule')
      .update(data)
      .eq('id', id);

    if (error) throw new Error(`Failed to update schedule: ${error.message}`);
    return updated;
  },

  async deleteCourseSchedule(id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/course_schedule?id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Failed to delete course schedule');
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

  async createPortalStudent(name: string, contact: string, level?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/students`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, contact, level, user_id: user.id, org_id: SUPABASE_ORG_ID })
    });
    return handleResponse(response, 'Failed to create portal student');
  },

  async updateStudent(orgId: string, id: string, name: string, contact: string, level?: string) {
    const { data, error } = await supabase
      .from('students')
      .update({ name, contact, level })
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw new Error(`Failed to update student: ${error.message}`);
    return data;
  },

  async deleteStudent(orgId: string, id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/students?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Failed to delete student');
  },

  // ISSUE METHODS
  async getIssues(orgId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/issues?select=*,bookings!inner(*,students(name),courses(name))&bookings.org_id=eq.${encodeURIComponent(orgId)}&order=created_at.desc`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch issues');
  },

  async createIssue(data: { booking_id: string; issue_type: 'missed_booking' | 'unpaid_booking'; resolution: string }) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/issues`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return handleResponse(response, 'Failed to create issue');
  },

  async updateIssue(id: string, data: Partial<{ resolution: string; resolved_at: string | null }>) {
    const { data: updated, error } = await supabase
      .from('issues')
      .update(data)
      .eq('id', id);

    if (error) throw new Error(`Failed to update issue: ${error.message}`);
    return updated;
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
      .from('students')
      .select('user_id')
      .eq('id', studentId)
      .single();
    
    if (error) {
      console.error('Error fetching student access:', error);
      throw error;
    }

    return data.user_id ? [data.user_id] : [];
  },

  async linkUserToStudent(studentId: string, email: string) {
    const { error } = await supabase.rpc('link_student_to_user_by_email', {
      p_email: email,
      p_student_id: studentId
    });
    if (error) throw error;
    return true;
  },

  async unlinkUserFromStudent(studentId: string, _email: string) {
    const { error } = await supabase.rpc('unlink_student_from_user', {
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
    const url = `${SUPABASE_URL}/rest/v1/students?user_id=eq.${user.id}&select=*,organizations(name)`;
    const response = await fetch(url, { headers });
    const data = await handleResponse(response, 'Failed to fetch parent students');
    const items = Array.isArray(data) ? data : (data ? [data] : []);
    return items.map((item: any) => ({
      ...item,
      organization_name: item.organizations?.name
    }));
  },

  async getStudentBookings(studentId: string, filters?: { date?: string; startDate?: string; endDate?: string }) {
    const headers = await getHeaders();
    let query = `student_id=eq.${encodeURIComponent(studentId)}&select=id,date,start,end,check_in,check_out,student_id,course_id,courses(name,color)&order=date.desc,start.asc`;
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

  async createBookingRequest(data: { student_id: string; course_id: string; date: string; start_time: string; end_time: string; message?: string; org_id: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/booking_requests`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, requester_id: user.id })
    });
    return handleResponse(response, 'Failed to create booking request');
  },

  async getBookingRequests(orgId: string, status?: string) {
    const headers = await getHeaders();
    let query = `select=*,students!inner(name,org_id),courses(name)&students.org_id=eq.${encodeURIComponent(orgId)}&order=created_at.desc`;
    if (status) query += `&status=eq.${status}`;
    const url = `${SUPABASE_URL}/rest/v1/booking_requests?${query}`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch booking requests');
  },

  async getPortalBookingRequests(status?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const headers = await getHeaders();
    let query = `requester_id=eq.${user.id}&select=*,students!inner(name,org_id),courses(name)&order=created_at.desc`;
    if (status) query += `&status=eq.${status}`;
    const url = `${SUPABASE_URL}/rest/v1/booking_requests?${query}`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch portal booking requests');
  },

  async getAllBookingRequests(orgId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/booking_requests?select=*,students!inner(name,org_id),courses(name)&students.org_id=eq.${encodeURIComponent(orgId)}&order=created_at.desc`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch all booking requests');
  },

  async getBookingRequestsForContext(orgId: string, date: string, courseId: string) {
    const headers = await getHeaders();
    const url = `${SUPABASE_URL}/rest/v1/booking_requests?select=*,students!inner(name,org_id),courses(name)&students.org_id=eq.${encodeURIComponent(orgId)}&date=eq.${date}&course_id=eq.${courseId}&order=start_time.asc`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch contextual booking requests');
  },

  async updateBookingRequest(id: string, data: Partial<{ status: string; response_message: string; responded_at: string; responded_by: string; message: string }>) {
    const { data: updated, error } = await supabase
      .from('booking_requests')
      .update(data)
      .eq('id', id)
      .select();

    if (error) throw new Error(`Failed to update booking request: ${error.message}`);
    return updated ? updated[0] : null;
  },

  async deleteBookingRequest(id: string) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/booking_requests?id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: 'DELETE', headers });
    return handleResponse(response, 'Failed to delete booking request');
  },

  // Added Attendance methods
  async getAllAttendances(orgId: string, filters?: { startDate?: string; endDate?: string }) {
    const headers = await getHeaders();
    let query = `org_id=eq.${encodeURIComponent(orgId)}&select=*&order=date.desc,start.asc`;
    if (filters?.startDate) query += `&date=gte.${encodeURIComponent(filters.startDate)}`;
    if (filters?.endDate) query += `&date=lte.${encodeURIComponent(filters.endDate)}`;
    
    const url = `${SUPABASE_URL}/rest/v1/attendances?${query}`;
    const response = await fetch(url, { headers });
    return handleResponse(response, 'Failed to fetch attendances');
  },

  async createAttendanceManual(orgId: string, data: { student_id: string; date: string; start: string; end: string }) {
    const headers = await getHeaders(true);
    const url = `${SUPABASE_URL}/rest/v1/attendances`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, org_id: orgId })
    });
    return handleResponse(response, 'Failed to create manual attendance');
  }
};
