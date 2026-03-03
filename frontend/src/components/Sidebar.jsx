import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  LogOut,
  BrainCircuit,
  ChevronRight,
  ScanFace,
  CalendarDays,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/timetable', icon: CalendarDays, label: 'Timetable' },
  { to: '/face', icon: ScanFace, label: 'AI Face Scan', badge: 'AI' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
]

export default function Sidebar({ open, onClose }) {
  const { admin, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
    onClose?.()
  }

  const initials = admin?.name
    ? admin.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-64 flex flex-col z-40 transition-transform duration-300',
          'bg-gradient-to-b from-slate-900 to-slate-800',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/50">
            <BrainCircuit size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">AI Attendance</p>
            <p className="text-slate-400 text-xs">Management System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
            Navigation
          </p>
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'sidebar-link group',
                  isActive && 'active'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 leading-none">
                      {badge}
                    </span>
                  )}
                  {isActive && <ChevronRight size={14} className="opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{admin?.name ?? 'Admin'}</p>
              <p className="text-slate-400 text-xs truncate">{admin?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full sidebar-link text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
