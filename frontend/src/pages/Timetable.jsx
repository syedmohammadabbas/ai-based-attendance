import { useState, useEffect, useCallback } from 'react'
import axios from '../api/api'
import toast from 'react-hot-toast'
import {
  Calendar,
  Clock,
  BookOpen,
  User,
  MapPin,
  Play,
  Square,
  ChevronRight,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const SEM_COLORS = {
  'Semester 1': 'from-violet-500 to-purple-600',
  'Semester 2': 'from-blue-500 to-indigo-600',
  'Semester 3': 'from-cyan-500 to-teal-600',
  'Semester 4': 'from-emerald-500 to-green-600',
  'Semester 5': 'from-yellow-500 to-amber-600',
  'Semester 6': 'from-orange-500 to-red-500',
  'Semester 7': 'from-rose-500 to-pink-600',
  'Semester 8': 'from-slate-500 to-slate-700',
}

const SEM_LIGHT = {
  'Semester 1': 'bg-violet-50 border-violet-200 text-violet-800',
  'Semester 2': 'bg-blue-50 border-blue-200 text-blue-800',
  'Semester 3': 'bg-cyan-50 border-cyan-200 text-cyan-800',
  'Semester 4': 'bg-emerald-50 border-emerald-200 text-emerald-800',
  'Semester 5': 'bg-yellow-50 border-yellow-200 text-yellow-800',
  'Semester 6': 'bg-orange-50 border-orange-200 text-orange-800',
  'Semester 7': 'bg-rose-50 border-rose-200 text-rose-800',
  'Semester 8': 'bg-slate-100 border-slate-300 text-slate-800',
}

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="text-right">
      <p className="text-2xl font-bold text-slate-800 tabular-nums">{timeStr}</p>
      <p className="text-sm text-slate-500 mt-0.5">{dateStr}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'ongoing') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Ongoing
      </span>
    )
  }
  if (status === 'upcoming') {
    return (
      <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
        Upcoming
      </span>
    )
  }
  return (
    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      Completed
    </span>
  )
}

function TodaySlotCard({ slot, onAction, actionLoading }) {
  const isOngoing = slot.status === 'ongoing'
  const isUpcoming = slot.status === 'upcoming'
  const semColor = SEM_LIGHT[slot.semester] || 'bg-slate-50 border-slate-200 text-slate-700'
  const gradColor = SEM_COLORS[slot.semester] || 'from-slate-500 to-slate-700'

  return (
    <div
      className={clsx(
        'relative rounded-2xl border overflow-hidden transition-all',
        isOngoing
          ? 'border-emerald-300 shadow-lg shadow-emerald-100 ring-1 ring-emerald-300'
          : 'border-slate-200 shadow-sm hover:shadow-md',
        slot.status === 'completed' && 'opacity-60',
      )}
    >
      {/* Left color bar */}
      <div className={clsx('absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b', gradColor)} />

      <div className="pl-5 pr-4 py-4 flex items-start gap-4">
        {/* Time column */}
        <div className="w-20 flex-shrink-0 text-center">
          <p className={clsx('text-sm font-bold', isOngoing ? 'text-emerald-600' : 'text-slate-700')}>
            {slot.start_time}
          </p>
          <div className="my-1 border-l-2 border-dashed border-slate-300 h-4 mx-auto w-0" />
          <p className="text-sm text-slate-400">{slot.end_time}</p>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={clsx('font-semibold text-base leading-tight', isOngoing ? 'text-slate-900' : 'text-slate-700')}>
              {slot.subject_name}
            </h3>
            <StatusBadge status={slot.status} />
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <User size={11} /> {slot.faculty_name}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {slot.room}
            </span>
            <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium', semColor)}>
              <BookOpen size={10} /> {slot.semester}
            </span>
          </div>
        </div>

        {/* Action */}
        {(isOngoing || isUpcoming) && (
          <div className="flex-shrink-0">
            {slot.session_active ? (
              <button
                onClick={() => onAction(slot.subject_id, slot.session_id, 'stop')}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Square size={12} fill="currentColor" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => onAction(slot.subject_id, null, 'start')}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Play size={12} fill="currentColor" />
                Start
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function WeekGrid({ weekData, todayDow }) {
  const [activeDay, setActiveDay] = useState(todayDow >= 0 && todayDow < 6 ? todayDow : 0)

  const dayData = weekData[activeDay] || { slots: [] }

  return (
    <div className="card">
      {/* Day tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
        {DAY_SHORT.map((d, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            className={clsx(
              'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
              activeDay === i
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
              i === todayDow && activeDay !== i && 'text-primary-600',
            )}
          >
            {d}
            {i === todayDow && (
              <span className="block w-1 h-1 rounded-full bg-primary-500 mx-auto mt-0.5" />
            )}
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        {DAY_FULL[activeDay]} — {dayData.slots.length} classes
      </p>

      {dayData.slots.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Calendar size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No classes scheduled</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dayData.slots.map((slot) => {
            const gradColor = SEM_COLORS[slot.semester] || 'from-slate-500 to-slate-700'
            const semColor = SEM_LIGHT[slot.semester] || 'bg-slate-50 border-slate-200 text-slate-700'
            return (
              <div
                key={slot.id}
                className="relative flex items-center gap-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 p-3 transition-colors"
              >
                <div className={clsx('w-1 self-stretch rounded-full bg-gradient-to-b', gradColor)} />
                <div className="w-14 text-center flex-shrink-0">
                  <p className="text-xs font-bold text-slate-700">{slot.start_time}</p>
                  <p className="text-[10px] text-slate-400">{slot.end_time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{slot.subject_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-0.5"><User size={9} /> {slot.faculty_name}</span>
                    <span className="flex items-center gap-0.5"><MapPin size={9} /> {slot.room}</span>
                  </div>
                </div>
                <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full border hidden sm:block', semColor)}>
                  {slot.semester.replace('Semester ', 'Sem ')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Timetable() {
  const [todayData, setTodayData] = useState(null)
  const [weekData, setWeekData] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [tab, setTab] = useState('today')

  const todayDow = new Date().getDay() === 0 ? -1 : new Date().getDay() - 1  // convert JS 0=Sun to 0=Mon

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, weekRes] = await Promise.all([
        axios.get('/timetable/today'),
        axios.get('/timetable/'),
      ])
      setTodayData(todayRes.data)
      setWeekData(todayRes.data?.data ? weekRes.data.data : [])
    } catch {
      toast.error('Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Refresh every 60s so session status stays live
    const t = setInterval(fetchData, 60_000)
    return () => clearInterval(t)
  }, [fetchData])

  const handleAction = async (subjectId, sessionId, type) => {
    setActionLoading(true)
    try {
      if (type === 'start') {
        await axios.post('/attendance/start', { subject_id: subjectId })
        toast.success('Session started!')
      } else {
        await axios.post('/attendance/stop', { session_id: sessionId })
        toast.success('Session stopped.')
      }
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const stats = todayData
    ? {
        total: todayData.data.length,
        ongoing: todayData.data.filter((s) => s.status === 'ongoing').length,
        upcoming: todayData.data.filter((s) => s.status === 'upcoming').length,
        completed: todayData.data.filter((s) => s.status === 'completed').length,
      }
    : { total: 0, ongoing: 0, upcoming: 0, completed: 0 }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={28} className="animate-spin text-primary-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Timetable</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Auto-sessions start &amp; stop based on schedule
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <Wifi size={12} />
            Auto-scheduler active
          </div>
          <LiveClock />
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Today', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Ongoing', value: stats.ongoing, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Upcoming', value: stats.upcoming, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed, color: 'text-slate-400', bg: 'bg-slate-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={clsx('rounded-2xl px-5 py-4 border border-slate-100', bg)}>
            <p className={clsx('text-2xl font-bold', color)}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {['today', 'week'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize',
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t === 'today' ? "Today's Schedule" : 'Full Week'}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'today' ? (
        <div>
          {todayData?.data?.length === 0 ? (
            <div className="card text-center py-16">
              <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">
                {new Date().getDay() === 0
                  ? 'No classes on Sunday — enjoy your day off!'
                  : 'No classes scheduled for today.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Scheduler notice */}
              <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-xl px-4 py-2.5 text-xs text-primary-700">
                <Clock size={13} />
                The scheduler automatically starts &amp; stops sessions at the scheduled times.
                You can also trigger them manually below.
              </div>

              {todayData.data.map((slot) => (
                <TodaySlotCard
                  key={slot.id}
                  slot={slot}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <WeekGrid weekData={weekData} todayDow={todayDow} />
      )}
    </div>
  )
}
