import api from './client'

export const attendanceApi = {
  startSession:   (data)      => api.post('/attendance/start', data),
  stopSession:    (data)      => api.post('/attendance/stop', data),
  mark:           (data)      => api.post('/attendance/mark', data),
  today:          (params)    => api.get('/attendance/today', { params }),
  report:         (params)    => api.get('/attendance/report', { params }),
  studentSummary: (studentId) => api.get(`/attendance/student/${studentId}`),
  exportExcel:    (subjectId) =>
    api.get(`/attendance/export/${subjectId}`, { responseType: 'blob' }),
}
