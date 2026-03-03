import { create } from 'zustand'

const getStoredAdmin = () => {
  try {
    const raw = localStorage.getItem('admin')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  admin: getStoredAdmin(),
  isAuthenticated: !!localStorage.getItem('token'),

  setAuth: (token, admin) => {
    localStorage.setItem('token', token)
    localStorage.setItem('admin', JSON.stringify(admin))
    set({ token, admin, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    set({ token: null, admin: null, isAuthenticated: false })
  },
}))
