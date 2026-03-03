import { useState, useRef, useEffect, useCallback } from 'react'
import { useWebcam, captureFrame } from '../hooks/useWebcam'
import {
  Camera, CameraOff, Scan, CheckCircle2, XCircle,
  BrainCircuit, RefreshCw, Play, StopCircle, Users,
  Zap, ShieldCheck, AlertCircle, UserCheck, Trash2,
  CalendarClock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { faceApi, attendanceApi, subjectsApi } from '../api/api'
import EmptyState from '../components/EmptyState'
import { SkeletonRow } from '../components/PageLoader'

// ── Main component ────────────────────────────────────────────────────────────
export default function FaceAttendance() {
  const { videoRef, active, error, start, stop } = useWebcam()

  const [subjects,        setSubjects]        = useState([])
  const [subjectId,       setSubjectId]       = useState('')
  const [currentSession,  setCurrentSession]  = useState(null)  // auto-detected session info
  const [scanning,        setScanning]        = useState(false)
  const [autoScan,        setAutoScan]        = useState(false)
  const autoRef = useRef(null)

  const [result,     setResult]     = useState(null)  // last recognition result
  const [marking,    setMarking]    = useState(false)
  const [markedLog,  setMarkedLog]  = useState([])    // records marked this session
  const [registered, setRegistered] = useState([])
  const [regLoading, setRegLoading] = useState(false)
  const [activeTab,  setActiveTab]  = useState('scan')

  // Load subjects + registered faces + auto-detect current session
  useEffect(() => {
    subjectsApi.list().then((r) => setSubjects(r.data.data ?? []))
    loadRegistered()
    detectCurrentSession()
  }, [])

  const detectCurrentSession = async () => {
    try {
      const res = await faceApi.currentSession()
      const sess = res.data.session
      if (sess) {
        setCurrentSession(sess)
        setSubjectId(String(sess.subject_id))
        toast.success(
          `Auto-selected: ${sess.subject_name}`,
          { icon: '📅', duration: 3000 }
        )
      }
    } catch {
      // silently ignore — user can select manually
    }
  }

  const loadRegistered = async () => {
    setRegLoading(true)
    try {
      const r = await faceApi.listRegistered()
      setRegistered(r.data.data ?? [])
    } catch {
      toast.error('Failed to load registered faces')
    } finally {
      setRegLoading(false)
    }
  }

  // ── Scan a single frame ───────────────────────────────────────────────────
  const scanOnce = useCallback(async () => {
    if (!videoRef.current || scanning) return
    setScanning(true)
    try {
      const blob = await captureFrame(videoRef.current)
      const fd   = new FormData()
      fd.append('image', blob, 'frame.jpg')

      const res = await faceApi.recognize(fd)
      setResult(res.data)

      if (!res.data.success) {
        // Only show toast in manual mode
        if (!autoRef.current) toast.error('No face matched')
      }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Recognition failed'
      toast.error(msg)
      setResult(null)
    } finally {
      setScanning(false)
    }
  }, [scanning, videoRef])

  // ── Auto-scan (every 2.5 s) ───────────────────────────────────────────────
  const toggleAuto = useCallback(() => {
    if (autoRef.current) {
      clearInterval(autoRef.current)
      autoRef.current = null
      setAutoScan(false)
    } else {
      autoRef.current = setInterval(scanOnce, 2500)
      setAutoScan(true)
    }
  }, [scanOnce])

  // Clean up interval on unmount
  useEffect(() => () => { if (autoRef.current) clearInterval(autoRef.current) }, [])

  // ── Mark attendance for recognized student ────────────────────────────────
  const markAttendance = async () => {
    if (!result?.student || !subjectId) {
      toast.error('Select a subject first')
      return
    }
    setMarking(true)
    try {
      const payload = {
        student_id:       result.student.id,
        subject_id:       parseInt(subjectId),
        status:           'present',
        marked_by:        'ai',
        confidence_score: result.confidence / 100,
      }
      const res = await attendanceApi.mark(payload)
      toast.success(res.data.message || 'Attendance marked!')
      setMarkedLog((prev) => [
        { ...result.student, confidence: result.confidence, time: new Date().toLocaleTimeString() },
        ...prev,
      ])
      setResult(null)
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.message || 'Failed to mark'
      toast.error(msg)
    } finally {
      setMarking(false)
    }
  }

  const deleteFace = async (studentId, name) => {
    if (!window.confirm(`Remove face data for ${name}?`)) return
    try {
      await faceApi.deleteFace(studentId)
      toast.success('Face data removed')
      loadRegistered()
    } catch {
      toast.error('Failed to delete face data')
    }
  }

  const subjectName = subjects.find((s) => s.id === parseInt(subjectId))?.subject_name

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BrainCircuit size={26} className="text-primary-600" />
            AI Face Attendance
          </h1>
          <p className="page-subtitle">Real-time face recognition — automatically mark attendance</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-violet-50 border border-violet-200 rounded-full px-3 py-1.5">
          <Zap size={13} className="text-violet-600" />
          <span className="font-semibold text-violet-700">{registered.length} faces registered</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'scan',       label: 'Live Scanner',      icon: Scan },
          { key: 'registered', label: 'Registered Faces',  icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── SCAN TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Camera feed — 3 cols */}
          <div className="lg:col-span-3 card overflow-hidden">
            {/* Subject selector bar */}
            <div className="border-b border-slate-100">
              {/* Auto-detect banner */}
              {currentSession && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-700">
                  <CalendarClock size={13} className="flex-shrink-0" />
                  <span>
                    <strong>Auto-selected</strong> from{' '}
                    {currentSession.source === 'active_session' ? 'active session' : 'timetable'}
                    {' '}— {currentSession.subject_name} · {currentSession.faculty_name}
                  </span>
                  <button
                    onClick={() => { setCurrentSession(null); setSubjectId('') }}
                    className="ml-auto text-emerald-600 hover:text-emerald-800 underline whitespace-nowrap"
                  >
                    Change
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
                <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Subject:</label>
                <select
                  value={subjectId}
                  onChange={(e) => { setSubjectId(e.target.value); setCurrentSession(null) }}
                  className="input-field py-1.5 text-sm flex-1"
                >
                  <option value="">— Select subject —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Video */}
            <div className="relative bg-slate-900 aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={clsx('w-full h-full object-cover', !active && 'hidden')}
              />

              {!active && (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  {error ? (
                    <>
                      <AlertCircle size={40} className="text-rose-400" />
                      <p className="text-sm text-rose-400 text-center px-8">{error}</p>
                    </>
                  ) : (
                    <>
                      <CameraOff size={40} />
                      <p className="text-sm">Click "Start Camera" to begin</p>
                    </>
                  )}
                </div>
              )}

              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                    <p className="text-white text-sm font-medium">Scanning...</p>
                  </div>
                </div>
              )}

              {/* Result overlay */}
              {result?.success && result.student && (
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-emerald-500/90 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle2 size={22} className="text-white flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{result.student.name}</p>
                      <p className="text-emerald-100 text-xs">{result.student.roll_no} · {result.confidence}% match</p>
                    </div>
                    {/* Confidence bar */}
                    <div className="w-12 text-right">
                      <p className="text-white text-xs font-bold">{result.confidence}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto scan indicator */}
              {autoScan && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-violet-600/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  AUTO SCAN
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 p-4 flex-wrap">
              {!active ? (
                <button onClick={start} className="btn-primary">
                  <Camera size={16} /> Start Camera
                </button>
              ) : (
                <button onClick={stop} className="btn-secondary">
                  <CameraOff size={16} /> Stop Camera
                </button>
              )}

              <button
                onClick={scanOnce}
                disabled={!active || scanning}
                className="btn-primary bg-violet-600 hover:bg-violet-700 focus:ring-violet-500"
              >
                {scanning
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Scan size={16} />}
                Scan Face
              </button>

              <button
                onClick={toggleAuto}
                disabled={!active}
                className={clsx(autoScan ? 'btn-danger' : 'btn-secondary')}
              >
                {autoScan ? <StopCircle size={16} /> : <Zap size={16} />}
                {autoScan ? 'Stop Auto' : 'Auto Scan'}
              </button>
            </div>
          </div>

          {/* Right panel — 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Recognition result */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary-600" /> Recognition Result
              </h2>

              {!result ? (
                <div className="text-center py-8">
                  <Scan size={36} className="mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
                  <p className="text-slate-400 text-sm">Scan a face to see results</p>
                </div>
              ) : result.success && result.student ? (
                <div className="space-y-4">
                  {/* Student card */}
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {result.student.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{result.student.name}</p>
                      <p className="text-sm text-slate-500">{result.student.roll_no}</p>
                      <p className="text-xs text-slate-400">{result.student.department}</p>
                    </div>
                  </div>

                  {/* Confidence meter */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Confidence</span>
                      <span className={clsx(
                        'font-bold',
                        result.confidence >= 85 ? 'text-emerald-600' : result.confidence >= 70 ? 'text-amber-600' : 'text-rose-600'
                      )}>
                        {result.confidence}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-2.5 rounded-full transition-all duration-500',
                          result.confidence >= 85 ? 'bg-emerald-500' : result.confidence >= 70 ? 'bg-amber-400' : 'bg-rose-400'
                        )}
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Mark button */}
                  <button
                    onClick={markAttendance}
                    disabled={marking || !subjectId}
                    className="btn-success w-full justify-center py-3"
                    title={!subjectId ? 'Select a subject first' : ''}
                  >
                    {marking ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Marking...
                      </span>
                    ) : (
                      <><UserCheck size={16} /> Mark Present</>
                    )}
                  </button>

                  {!subjectId && (
                    <p className="text-xs text-amber-600 text-center">⚠ Select a subject above first</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <XCircle size={36} className="mx-auto text-rose-400 mb-2" strokeWidth={1.5} />
                  <p className="text-slate-600 text-sm font-medium">No match found</p>
                  <p className="text-slate-400 text-xs mt-1">Face not recognized or not registered</p>
                </div>
              )}
            </div>

            {/* Session log */}
            <div className="card flex-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  Marked This Session
                </h2>
                <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                  {markedLog.length}
                </span>
              </div>
              <div className="overflow-y-auto max-h-56">
                {markedLog.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-8">No attendance marked yet</p>
                ) : (
                  markedLog.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                        {r.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.roll_no} · {r.confidence}% · {r.time}</p>
                      </div>
                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTERED FACES TAB ─────────────────────────────────────────────── */}
      {activeTab === 'registered' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Registered Faces</h2>
              <p className="text-xs text-slate-400 mt-0.5">{registered.length} students with face data</p>
            </div>
            <button onClick={loadRegistered} className="btn-secondary py-2 px-3">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="table-header">#</th>
                  <th className="table-header">Student</th>
                  <th className="table-header">Roll No.</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Registered At</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {regLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                ) : registered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={Users}
                        title="No faces registered"
                        message="Go to Students page and click Register Face on any student"
                      />
                    </td>
                  </tr>
                ) : (
                  registered.map((r, idx) => (
                    <tr key={r.student_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="table-cell text-slate-400 text-xs">{idx + 1}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-primary-500 flex items-center justify-center text-white text-xs font-bold">
                            {r.name?.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{r.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {r.roll_no}
                        </span>
                      </td>
                      <td className="table-cell text-slate-500 text-sm">{r.department}</td>
                      <td className="table-cell text-slate-400 text-xs">
                        {r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => deleteFace(r.student_id, r.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove face data"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
