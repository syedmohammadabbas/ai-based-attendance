/**
 * Central API barrel — re-exports all domain modules so existing
 * imports like `import { faceApi } from '../api/api'` keep working.
 * New code can also import directly from the domain files.
 */
export { authApi }       from './auth'
export { studentsApi }   from './students'
export { subjectsApi }   from './subjects'
export { attendanceApi } from './attendance'
export { faceApi }       from './face'

// Default export is the raw axios client (used in Timetable.jsx as `axios`)
export { default } from './client'
