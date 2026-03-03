import clsx from 'clsx'

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'bg-indigo-100 text-indigo-600',
    value: 'text-indigo-700',
    border: 'border-indigo-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-700',
    border: 'border-emerald-100',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'bg-rose-100 text-rose-600',
    value: 'text-rose-700',
    border: 'border-rose-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-700',
    border: 'border-amber-100',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'bg-violet-100 text-violet-600',
    value: 'text-violet-700',
    border: 'border-violet-100',
  },
  sky: {
    bg: 'bg-sky-50',
    icon: 'bg-sky-100 text-sky-600',
    value: 'text-sky-700',
    border: 'border-sky-100',
  },
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo', loading }) {
  const c = colorMap[color] ?? colorMap.indigo

  return (
    <div className={clsx('card p-5 flex items-start gap-4 border', c.border)}>
      <div className={clsx('rounded-xl p-3 flex-shrink-0', c.icon)}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-20 bg-slate-100 rounded animate-pulse mb-1" />
        ) : (
          <p className={clsx('text-3xl font-bold', c.value)}>{value ?? '—'}</p>
        )}
        {subtitle && <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  )
}
