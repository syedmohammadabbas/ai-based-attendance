export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon size={28} className="text-slate-400" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {message && <p className="text-sm text-slate-400 max-w-xs mb-5">{message}</p>}
      {action}
    </div>
  )
}
