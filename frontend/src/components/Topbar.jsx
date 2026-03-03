import { Menu, Bell, Search } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'

export default function Topbar({ onMenuClick }) {
  const admin = useAuthStore((s) => s.admin)
  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 lg:px-6 py-3 flex items-center gap-4">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Date */}
      <div className="hidden sm:block">
        <p className="text-xs text-slate-400 font-medium">{today}</p>
      </div>

      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
            {admin?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{admin?.name ?? 'Admin'}</p>
            <p className="text-xs text-slate-400 capitalize">{admin?.role ?? 'admin'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
