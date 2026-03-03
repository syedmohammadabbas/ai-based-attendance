import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  BookOpen, Plus, Filter, RefreshCw, User, Layers,
  BookMarked, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { subjectsApi } from '../api/api'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import clsx from 'clsx'

const SEMESTERS = [
  'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
  'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8',
]

const SEMESTER_COLORS = [
  'from-blue-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-violet-500',
]

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [total, setTotal] = useState(0)
  const [semester, setSemester] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const fetchSubjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = semester ? { semester } : {}
      const res = await subjectsApi.list(params)
      setSubjects(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
    } catch {
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [semester])

  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  const onAdd = async (data) => {
    setAdding(true)
    try {
      await subjectsApi.add(data)
      toast.success('Subject added successfully!')
      setAddOpen(false)
      reset()
      fetchSubjects()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to add subject'
      toast.error(msg)
    } finally {
      setAdding(false)
    }
  }

  // Group subjects by semester
  const grouped = subjects.reduce((acc, s) => {
    if (!acc[s.semester]) acc[s.semester] = []
    acc[s.semester].push(s)
    return acc
  }, {})

  const semesterKeys = Object.keys(grouped).sort()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">{total} subjects across all semesters</p>
        </div>
        <button onClick={() => { setAddOpen(true); reset() }} className="btn-primary">
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {/* Filter */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative sm:w-56">
          <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="input-field pl-10 appearance-none"
          >
            <option value="">All Semesters</option>
            {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={fetchSubjects} className="btn-secondary">
          <RefreshCw size={15} /> Refresh
        </button>
        <div className="flex-1" />
        {/* Semester stats */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Layers size={14} /> {semesterKeys.length} semesters active
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-8">
          <PageLoader />
        </div>
      ) : subjects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BookOpen}
            title="No subjects found"
            message={semester ? `No subjects in ${semester} yet` : 'Add your first subject to get started'}
            action={
              <button onClick={() => setAddOpen(true)} className="btn-primary">
                <Plus size={15} /> Add Subject
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {semesterKeys.map((sem, semIdx) => (
            <div key={sem}>
              <div className="flex items-center gap-3 mb-3">
                <div className={clsx(
                  'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                  SEMESTER_COLORS[semIdx % SEMESTER_COLORS.length]
                )}>
                  {semIdx + 1}
                </div>
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{sem}</h2>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400 font-medium">{grouped[sem].length} subjects</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {grouped[sem].map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    gradientClass={SEMESTER_COLORS[semIdx % SEMESTER_COLORS.length]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Subject Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset() }}
        title="Add New Subject"
        footer={
          <>
            <button onClick={() => { setAddOpen(false); reset() }} className="btn-secondary">Cancel</button>
            <button
              form="add-subject-form"
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
                <><Plus size={15} /> Add Subject</>
              )}
            </button>
          </>
        }
      >
        <form id="add-subject-form" onSubmit={handleSubmit(onAdd)} className="space-y-4">
          <div>
            <label className="label">Subject Name</label>
            <input
              {...register('subject_name', { required: 'Subject name is required' })}
              className={clsx('input-field', errors.subject_name && 'border-rose-400')}
              placeholder="e.g. Data Structures and Algorithms"
            />
            {errors.subject_name && <p className="text-xs text-rose-500 mt-1">{errors.subject_name.message}</p>}
          </div>
          <div>
            <label className="label">Faculty Name</label>
            <input
              {...register('faculty_name', { required: 'Faculty name is required' })}
              className={clsx('input-field', errors.faculty_name && 'border-rose-400')}
              placeholder="e.g. Dr. John Smith"
            />
            {errors.faculty_name && <p className="text-xs text-rose-500 mt-1">{errors.faculty_name.message}</p>}
          </div>
          <div>
            <label className="label">Semester</label>
            <select
              {...register('semester', { required: 'Semester is required' })}
              className={clsx('input-field', errors.semester && 'border-rose-400')}
            >
              <option value="">Select semester</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.semester && <p className="text-xs text-rose-500 mt-1">{errors.semester.message}</p>}
          </div>
        </form>
      </Modal>
    </div>
  )
}

function SubjectCard({ subject, gradientClass }) {
  return (
    <div className="card hover:shadow-card-hover transition-all duration-200 overflow-hidden group">
      {/* Color bar */}
      <div className={clsx('h-1.5 bg-gradient-to-r w-full', gradientClass)} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
            gradientClass
          )}>
            <BookMarked size={18} className="text-white" />
          </div>
          {subject.is_active && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> Active
            </span>
          )}
        </div>
        <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-2 line-clamp-2">
          {subject.subject_name}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <User size={12} />
          <span className="truncate">{subject.faculty_name}</span>
        </div>
      </div>
    </div>
  )
}
