// Students Module - Public API
// This module handles student management for personal trainers

// Store
export { useLinkedStudent } from './hooks/useLinkedStudent';
export * from './routes';
export { default as StudentAssessmentScreen } from './screens/StudentAssessmentScreen';
// Types (re-export from store for now)
export type { PhysicalAssessment, Student } from './store/studentStore';
export { useStudentStore } from './store/studentStore';
