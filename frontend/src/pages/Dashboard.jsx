import { useState, useEffect, useCallback } from 'react'
import {
  Users, BookOpen, UserCheck, UserX, TrendingUp,
  Activity, Clock, Award,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import StatCard from '../components/StatCard'
import PageLoader from '../components/PageLoader'
import { attendanceApi, studentsApi, subjectsApi } from '../api/api'
import { useAuthStore } from '../store/authStore'

const PIE_COLORS = ['#10b981', '#f43f5e', '#94a3b8']
const LINE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const admin = useAuthStore((s) => s.admin)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total_students: 0, total_subjects: 0, present: 0, absent: 0 })
  const [todayData, setTodayData] = useState([])
  const [recentRecords, setRecentRecords] = useState([])

  const today = format(new Date(), 'EEEE, MMMM d')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [todayRes, studentsRes, subjectsRes] = await Promise.allSettled([
        attendanceApi.today(),
        studentsApi.list({ limit: 1 }),
        subjectsApi.list(),
      ])

      const todayRecords = todayRes.status === 'fulfilled' ? todayRes.value.data.data ?? [] : []
      const totalStudents = studentsRes.status === 'fulfilled' ? studentsRes.value.data.total ?? 0 : 0
      const totalSubjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data.total ?? 0 : 0

      const present = todayRecords.filter((r) => r.status === 'present').length
      const absent = todayRecords.filter((r) => r.status === 'absent').length

      setStats({ total_students: totalStudents, total_subjects: totalSubjects, present, absent })
      setRecentRecords(todayRecords.slice(0, 8))

      // Pie chart data
      setTodayData([
        { name: 'Present', value: present },
        { name: 'Absent', value: absent },
        { name: 'No Record', value: Math.max(0, totalStudents - present - absent) },
      ])
    } catch (err) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const attendanceRate = stats.present + stats.absent > 0
    ? Math.round((stats.present / (stats.present + stats.absent)) * 100)
    : 0

  // Simulated weekly trend (real data would come from /attendance/report)
  const weeklyTrend = [
    { day: 'Mon', present: 42, absent: 8 },
    { day: 'Tue', present: 38, absent: 12 },
    { day: 'Wed', present: 45, absent: 5 },
    { day: 'Thu', present: 40, absent: 10 },
    { day: 'Fri', present: 35, absent: 7 },
    { day: 'Today', present: stats.present, absent: stats.absent },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {greeting}, {admin?.name?.split(' ')[0] ?? 'Admin'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">{today} — Here's your attendance overview</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-full">
          <Activity size={13} />
          System Active
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats.total_students}
          icon={Users}
          color="indigo"
          loading={loading}
          subtitle="All enrolled students"
        />
        <StatCard
          title="Active Subjects"
          value={stats.total_subjects}
          icon={BookOpen}
          color="violet"
          loading={loading}
          subtitle="Across all semesters"
        />
        <StatCard
          title="Present Today"
          value={stats.present}
          icon={UserCheck}
          color="emerald"
          loading={loading}
          subtitle={`${attendanceRate}% attendance rate`}
        />
        <StatCard
          title="Absent Today"
          value={stats.absent}
          icon={UserX}
          color="rose"
          loading={loading}
          subtitle="Parents notified"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly trend chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Attendance Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">This week's present vs absent</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary-500" /> Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400" /> Absent
              </span>
            </div>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#gradPresent)" dot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="#f43f5e" strokeWidth={2.5}
                  fill="url(#gradAbsent)" dot={{ r: 4, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Today's Breakdown</h2>
          <p className="text-xs text-slate-400 mb-5">Attendance distribution</p>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={todayData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {todayData.map((entry, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Attendance rate badge */}
          <div className="flex items-center justify-center gap-2 mt-2 bg-primary-50 rounded-xl py-2.5">
            <Award size={16} className="text-primary-600" />
            <span className="text-sm font-bold text-primary-700">{attendanceRate}% Rate</span>
          </div>
        </div>
      </div>

      {/* Recent attendance */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Recent Attendance</h2>
            <p className="text-xs text-slate-400 mt-0.5">Today's latest records</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={13} />
            <span>Live</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <PageLoader />
          </div>
        ) : recentRecords.length === 0 ? (
          <div className="py-12 text-center">
            <UserCheck size={36} className="mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
            <p className="text-slate-500 text-sm font-medium">No attendance records today</p>
            <p className="text-slate-400 text-xs mt-1">Start an attendance session to begin</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="table-header">Student</th>
                  <th className="table-header">Roll No.</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header">Time</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Marked By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="table-cell font-medium text-slate-800">{r.student?.name ?? '—'}</td>
                    <td className="table-cell">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {r.student?.roll_no ?? '—'}
                      </span>
                    </td>
                    <td className="table-cell text-slate-500">{r.subject?.subject_name ?? '—'}</td>
                    <td className="table-cell text-slate-400 text-xs font-mono">{r.time ?? '—'}</td>
                    <td className="table-cell">
                      <span className={r.status === 'present' ? 'badge-present' : 'badge-absent'}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {r.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={r.marked_by === 'ai' ? 'badge-ai' : 'badge-manual'}>
                        {r.marked_by === 'ai' ? '🤖 AI' : '✋ Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
