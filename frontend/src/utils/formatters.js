/**
 * Shared formatting utilities used across pages.
 */

/** "2024-03-15" → "15 Mar 2024" */
export const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'

/** "09:00" → "9:00 AM"  |  "14:30" → "2:30 PM" */
export const formatTime = (timeStr) => {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

/** 0.94 → "94%" */
export const formatConfidence = (score) =>
  score != null ? `${Math.round(score * 100)}%` : '—'

/** (42, 50) → 84 */
export const calcPercent = (val, total) =>
  total ? Math.round((val / total) * 100) : 0

/** ISO datetime → "Mar 15, 2024 09:42 AM" */
export const formatDateTime = (isoStr) => {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
