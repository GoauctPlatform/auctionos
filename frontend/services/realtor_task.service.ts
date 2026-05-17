import { API_URL, getHeaders } from './httpClient';

export interface Task {
  id: number;
  title: string;
  description?: string;
  task_type: string;
  status: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  geo_radius_meters?: number;
  min_photos: number;
  max_photos: number;
  reward_points: number;
  deadline?: string;
  claimed_at?: string;
  submitted_at?: string;
  approved_at?: string;
  parcel_id?: string;
  state?: string;
  county?: string;
  investor_name?: string;
  realtor_name?: string;
  created_at?: string;
  checklist_requirements?: string;
  gps_photo_reference?: string;
}

export interface Commission {
  id: number;
  task_id?: number;
  task_title?: string;
  points: number;
  usd_value: number;
  type: string;
  status: string;
  description?: string;
  created_at: string;
}

export interface CommissionsResponse {
  commissions: Commission[];
  total_earned_points: number;
  total_earned_usd: number;
  withdrawn_points: number;
  available_points: number;
  available_usd: number;
}

export const RealtorTaskService = {
  getAvailableTasks: async (state?: string, taskType?: string): Promise<Task[]> => {
    const qs = new URLSearchParams();
    if (state) qs.set('state', state);
    if (taskType) qs.set('task_type', taskType);
    const res = await fetch(`${API_URL}/realtor-tasks/available?${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch available tasks');
    return res.json();
  },

  getMyTasks: async (status?: string): Promise<Task[]> => {
    const qs = status ? `?status=${status}` : '';
    const res = await fetch(`${API_URL}/realtor-tasks/my${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch my tasks');
    return res.json();
  },

  claimTask: async (taskId: number, deadlineHours: number = 48): Promise<any> => {
    const res = await fetch(`${API_URL}/realtor-tasks/${taskId}/claim`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ deadline_hours: deadlineHours }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to claim task');
    return res.json();
  },

  submitEvidence: async (
    taskId: number,
    files: File[],
    lat?: number,
    lng?: number,
    notes?: string,
    checklistResponses?: string
  ): Promise<any> => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    if (lat !== undefined) form.append('submission_lat', lat.toString());
    if (lng !== undefined) form.append('submission_lng', lng.toString());
    if (notes) form.append('notes', notes);
    if (checklistResponses) form.append('checklist_responses', checklistResponses);

    const res = await fetch(`${API_URL}/realtor-tasks/${taskId}/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, // no Content-Type for multipart
      body: form,
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to submit evidence');
    return res.json();
  },

  getCommissions: async (): Promise<CommissionsResponse> => {
    const res = await fetch(`${API_URL}/realtor-tasks/commissions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch commissions');
    return res.json();
  },
};

export const InvestorTaskService = {
  createTask: async (payload: {
    property_id: number;
    title: string;
    description?: string;
    task_type?: string;
    min_photos?: number;
    max_photos?: number;
    reward_points?: number;
  }): Promise<any> => {
    const res = await fetch(`${API_URL}/investor/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create task');
    return res.json();
  },

  getMyTasks: async (): Promise<Task[]> => {
    const res = await fetch(`${API_URL}/investor/tasks`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  reviewSubmission: async (taskId: number, approved: boolean, reviewNotes?: string): Promise<any> => {
    const res = await fetch(`${API_URL}/investor/tasks/${taskId}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ approved, review_notes: reviewNotes }),
    });
    if (!res.ok) throw new Error('Failed to review submission');
    return res.json();
  },

  exportProperty: async (payload: {
    property_id: number;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    requested_sale_price?: number;
    notes?: string;
  }): Promise<any> => {
    const res = await fetch(`${API_URL}/investor/exports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to export property');
    return res.json();
  },

  updateTask: async (taskId: number, payload: {
    title?: string;
    description?: string;
    min_photos?: number;
    max_photos?: number;
    reward_points?: number;
  }): Promise<any> => {
    const res = await fetch(`${API_URL}/investor/tasks/${taskId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update task');
    return res.json();
  },

  deleteTask: async (taskId: number): Promise<any> => {
    const res = await fetch(`${API_URL}/investor/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete task');
    return res.json();
  },

  getMyExports: async (): Promise<any[]> => {
    const res = await fetch(`${API_URL}/investor/exports`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  updateExport: async (exportId: number, payload: {
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    notes?: string;
  }): Promise<any> => {
    const res = await fetch(`${API_URL}/investor/exports/${exportId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update export');
    return res.json();
  },

  cancelExport: async (exportId: number): Promise<void> => {
    await fetch(`${API_URL}/investor/exports/${exportId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  createSupportTicket: async (payload: {
    subject: string;
    message: string;
    ticket_type?: string;
    task_id?: number;
  }): Promise<any> => {
    const res = await fetch(`${API_URL}/investor/support`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create support ticket');
    return res.json();
  },

  getMyTickets: async (): Promise<any[]> => {
    const res = await fetch(`${API_URL}/investor/support`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
};
