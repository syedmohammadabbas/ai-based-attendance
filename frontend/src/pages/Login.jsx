import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, BrainCircuit, LogIn, UserPlus, Lock, Mail, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../api/api'
import { useAuthStore } from '../store/authStore'
import clsx from 'clsx'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const fn = mode === 'login' ? authApi.login : authApi.register
      const res = await fn(data)
      const { token, data: admin } = res.data
      setAuth(token, admin)
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
      navigate('/')
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Something went wrong. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    reset()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.08)_0%,_transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-modal overflow-hidden">
          {/* Header gradient */}
          <div className="bg-gradient-to-r from-primary-600 to-violet-600 px-8 py-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <BrainCircuit size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">AI Attendance</h1>
                <p className="text-primary-200 text-xs">Management System</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Welcome back!' : 'Create account'}
            </h2>
            <p className="text-primary-200 text-sm mt-1">
              {mode === 'login'
                ? 'Sign in to your admin account'
                : 'Register a new admin account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-5">
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
                    className={clsx('input-field pl-10', errors.name && 'border-rose-400 focus:ring-rose-400')}
                    placeholder="John Smith"
                  />
                </div>
                {errors.name && <p className="text-xs text-rose-500 mt-1.5">{errors.name.message}</p>}
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                  })}
                  type="email"
                  className={clsx('input-field pl-10', errors.email && 'border-rose-400 focus:ring-rose-400')}
                  placeholder="admin@example.com"
                />
              </div>
              {errors.email && <p className="text-xs text-rose-500 mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Min 6 characters' },
                  })}
                  type={showPass ? 'text' : 'password'}
                  className={clsx('input-field pl-10 pr-10', errors.password && 'border-rose-400 focus:ring-rose-400')}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-500 mt-1.5">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm font-semibold mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={switchMode}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                {mode === 'login'
                  ? "Don't have an account? Register"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-5">
          AI-Powered Attendance Management System v1.0
        </p>
      </div>
    </div>
  )
}
