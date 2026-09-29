import { api } from '../lib/axios';

export const authService = {
  login: (data: any) => api.post('/auth/login', data).then(res => res.data),
  getMe: () => api.get('/auth/me').then(res => res.data),
};

export const employeeService = {
  getAll: (params?: any) => api.get('/employees', { params }).then(res => res.data),
  getById: (id: string) => api.get(`/employees/${id}`).then(res => res.data),
  create: (data: any) => api.post('/employees', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/employees/${id}`).then(res => res.data),
  changePassword: (id: string, data: any) => api.put(`/employees/${id}/password`, data).then(res => res.data),
  getSubordinates: (id: string) => api.get(`/employees/${id}/subordinates`).then(res => res.data),
  getDocuments: (id: string) => api.get(`/employees/${id}/documents`).then(res => res.data),
  uploadDocument: (id: string, formData: FormData, onUploadProgress?: (progressEvent: any) => void) => api.post(`/employees/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress }).then(res => res.data),
  downloadDocument: (id: string, documentId: string) => api.get(`/employees/${id}/documents/${documentId}/download`, { responseType: 'blob' }).then(res => res.data),
  viewDocument: async (employeeId: string, documentId: string) => {
    const response = await api.get(`/employees/${employeeId}/documents/${documentId}/view`, {
      responseType: 'blob'
    });
    return response.data;
  },
  deleteDocument: (id: string, documentId: string) => api.delete(`/employees/${id}/documents/${documentId}`).then(res => res.data),
  getAuditLogs: (id: string, page: number = 1, pageSize: number = 10) => api.get(`/employees/${id}/audit-log?page=${page}&pageSize=${pageSize}`).then(res => res.data)
};

export const leaveService = {
  getTypes: (employeeId?: string) => api.get('/leave-types', { params: { employeeId } }).then(res => res.data),
  getRequests: (params?: any) => api.get('/leave-requests', { params }).then(res => res.data),
  create: (data: any) => api.post('/leave-requests', data).then(res => res.data),
  approve: (id: string) => api.put(`/leave-requests/${id}/approve`).then(res => res.data),
  reject: ({ id, reason }: { id: string, reason: string }) => api.put(`/leave-requests/${id}/reject`, { reason }).then(res => res.data),
  getBalances: (employeeId: string) => api.get(`/leave-balances/${employeeId}`).then(res => res.data)
};

export const financeService = {
  getRequests: (params?: any) => api.get('/finance-requests', { params }).then(res => res.data),
  create: (data: FormData) => api.post('/finance-requests', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
  approve: (id: string) => api.put(`/finance-requests/${id}/approve`).then(res => res.data),
  reject: ({ id, reason }: { id: string, reason: string }) => api.put(`/finance-requests/${id}/reject`, { reason }).then(res => res.data),
};

export const attendanceService = {
  clockIn: async (data: any) => {
    const formData = new FormData();
    formData.append('type', 'CheckIn');
    formData.append('clientCapturedAt', new Date().toISOString());
    formData.append('latitude', data.latitude);
    formData.append('longitude', data.longitude);
    formData.append('accuracyMeters', data.accuracyMeters || '10');
    formData.append('workMode', data.workMode || 'Office');
    
    if (data.photoBase64) {
      const res = await fetch(data.photoBase64);
      const blob = await res.blob();
      formData.append('photo', blob, 'photo.jpg');
    }
    
    return api.post('/attendances/submit', formData, {
      headers: {
        'idempotency-key': crypto.randomUUID()
      }
    }).then(res => res.data);
  },
  clockOut: async (data: any) => {
    const formData = new FormData();
    formData.append('type', 'CheckOut');
    formData.append('clientCapturedAt', new Date().toISOString());
    formData.append('latitude', data.latitude);
    formData.append('longitude', data.longitude);
    formData.append('accuracyMeters', data.accuracyMeters || '10');
    formData.append('workMode', data.workMode || 'Office');
    
    if (data.photoBase64) {
      const res = await fetch(data.photoBase64);
      const blob = await res.blob();
      formData.append('photo', blob, 'photo.jpg');
    }
    
    return api.post('/attendances/submit', formData, {
      headers: {
        'idempotency-key': crypto.randomUUID()
      }
    }).then(res => res.data);
  },
  getAttendances: (params?: any) => api.get('/attendances', { params }).then(res => res.data),
  getSummary: (employeeId: string, month: number, year: number) => api.get(`/attendances/summary/${employeeId}?month=${month}&year=${year}`).then(res => res.data),
  export: (params?: any) => api.get('/attendances/export', { params, responseType: 'blob' }).then(res => res.data),
  getEffectiveShift: (employeeId: string, date: string) => api.get(`/employees/${employeeId}/effective-shift?date=${date}`).then(res => res.data)
};

export const departmentService = {
  getAll: () => api.get('/departments').then(res => res.data),
  create: (data: any) => api.post('/departments', data).then(res => res.data),
  delete: (id: string) => api.delete(`/departments/${id}`).then(res => res.data)
};

export const positionService = {
  getAll: () => api.get('/positions').then(res => res.data),
  create: (data: any) => api.post('/positions', data).then(res => res.data),
  delete: (id: string) => api.delete(`/positions/${id}`).then(res => res.data)
};

export const roleService = {
  getRoles: () => api.get('/roles').then(res => res.data),
  createRole: (data: any) => api.post('/roles', data).then(res => res.data),
  getPermissions: () => api.get('/roles/permissions').then(res => res.data),
  getRolePermissions: (roleId: string) => api.get(`/roles/${roleId}/permissions`).then(res => res.data),
  assignPermissions: (roleId: string, data: any) => api.post(`/roles/${roleId}/permissions`, data).then(res => res.data)
};

export const dailyReportService = {
  getAll: (params?: any) => api.get('/daily-reports', { params }).then(res => res.data),
  getById: (id: string) => api.get(`/daily-reports/${id}`).then(res => res.data),
  create: (data: any) => api.post('/daily-reports', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/daily-reports/${id}`, data).then(res => res.data),
  review: (id: string, data: any) => api.put(`/daily-reports/${id}/review`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/daily-reports/${id}`).then(res => res.data)
};

export const workShiftService = {
  getAll: () => api.get('/work-shifts').then(res => res.data),
  create: (data: any) => api.post('/work-shifts', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/work-shifts/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/work-shifts/${id}`).then(res => res.data)
};

export const shiftScheduleService = {
  getSchedules: (employeeId: string, startDate: string, endDate: string) => api.get(`/shift-schedules?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`).then(res => res.data),
  assign: (data: any) => api.post('/shift-schedules', data).then(res => res.data),
  generate: (data: { startDate: string; endDate: string }) => api.post('/shift-schedules/generate', data).then(res => res.data),
  override: (id: string, data: { workShiftId: string }) => api.put(`/shift-schedules/${id}/override`, data).then(res => res.data)
};

export const shiftRotationService = {
  getGroups: () => api.get('/shift-rotation-groups').then(res => res.data),
  getGroup: (id: string) => api.get(`/shift-rotation-groups/${id}`).then(res => res.data),
  createGroup: (data: any) => api.post('/shift-rotation-groups', data).then(res => res.data),
  updateGroup: (id: string, data: any) => api.put(`/shift-rotation-groups/${id}`, data).then(res => res.data),
  deleteGroup: (id: string) => api.delete(`/shift-rotation-groups/${id}`).then(res => res.data),
  assignEmployees: (groupId: string, employeeIds: string[]) => api.post(`/shift-rotation-groups/${groupId}/assign-employees`, employeeIds).then(res => res.data),
  
  getPatterns: (groupId: string) => api.get(`/shift-rotation-groups/${groupId}/patterns`).then(res => res.data),
  createPattern: (groupId: string, data: any) => api.post(`/shift-rotation-groups/${groupId}/patterns`, data).then(res => res.data),
  updatePattern: (groupId: string, patternId: string, data: any) => api.put(`/shift-rotation-groups/${groupId}/patterns/${patternId}`, data).then(res => res.data),
  deletePattern: (groupId: string, patternId: string) => api.delete(`/shift-rotation-groups/${groupId}/patterns/${patternId}`).then(res => res.data)
};

export const assessmentService = {
  getTests: (type?: number) => api.get('/assessments/tests', { params: type !== undefined ? { type } : {} }).then(res => res.data),
  getTestQuestions: (id: string) => api.get(`/assessments/tests/${id}/questions`).then(res => res.data),
  startSession: (data: any) => api.post('/assessments/sessions', data).then(res => res.data),
  getSession: (sessionId: string) => api.get(`/assessments/sessions/${sessionId}`).then(res => res.data),
  verifyAccessCode: (sessionId: string, accessCode: string) => api.post(`/assessments/sessions/${sessionId}/verify-access`, { accessCode }).then(res => res.data),
  uploadSnapshot: (sessionId: string, base64Image: string) => api.post(`/assessments/sessions/${sessionId}/proctoring-snapshot`, { base64Image }).then(res => res.data),
  recordTabSwitch: (sessionId: string, tabSwitchCount: number) => api.post(`/assessments/sessions/${sessionId}/tab-switch`, { tabSwitchCount }).then(res => res.data),
  submitAnswer: (sessionId: string, data: any) => api.post(`/assessments/sessions/${sessionId}/answers`, data).then(res => res.data),
  submitSession: (sessionId: string) => api.post(`/assessments/sessions/${sessionId}/submit`).then(res => res.data),
  getTestResult: (sessionId: string) => api.get(`/assessments/sessions/${sessionId}/result`).then(res => res.data)
};

export const candidateService = {
  getAll: () => api.get('/candidates').then(res => res.data),
  getById: (id: string) => api.get(`/candidates/${id}`).then(res => res.data),
  create: (data: any) => api.post('/candidates', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/candidates/${id}`, data).then(res => res.data),
  updateStatus: (id: string, status: string) => api.put(`/candidates/${id}/status`, `"${status}"`, { headers: { 'Content-Type': 'application/json' } }).then(res => res.data),
  assignTest: (id: string, data: any) => api.post(`/candidates/${id}/assign-test`, data).then(res => res.data),
  getTestResults: (id: string) => api.get(`/candidates/${id}/test-results`).then(res => res.data),
  convertToEmployee: (id: string, data: any) => api.post(`/candidates/${id}/convert-to-employee`, data).then(res => res.data),
  getDocuments: (id: string) => api.get(`/candidates/${id}/documents`).then(res => res.data),
  downloadDocument: (candidateId: string, documentId: string) => api.get(`/candidates/${candidateId}/documents/${documentId}/download`, { responseType: 'blob' }).then(res => res.data),
  viewDocument: async (candidateId: string, documentId: string) => {
    const response = await api.get(`/candidates/${candidateId}/documents/${documentId}/view`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export const jobOpeningService = {
  getAll: () => api.get('/job-openings').then(res => res.data),
  getById: (id: string) => api.get(`/job-openings/${id}`).then(res => res.data),
  create: (data: any) => api.post('/job-openings', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/job-openings/${id}`, data).then(res => res.data),
  toggleStatus: (id: string) => api.put(`/job-openings/${id}/toggle-status`).then(res => res.data),
  delete: (id: string) => api.delete(`/job-openings/${id}`).then(res => res.data)
};

export const publicService = {
  getJobOpenings: () => api.get('/public/job-openings').then(res => res.data),
  getJobOpeningById: (id: string) => api.get(`/public/job-openings/${id}`).then(res => res.data),
  applyJob: (formData: FormData) => api.post('/public/apply', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data)
};


