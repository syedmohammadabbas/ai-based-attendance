import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3, Download, Filter, RefreshCw, Search,
  Calendar, TrendingUp, Award, AlertTriangle,
  ChevronDown, CheckCircle2, XCircle, FileSpreadsheet,
  Users, BookOpen,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import toast from 'react-hot-toast'
import { attendanceApi, subjectsApi, studentsApi } from '../api/api'
import EmptyState from '../components/EmptyState'
import PageLoader, { SkeletonRow } from '../components/PageLoader'
import clsx from 'clsx'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState([])
  const [studentSummary, setStudentSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [subjectId, setSubjectId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')

  const [activeTab, setActiveTab] = useState('records') // 'records' | 'student'

  useEffect(() => {
    const load = async () => {
      try {
        const [subs, studs] = await Promise.all([
          subjectsApi.list(),
          studentsApi.list({ limit: 200 }),
        ])
        setSubjects(subs.data.data ?? [])
        setStudents(studs.data.data ?? [])
      } catch {
        toast.error('Failed to load filter options')
      }
    }
    load()
  }, [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (subjectId) params.subject_id = subjectId
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      if (statusFilter) params.status = statusFilter
      const res = await attendanceApi.report(params)
      setRecords(res.data.data ?? [])
    } catch {
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [subjectId, startDate, endDate, statusFilter])

  useEffect(() => {
    if (activeTab === 'records') fetchRecords()
  }, [activeTab, fetchRecords])

  const fetchStudentSummary = async () => {
    if (!selectedStudent) { toast.error('Please select a student'); return }
    setSummaryLoading(true)
    try {
      const res = await attendanceApi.studentSummary(selectedStudent)
      setStudentSummary(res.data)
    } catch {
      toast.error('Failed to load student summary')
    } finally {
      setSummaryLoading(false)
    }
  }

  const exportExcel = async () => {
    if (!subjectId) { toast.error('Select a subject to export'); return }
    setExporting(true)
    try {
      const subj = subjects.find((s) => s.id === parseInt(subjectId))
      const res = await attendanceApi.exportExcel(subjectId)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${subj?.subject_name ?? 'report'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel report downloaded!')
    } catch {
      toast.error('Failed to export Excel')
    } finally {
      setExporting(false)
    }
  }

  // Compute chart data from records
  const chartData = (() => {
    const map = {}
    records.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, present: 0, absent: 0 }
      if (r.status === 'present') map[r.date].present += 1
      else map[r.date].absent += 1
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
  })()

  const presentTotal = records.filter((r) => r.status === 'present').length
  const absentTotal = records.filter((r) => r.status === 'absent').length
  const attendanceRate = records.length > 0 ? Math.round((presentTotal / records.length) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Attendance insights and data exports</p>
        </div>
        <button
          onClick={exportExcel}
          disabled={exporting || !subjectId}
          className="btn-secondary"
        >
          {exporting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              Exporting...
            </span>
          ) : (
            <><FileSpreadsheet size={15} /> Export Excel</>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'records', label: 'Attendance Records', icon: BarChart3 },
          { key: 'student', label: 'Student Summary', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── RECORDS TAB ─────────────────────────────────────── */}
      {activeTab === 'records' && (
        <>
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="label text-xs">Subject</label>
                <div className="relative">
                  <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="input-field pl-8 text-sm"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label text-xs">From Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field pl-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="label text-xs">To Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field pl-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="label text-xs">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">All</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <button onClick={fetchRecords} className="btn-primary">
                <Filter size={15} /> Apply
              </button>
              <button
                onClick={() => {
                  setSubjectId(''); setStartDate(''); setEndDate(''); setStatusFilter('')
                }}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Records', value: records.length, color: 'text-slate-800', bg: 'bg-slate-50' },
              { label: 'Present', value: presentTotal, color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Absent', value: absentTotal, color: 'text-rose-700', bg: 'bg-rose-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={clsx('card p-4 text-center', bg)}>
                <p className={clsx('text-3xl font-bold', color)}>{value}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div className="card p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-1">Daily Attendance Trend</h2>
              <p className="text-xs text-slate-400 mb-5">Last {chartData.length} days</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Records table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                Records <span className="text-slate-400 font-normal text-sm">({records.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Rate: <strong className={attendanceRate >= 75 ? 'text-emerald-600' : 'text-rose-600'}>{attendanceRate}%</strong>
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="table-header">Student</th>
                    <th className="table-header">Roll No.</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Subject</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Time</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon={BarChart3}
                          title="No records found"
                          message="Adjust filters or mark some attendance first"
                        />
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="table-cell font-medium text-slate-800">{r.student?.name ?? '—'}</td>
                        <td className="table-cell">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {r.student?.roll_no ?? '—'}
                          </span>
                        </td>
                        <td className="table-cell text-slate-400 text-xs">{r.student?.department ?? '—'}</td>
                        <td className="table-cell text-slate-500 text-xs">{r.subject?.subject_name ?? '—'}</td>
                        <td className="table-cell text-xs font-mono text-slate-500">{r.date}</td>
                        <td className="table-cell text-xs font-mono text-slate-400">{r.time ?? '—'}</td>
                        <td className="table-cell">
                          {r.status === 'present' ? (
                            <span className="badge-present"><CheckCircle2 size={11} /> Present</span>
                          ) : (
                            <span className="badge-absent"><XCircle size={11} /> Absent</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── STUDENT SUMMARY TAB ─────────────────────────────── */}
      {activeTab === 'student' && (
        <div className="space-y-5">
          {/* Student selector */}
          <div className="card p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="input-field pl-10"
              >
                <option value="">Select a student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.roll_no}</option>
                ))}
              </select>
            </div>
            <button onClick={fetchStudentSummary} disabled={summaryLoading || !selectedStudent} className="btn-primary">
              {summaryLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                <><TrendingUp size={15} /> View Summary</>
              )}
            </button>
          </div>

          {summaryLoading ? (
            <div className="card p-8"><PageLoader /></div>
          ) : studentSummary ? (
            <>
              {/* Student info card */}
              <div className="card p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xl font-bold">
                    {studentSummary.student?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{studentSummary.student?.name}</h3>
                    <p className="text-sm text-slate-500">
                      {studentSummary.student?.roll_no} — {studentSummary.student?.department}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{studentSummary.total_records} total records</p>
                  </div>
                </div>

                {/* Subject-wise summary */}
                {studentSummary.summary?.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No attendance data"
                    message="This student has no attendance records yet"
                  />
                ) : (
                  <div className="space-y-3">
                    {studentSummary.summary?.map((s) => {
                      const pct = parseFloat(s.percentage)
                      const isLow = pct < 75
                      return (
                        <div key={s.subject_id} className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{s.subject_name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {s.present} present · {s.absent} absent · {s.total} total classes
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isLow && (
                                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={11} /> Low
                                </span>
                              )}
                              <span className={clsx(
                                'text-lg font-bold',
                                isLow ? 'text-rose-600' : 'text-emerald-600'
                              )}>
                                {s.percentage}
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={clsx(
                                'h-2 rounded-full transition-all duration-500',
                                isLow ? 'bg-rose-400' : pct >= 90 ? 'bg-emerald-500' : 'bg-amber-400'
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-xs text-rose-400">75% required</span>
                            <span className="text-xs text-slate-400">{pct}% achieved</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Bar chart for student */}
              {studentSummary.summary?.length > 0 && (
                <div className="card p-5">
                  <h2 className="text-base font-semibold text-slate-800 mb-4">Attendance by Subject</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={studentSummary.summary.map((s) => ({
                        name: s.subject_name.length > 12 ? s.subject_name.slice(0, 12) + '…' : s.subject_name,
                        present: s.present,
                        absent: s.absent,
                        pct: parseFloat(s.percentage),
                      }))}
                      margin={{ top: 4, right: 4, left: -20, bottom: 40 }}
                      barSize={18}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-20} textAnchor="end" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="present" name="Present" radius={[4, 4, 0, 0]}>
                        {studentSummary.summary.map((s, i) => (
                          <Cell key={i} fill={parseFloat(s.percentage) >= 75 ? '#10b981' : '#f59e0b'} />
                        ))}
                      </Bar>
                      <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <EmptyState
                icon={TrendingUp}
                title="Select a student"
                message="Choose a student above and click 'View Summary' to see their attendance analytics"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
