export const ROUTES = {
  // Tabs
  TABS: {
    ROOT: '/(tabs)',
    WORKOUTS: '/(tabs)/workouts',
    NUTRITION: '/(tabs)/nutrition',
    STUDENTS: '/(tabs)/students',
    PROFILE: '/(tabs)/profile',
    INDEX: '/(tabs)/index',
    RANKING: '/(tabs)/ranking',
    CARDIO: '/(tabs)/cardio',
  },

  // Assessment Flows
  ASSESSMENT: {
    BODY_SCAN: '/assessment/body-scan',
  },

  // Onboarding
  ONBOARDING: {
    ROLE_SELECTION: '/onboarding/role-selection',
    HEALTH_CONNECT: '/onboarding/health-connect',
  },

  // Student Flows
  STUDENTS: {
    ROOT: '/(tabs)/students',
    CREATE: '/(tabs)/students/create',
    DETAILS: (id: string) => `/(tabs)/students/${id}`,
    WORKOUTS: (id: string) => `/(tabs)/students/${id}/workouts`,
    NUTRITION: (id: string) => `/(tabs)/students/${id}/nutrition`,
    HISTORY: (id: string) => `/(tabs)/students/${id}/history`,
    ASSESSMENT: (id: string) => `/(tabs)/students/${id}/assessment`,
    ANALYTICS: (id: string) => `/(tabs)/students/${id}/analytics`,
    POSTURE_ANALYSIS: `/(tabs)/students/posture-analysis`,
  },

  // Workout Flows
  WORKOUTS: {
    ROOT: '/(tabs)/workouts',
    CREATE_PERIODIZATION: '/(tabs)/workouts/create-periodization',
    DETAILS: (id: string) => `/(tabs)/workouts/${id}`,
    ASSIGNMENTS: (id: string) => `/workouts/${id}/assignments`,
    SELECT_EXERCISES: '/workouts/select-exercises',
  },
} as const;

export type AppRoutes = typeof ROUTES;
