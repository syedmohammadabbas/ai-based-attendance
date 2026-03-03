import api from './client'

export const faceApi = {
  register: (studentId, formData) =>
    api.post(`/face/register/${studentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  recognize: (formData) =>
    api.post('/face/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  listRegistered:  ()          => api.get('/face/registered'),
  deleteFace:      (studentId) => api.delete(`/face/register/${studentId}`),
  currentSession:  ()          => api.get('/face/current-session'),
}
