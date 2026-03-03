import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  Play, StopCircle, UserCheck, UserX, ClipboardList,
  RefreshCw, Filter, Clock, BrainCircuit, Pencil,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { attendanceApi, subjectsApi, studentsApi } from '../api/api'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import PageLoader, { SkeletonRow } from '../components/PageLoader'
import clsx from 'clsx'

export default function Attendance() {
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [todayRecords, setTodayRecords] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [sessionSubject, setSessionSubject] = useState(null)
  const [startingSession, setStartingSession] = useState(false)
  const [stoppingSession, setStoppingSession] = useState(false)
  const [markOpen, setMarkOpen] = useState(false)
  const [marking, setMarking] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { status: 'present', marked_by: 'manual' },
  })
  const markStatus = watch('status')

  // Load dependencies
  useEffect(() => {
    const loadDeps = async () => {
      try {
        const [subRes, stuRes] = await Promise.all([
          subjectsApi.list(),
          studentsApi.list({ limit: 200 }),
        ])
        setSubjects(subRes.data.data ?? [])
        setStudents(stuRes.data.data ?? [])
      } catch {
        toast.error('Failed to load data')
      }
    }
    loadDeps()
  }, [])

  const fetchTodayRecords = useCallback(async () => {
    setLoadingRecords(true)
    try {
      const params = selectedSubject ? { subject_id: selectedSubject } : {}
      const res = await attendanceApi.today(params)
      setTodayRecords(res.data.data ?? [])
    } catch {
      toast.error("Failed to fetch today's records")
    } finally {
      setLoadingRecords(false)
    }
  }, [selectedSubject])

  useEffect(() => { fetchTodayRecords() }, [fetchTodayRecords])

  const startSession = async () => {
    if (!selectedSubject) { toast.error('Please select a subject first'); return }
    setStartingSession(true)
    try {
      const res = await attendanceApi.startSession({ subject_id: parseInt(selectedSubject) })
      const session = res.data.data
      setSessionId(session.id)
      setSessionActive(true)
      const subj = subjects.find((s) => s.id === parseInt(selectedSubject))
      setSessionSubject(subj)
      toast.success(`Session started for ${subj?.subject_name ?? 'subject'}`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to start session'
      toast.error(msg)
    } finally {
      setStartingSession(false)
    }
  }

  const stopSession = async () => {
    if (!sessionId) return
    setStoppingSession(true)
    try {
      await attendanceApi.stopSession({ session_id: sessionId })
      setSessionActive(false)
      setSessionId(null)
      setSessionSubject(null)
      toast.success('Attendance session ended')
      fetchTodayRecords()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to stop session'
      toast.error(msg)
    } finally {
      setStoppingSession(false)
    }
  }

  const onMarkAttendance = async (data) => {
    setMarking(true)
    try {
      const payload = {
        student_id: parseInt(data.student_id),
        subject_id: parseInt(data.subject_id),
        status: data.status,
        marked_by: data.marked_by,
      }
      if (data.confidence_score) payload.confidence_score = parseFloat(data.confidence_score)
      const res = await attendanceApi.mark(payload)
      toast.success(res.data.message || 'Attendance marked!')
      setMarkOpen(false)
      reset({ status: 'present', marked_by: 'manual' })
      fetchTodayRecords()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to mark attendance'
      toast.error(msg)
    } finally {
      setMarking(false)
    }
  }

  const presentCount = todayRecords.filter((r) => r.status === 'present').length
  const absentCount = todayRecords.filter((r) => r.status === 'absent').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d yyyy')} — Manage sessions & records</p>
        </div>
        <button onClick={() => { setMarkOpen(true); reset({ status: 'present', marked_by: 'manual' }) }} className="btn-primary">
          <Pencil size={15} /> Mark Attendance
        </button>
      </div>

      {/* Session management card */}
      <div className={clsx(
        'rounded-2xl border-2 p-5 transition-colors',
        sessionActive
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-slate-50 border-slate-200'
      )}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {sessionActive ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="font-semibold text-emerald-800">Session Active</h2>
                  <span className="text-xs bg-emerald-200 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                    LIVE
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-slate-400" />
                  <h2 className="font-semibold text-slate-600">No Active Session</h2>
                </>
              )}
            </div>
            {sessionActive ? (
              <p className="text-sm text-emerald-700">
                Recording attendance for <strong>{sessionSubject?.subject_name}</strong>
                {' — '}{format(new Date(), 'HH:mm')}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Select a subject and start a session to begin marking attendance.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {!sessionActive && (
              <div className="relative">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="input-field pr-8 min-w-[200px]"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject_name}</option>
                  ))}
                </select>
              </div>
            )}
            {sessionActive ? (
              <button
                onClick={stopSession}
                disabled={stoppingSession}
                className="btn-danger"
              >
                {stoppingSession ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <StopCircle size={16} />
                )}
                End Session
              </button>
            ) : (
              <button
                onClick={startSession}
                disabled={startingSession || !selectedSubject}
                className="btn-success"
              >
                {startingSession ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Start Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats mini cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today's Records", value: todayRecords.length, color: 'bg-slate-100 text-slate-700', icon: ClipboardList },
          { label: 'Present', value: presentCount, color: 'bg-emerald-100 text-emerald-700', icon: UserCheck },
          { label: 'Absent', value: absentCount, color: 'bg-rose-100 text-rose-700', icon: UserX },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-400 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's records table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Today's Attendance</h2>
            <p className="text-xs text-slate-400 mt-0.5">{todayRecords.length} records</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="input-field pl-8 py-2 text-xs min-w-[160px]"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject_name}</option>
                ))}
              </select>
            </div>
            <button onClick={fetchTodayRecords} className="btn-secondary py-2 px-3">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="table-header">Student</th>
                <th className="table-header">Roll No.</th>
                <th className="table-header">Subject</th>
                <th className="table-header">Time</th>
                <th className="table-header">Status</th>
                <th className="table-header">Confidence</th>
                <th className="table-header">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loadingRecords ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : todayRecords.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={ClipboardList}
                      title="No records yet today"
                      message="Start a session and mark attendance to see records here"
                    />
                  </td>
                </tr>
              ) : (
                todayRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="table-cell font-medium text-slate-800">{r.student?.name ?? '—'}</td>
                    <td className="table-cell">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {r.student?.roll_no ?? '—'}
                      </span>
                    </td>
                    <td className="table-cell text-slate-500 text-xs">{r.subject?.subject_name ?? '—'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Clock size={12} />
                        <span className="font-mono">{r.time ?? '—'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      {r.status === 'present' ? (
                        <span className="badge-present">
                          <CheckCircle2 size={11} /> Present
                        </span>
                      ) : (
                        <span className="badge-absent">
                          <XCircle size={11} /> Absent
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      {r.confidence_score != null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[60px]">
                            <div
                              className={clsx(
                                'h-1.5 rounded-full',
                                r.confidence_score >= 0.85 ? 'bg-emerald-500' : r.confidence_score >= 0.6 ? 'bg-amber-400' : 'bg-rose-400'
                              )}
                              style={{ width: `${r.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 font-mono">
                            {Math.round(r.confidence_score * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {r.marked_by === 'ai' ? (
                        <span className="badge-ai"><BrainCircuit size={11} /> AI</span>
                      ) : (
                        <span className="badge-manual"><Pencil size={11} /> Manual</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      <Modal
        open={markOpen}
        onClose={() => { setMarkOpen(false); reset({ status: 'present', marked_by: 'manual' }) }}
        title="Mark Attendance"
        footer={
          <>
            <button onClick={() => { setMarkOpen(false) }} className="btn-secondary">Cancel</button>
            <button form="mark-form" type="submit" disabled={marking} className="btn-primary">
              {marking ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Marking...
                </span>
              ) : (
                <><UserCheck size={15} /> Mark Attendance</>
              )}
            </button>
          </>
        }
      >
        <form id="mark-form" onSubmit={handleSubmit(onMarkAttendance)} className="space-y-4">
          <div>
            <label className="label">Student</label>
            <select
              {...register('student_id', { required: 'Student is required' })}
              className={clsx('input-field', errors.student_id && 'border-rose-400')}
            >
              <option value="">Select student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.roll_no})</option>
              ))}
            </select>
            {errors.student_id && <p className="text-xs text-rose-500 mt-1">{errors.student_id.message}</p>}
          </div>
          <div>
            <label className="label">Subject</label>
            <select
              {...register('subject_id', { required: 'Subject is required' })}
              className={clsx('input-field', errors.subject_id && 'border-rose-400')}
            >
              <option value="">Select subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subject_name}</option>
              ))}
            </select>
            {errors.subject_id && <p className="text-xs text-rose-500 mt-1">{errors.subject_id.message}</p>}
          </div>
          <div>
            <label className="label">Status</label>
            <div className="flex gap-3">
              {['present', 'absent'].map((s) => (
                <label
                  key={s}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all',
                    markStatus === s
                      ? s === 'present'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-rose-400 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  )}
                >
                  <input type="radio" value={s} {...register('status')} className="sr-only" />
                  {s === 'present' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span className="text-sm font-medium capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Marked By</label>
              <select {...register('marked_by')} className="input-field">
                <option value="manual">Manual</option>
                <option value="ai">AI</option>
              </select>
            </div>
            <div>
              <label className="label">Confidence Score</label>
              <input
                {...register('confidence_score', {
                  min: { value: 0, message: 'Min 0' },
                  max: { value: 1, message: 'Max 1' },
                })}
                type="number"
                step="0.01"
                className="input-field"
                placeholder="0.0 – 1.0 (optional)"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
