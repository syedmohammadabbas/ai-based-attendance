import api from './client'

export const subjectsApi = {
  list: (params) => api.get('/subjects/', { params }),
  add:  (data)   => api.post('/subjects/', data),
}
