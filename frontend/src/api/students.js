import api from './client'

export const studentsApi = {
  list: (params) => api.get('/students/', { params }),
  get:  (id)     => api.get(`/students/${id}`),
  add:  (data)   => api.post('/students/add', data),
}
