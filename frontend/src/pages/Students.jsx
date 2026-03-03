import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import {
  Users, Plus, Search, Filter, ChevronLeft, ChevronRight,
  User, Mail, Hash, Building2, Check, X as XIcon,
  Eye, RefreshCw, Camera, ScanFace, Upload, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { studentsApi, faceApi } from '../api/api'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { SkeletonRow } from '../components/PageLoader'
import clsx from 'clsx'

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Chemical', 'Biotechnology', 'Physics', 'Mathematics']

export default function Students() {
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [viewStudent, setViewStudent] = useState(null)
  const [adding, setAdding] = useState(false)
  const [faceStudent, setFaceStudent] = useState(null)  // student to register face for
  const [faceMode, setFaceMode] = useState('upload')    // 'upload' | 'webcam'
  const [registering, setRegistering] = useState(false)
  const [webcamActive, setWebcamActive] = useState(false)
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const fileRef   = useRef(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (search) params.search = search
      if (department) params.department = department
      const res = await studentsApi.list(params)
      setStudents(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
      setPages(res.data.pages ?? 1)
    } catch {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [page, search, department])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, department])

  const onAdd = async (data) => {
    setAdding(true)
    try {
      await studentsApi.add(data)
      toast.success('Student added successfully!')
      setAddOpen(false)
      reset()
      fetchStudents()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to add student'
      toast.error(msg)
    } finally {
      setAdding(false)
    }
  }

  const handleViewStudent = async (id) => {
    try {
      const res = await studentsApi.get(id)
      setViewStudent(res.data.data)
    } catch {
      toast.error('Failed to load student details')
    }
  }

  // ── Face registration helpers ──────────────────────────────────────────────
  const openFaceModal = (student) => {
    setFaceStudent(student)
    setFaceMode('upload')
    setWebcamActive(false)
  }

  const closeFaceModal = () => {
    stopWebcam()
    setFaceStudent(null)
    setWebcamActive(false)
  }

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setWebcamActive(true)
    } catch {
      toast.error('Camera access denied')
    }
  }

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setWebcamActive(false)
  }

  const captureAndRegister = async () => {
    if (!videoRef.current) return
    setRegistering(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width  = videoRef.current.videoWidth  || 640
      canvas.height = videoRef.current.videoHeight || 480
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
      const fd = new FormData()
      fd.append('image', blob, 'capture.jpg')
      await faceApi.register(faceStudent.id, fd)
      toast.success(`Face registered for ${faceStudent.name}!`)
      closeFaceModal()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  const uploadAndRegister = async (file) => {
    if (!file) return
    setRegistering(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      await faceApi.register(faceStudent.id, fd)
      toast.success(`Face registered for ${faceStudent.name}!`)
      closeFaceModal()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{total} enrolled students</p>
        </div>
        <button onClick={() => { setAddOpen(true); reset() }} className="btn-primary">
          <Plus size={16} />
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative sm:w-52">
          <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="input-field pl-10 appearance-none"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button onClick={fetchStudents} className="btn-secondary">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="table-header">#</th>
                <th className="table-header">Student</th>
                <th className="table-header">Roll No.</th>
                <th className="table-header">Department</th>
                <th className="table-header">Email</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                : students.length === 0
                ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={Users}
                        title="No students found"
                        message={search || department ? 'Try adjusting your search filters' : 'Add your first student to get started'}
                        action={
                          !search && !department && (
                            <button onClick={() => setAddOpen(true)} className="btn-primary">
                              <Plus size={15} /> Add Student
                            </button>
                          )
                        }
                      />
                    </td>
                  </tr>
                )
                : students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="table-cell text-slate-400 text-xs font-mono">
                      {(page - 1) * 15 + idx + 1}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {s.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                        {s.roll_no}
                      </span>
                    </td>
                    <td className="table-cell text-slate-500">{s.department}</td>
                    <td className="table-cell text-slate-400 text-xs">{s.email}</td>
                    <td className="table-cell">
                      {s.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <Check size={11} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          <XIcon size={11} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewStudent(s.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openFaceModal(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          title="Register face"
                        >
                          <ScanFace size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total} students
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                    page === n
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset() }}
        title="Add New Student"
        footer={
          <>
            <button onClick={() => { setAddOpen(false); reset() }} className="btn-secondary">Cancel</button>
            <button
              form="add-student-form"
              type="submit"
              disabled={adding}
              className="btn-primary"
            >
              {adding ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </span>
              ) : (
                <><Plus size={15} /> Add Student</>
              )}
            </button>
          </>
        }
      >
        <form id="add-student-form" onSubmit={handleSubmit(onAdd)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className={clsx('input-field', errors.name && 'border-rose-400')}
                placeholder="John Doe"
              />
              {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Roll Number</label>
              <input
                {...register('roll_no', { required: 'Roll number is required' })}
                className={clsx('input-field', errors.roll_no && 'border-rose-400')}
                placeholder="CSE001"
              />
              {errors.roll_no && <p className="text-xs text-rose-500 mt-1">{errors.roll_no.message}</p>}
            </div>
            <div>
              <label className="label">Department</label>
              <select
                {...register('department', { required: 'Department is required' })}
                className={clsx('input-field', errors.department && 'border-rose-400')}
              >
                <option value="">Select dept.</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="text-xs text-rose-500 mt-1">{errors.department.message}</p>}
            </div>
            <div>
              <label className="label">Student Email</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Valid email required' },
                })}
                type="email"
                className={clsx('input-field', errors.email && 'border-rose-400')}
                placeholder="student@email.com"
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Parent Email</label>
              <input
                {...register('parent_email', {
                  required: 'Parent email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Valid email required' },
                })}
                type="email"
                className={clsx('input-field', errors.parent_email && 'border-rose-400')}
                placeholder="parent@email.com"
              />
              {errors.parent_email && <p className="text-xs text-rose-500 mt-1">{errors.parent_email.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Password</label>
              <input
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                type="password"
                className={clsx('input-field', errors.password && 'border-rose-400')}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
            </div>
          </div>
        </form>
      </Modal>

      {/* Register Face Modal */}
      <Modal
        open={!!faceStudent}
        onClose={closeFaceModal}
        title={`Register Face — ${faceStudent?.name ?? ''}`}
        footer={
          <>
            <button onClick={closeFaceModal} className="btn-secondary">Cancel</button>
            {faceMode === 'webcam' && webcamActive && (
              <button onClick={captureAndRegister} disabled={registering} className="btn-primary bg-violet-600 hover:bg-violet-700 focus:ring-violet-400">
                {registering
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registering...</span>
                  : <><Camera size={15} /> Capture & Register</>}
              </button>
            )}
          </>
        }
      >
        {faceStudent && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Provide a clear, front-facing photo for <strong>{faceStudent.name}</strong>.
              Good lighting and a neutral expression gives the best accuracy.
            </p>

            {/* Mode toggle */}
            <div className="flex gap-2">
              {[
                { key: 'upload', label: 'Upload Photo', icon: Upload },
                { key: 'webcam', label: 'Use Webcam',  icon: Camera },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setFaceMode(key); if (key !== 'webcam') stopWebcam() }}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                    faceMode === key
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  )}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {/* Upload mode */}
            {faceMode === 'upload' && (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/50 transition-all"
              >
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 font-medium">Click to upload photo</p>
                <p className="text-xs text-slate-400 mt-1">JPEG, PNG — max 10 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadAndRegister(file)
                    e.target.value = ''
                  }}
                />
                {registering && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-violet-600">
                    <span className="w-4 h-4 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    <span className="text-sm font-medium">Processing...</span>
                  </div>
                )}
              </div>
            )}

            {/* Webcam mode */}
            {faceMode === 'webcam' && (
              <div className="space-y-3">
                <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
                  <video ref={videoRef} autoPlay muted playsInline
                    className={clsx('w-full h-full object-cover', !webcamActive && 'hidden')} />
                  {!webcamActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera size={32} className="text-slate-500" />
                    </div>
                  )}
                  {/* Face guide overlay */}
                  {webcamActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-44 h-52 border-2 border-violet-400/60 rounded-full" />
                    </div>
                  )}
                </div>
                {!webcamActive ? (
                  <button onClick={startWebcam} className="btn-primary w-full justify-center bg-violet-600 hover:bg-violet-700 focus:ring-violet-400">
                    <Camera size={16} /> Start Camera
                  </button>
                ) : (
                  <button onClick={stopWebcam} className="btn-secondary w-full justify-center">
                    Stop Camera
                  </button>
                )}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <strong>Tips:</strong> Ensure face is well-lit, no glasses if possible, look directly at the camera.
            </div>
          </div>
        )}
      </Modal>

      {/* View Student Modal */}
      <Modal
        open={!!viewStudent}
        onClose={() => setViewStudent(null)}
        title="Student Details"
        footer={
          <button onClick={() => setViewStudent(null)} className="btn-secondary">Close</button>
        }
      >
        {viewStudent && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                {viewStudent.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{viewStudent.name}</h3>
                <p className="text-sm text-slate-500">{viewStudent.department}</p>
                <span className={viewStudent.is_active ? 'badge-present mt-1' : 'badge-absent mt-1'}>
                  {viewStudent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Roll Number', value: viewStudent.roll_no, icon: Hash },
                { label: 'Department', value: viewStudent.department, icon: Building2 },
                { label: 'Student Email', value: viewStudent.email, icon: Mail },
                { label: 'Parent Email', value: viewStudent.parent_email, icon: Mail },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} className="text-slate-400" />
                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
