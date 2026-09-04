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
    TUTORIAL: '/assessment/tutorial',
    GRID: '/assessment/grid',
    CAMERA: '/assessment/camera',
    PROCESSING: '/assessment/processing',
    // A anamnese do aluno mora em `student/`, não em `assessment/`. Havia um
    // `router.push('/assessment/anamnesis')` apontando para uma rota
    // que nunca existiu — o `as never` transformou o erro de compilação em
    // botão morto.
    ANAMNESIS: '/student/anamnesis',
  },

  // Análise de Técnica (issue #194)
  TECHNIQUE: {
    /**
     * A lista de exercícios. É a porta: a Home aponta para cá, não para um
     * exercício.
     *
     * Com o `/index` explícito porque é assim que o typegen do Expo Router
     * nomeia rota de índice neste projeto — mesma razão do `TABS.INDEX` acima.
     */
    ROOT: '/tecnica/index',
    SQUAT: '/tecnica/agachamento',
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
    DETAILS: (id: string): `/(tabs)/students/${string}` => `/(tabs)/students/${id}`,
    WORKOUTS: (id: string): `/(tabs)/students/${string}/workouts` =>
      `/(tabs)/students/${id}/workouts`,
    NUTRITION: (id: string): `/(tabs)/students/${string}/nutrition` =>
      `/(tabs)/students/${id}/nutrition`,
    HISTORY: (id: string): `/(tabs)/students/${string}/history` => `/(tabs)/students/${id}/history`,
    ASSESSMENT: (id: string): `/(tabs)/students/${string}/assessment` =>
      `/(tabs)/students/${id}/assessment`,
    ANALYTICS: (id: string): `/(tabs)/students/${string}/analytics` =>
      `/(tabs)/students/${id}/analytics`,
    POSTURE_ANALYSIS: `/(tabs)/students/posture-analysis`,
  },

  // Workout Flows
  WORKOUTS: {
    ROOT: '/(tabs)/workouts',
    CREATE_PERIODIZATION: '/(tabs)/workouts/create-periodization',
    DETAILS: (id: string): `/(tabs)/workouts/${string}` => `/(tabs)/workouts/${id}`,
    SELECT_EXERCISES: '/workouts/select-exercises',
  },

  // Telas do próprio aluno sobre os dados dele
  STUDENT: {
    ANAMNESIS: '/student/anamnesis',
    /** Histórico das próprias sessões, com o caminho de correção (Art. 18, III). */
    SESSION_HISTORY: '/student/session-history',
    /** A própria análise corporal. A gêmea em (tabs)/students/ é do especialista. */
    POSTURE_ANALYSIS: '/student/posture-analysis',
  },
} as const;

export type AppRoutes = typeof ROUTES;
