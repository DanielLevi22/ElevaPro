export const ROUTES = {
  /**
   * Entrada no app. São três desde a #281: o login por código de convite e a
   * fila de aprovação do especialista foram removidos, e com eles as rotas
   * `student-login` e `pending-approval`.
   */
  AUTH: {
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
    FORGOT_PASSWORD: '/(auth)/forgot-password',
    RESET_PASSWORD: '/(auth)/reset-password',
    MFA: '/(auth)/mfa',
  },

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
     * Mora em `tecnica.tsx`, e não em `tecnica/index.tsx`, porque o typegen
     * deste projeto nomeia a segunda forma como `/tecnica/index` — endereço
     * que o roteador não serve, e que deu "tela não encontrada" no emulador.
     * Arquivo simples com pasta irmã é a forma que ele acerta.
     */
    ROOT: '/tecnica',
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
    WORKOUT_DETAILS: (
      studentId: string,
      workoutId: string
    ): `/(tabs)/students/${string}/workouts/details/${string}` =>
      `/(tabs)/students/${studentId}/workouts/details/${workoutId}`,
  },

  // Workout Flows
  WORKOUTS: {
    ROOT: '/(tabs)/workouts',
    DETAILS: (id: string): `/(tabs)/workouts/${string}` => `/(tabs)/workouts/${id}`,
    // Sem o grupo `(tabs)` isto nunca casava com a rota de verdade — os únicos
    // dois call sites que existiam bypassavam a constante com string solta.
    SELECT_EXERCISES: '/(tabs)/workouts/select-exercises',
    PERIODIZATION: (id: string): `/(tabs)/workouts/periodizations/${string}` =>
      `/(tabs)/workouts/periodizations/${id}`,
    /**
     * A mesma ficha, em modo de execução — `mode` como parâmetro, e não
     * embutido na URL: `PERIODIZATION(id)` embutida não casa com `pathname`
     * em objeto, que quer o segmento `[id]` literal (ver `PROGRESS.SCAN`).
     */
    PERIODIZATION_EXECUTE: (id: string) =>
      ({
        pathname: '/(tabs)/workouts/periodizations/[id]',
        params: { id, mode: 'execute' },
      }) as const,
    PHASE: (
      periodizationId: string,
      phaseId: string
    ): `/(tabs)/workouts/periodizations/${string}/phases/${string}` =>
      `/(tabs)/workouts/periodizations/${periodizationId}/phases/${phaseId}`,
    EXECUTE: (id: string): `/(tabs)/workouts/execute/${string}` => `/(tabs)/workouts/execute/${id}`,
    // Wizard de criação (#335) — substitui a antiga CreatePeriodizationScreen
    // e a criação inline de fase/treino que ainda mora em
    // PeriodizationDetailsScreen/PhaseDetailsScreen.
    WIZARD_STRUCTURE: '/(tabs)/workouts/wizard/structure',
    WIZARD_BUILD: '/(tabs)/workouts/wizard/build',
    WIZARD_REVIEW: '/(tabs)/workouts/wizard/review',
    // Chat de verdade com o assistente (#335) — substitui a proposta de um
    // tiro só que morava em WIZARD_STRUCTURE/WIZARD_BUILD.
    WIZARD_ASSISTANT: '/(tabs)/workouts/wizard/assistant',
  },

  // Nutrição do aluno, no desenho de vidro (#298). O member segue nas telas antigas.
  NUTRITION: {
    ROOT: '/(tabs)/nutrition',
    /** `data` é o dia aberto no plano: o detalhe mostra o que foi comido nele. */
    MEAL: (
      refeicaoId: string,
      data: string
    ): `/(tabs)/nutrition/refeicao/${string}?data=${string}` =>
      `/(tabs)/nutrition/refeicao/${refeicaoId}?data=${data}`,
    SWAP: (
      refeicaoId: string,
      itemId: string,
      data: string
    ): `/(tabs)/nutrition/substituir?refeicaoId=${string}&itemId=${string}&data=${string}` =>
      `/(tabs)/nutrition/substituir?refeicaoId=${refeicaoId}&itemId=${itemId}&data=${data}`,
    SEARCH: '/(tabs)/nutrition/buscar',
    SCAN: '/(tabs)/nutrition/scan',
    ASSISTANT: '/(tabs)/nutrition/bot',
    SHOPPING: '/(tabs)/nutrition/shopping-list',
    ADHERENCE: '/(tabs)/nutrition/aderencia',
    /** O modo de preparo de uma refeição, gerado pelo assistente de receita. */
    COOKING: '/(tabs)/nutrition/cooking',
  },

  // Telas do próprio aluno sobre os dados dele
  STUDENT: {
    ANAMNESIS: '/student/anamnesis',
    /** Histórico das próprias sessões, com o caminho de correção (Art. 18, III). */
    SESSION_HISTORY: '/student/session-history',
    /** A antiga postura agora Ã© a leitura da anÃ¡lise, dentro de Progresso (#316). */
    POSTURE_ANALYSIS: (id: string) =>
      ({ pathname: '/(tabs)/progress/scans/[id]', params: { id } }) as const,
  },

  // Métricas em vidro (#312): o hub e o que se abre dele, dentro da aba Progresso.
  PROGRESS: {
    /** O hub, com os segmentos Geral, Nutrição e Treino. */
    HOME: '/(tabs)/progress',
    /** A evolução da carga máxima de cada exercício. */
    LOADS: '/(tabs)/progress/loads',
    /** Composição corporal: peso, gordura, massa magra e IMC por origem. */
    BODY: '/(tabs)/progress/body',
    /** As 8 circunferências e a silhueta comparada. */
    CIRCUMFERENCES: '/(tabs)/progress/circumferences',
    /** O que mudou entre dois registros da mesma origem. */
    COMPARE: '/(tabs)/progress/compare',
    /** Nova medida declarada, ou a correção de uma (com `id`). */
    MEASUREMENT_FORM: '/(tabs)/progress/measurement',
    /** O histórico das medidas, com o caminho de correção da declarada. */
    MEASUREMENTS: '/(tabs)/progress/measurements',
    /** O relatório dos últimos 90 dias, com a exportação em PDF. */
    REPORT: '/(tabs)/progress/report',
    /**
     * O histórico de body scans (#316). Arquivo simples com a pasta `scans/`
     * irmã: `scans/index` sai tipado como `/scans/index`, que o roteador não serve.
     */
    SCANS: '/(tabs)/progress/scans',
    /**
     * A leitura de uma análise: confiança, notas, achados e recomendação.
     *
     * Em objeto, e não em texto: o typegen de um Metro já aberto tipa `[id]`
     * novo como segmento literal, e a forma com `params` passa nos dois casos.
     */
    SCAN: (id: string) => ({ pathname: '/(tabs)/progress/scans/[id]', params: { id } }) as const,
    /** As medidas estimadas de uma análise, contra a anterior. */
    SCAN_MEASURES: (id: string) =>
      ({ pathname: '/(tabs)/progress/scan-measures/[id]', params: { id } }) as const,
  },

  // Saúde em vidro (#308): dentro das abas, com a tab bar, como o kit desenha.
  HEALTH: {
    /** Saúde do dia: a prontidão, sono, FC de repouso, passos e calorias contra a média. */
    //
    // `hoje`, e não `index`: com o Metro já rodando, o typegen tipa a pasta nova como
    // `/saude/index` e um Metro novo como `/saude`. Um nome próprio sai igual nos dois.
    TODAY: '/(tabs)/saude/hoje',
    /** Meu relógio: a fonte, a última leitura de cada métrica, sincronizar e desconectar. */
    WATCH: '/(tabs)/saude/relogio',
    /** O que você autoriza: o que chega de cada tipo, e o caminho para o sistema. */
    PERMISSIONS: '/(tabs)/saude/permissoes',
    /** Health check: o que falta para o app acompanhar tudo. */
    CHECK: '/(tabs)/saude/diagnostico',
    /** Minhas autorizações: cada finalidade com o aceite, e a retirada. */
    AUTHORIZATIONS: '/(tabs)/saude/autorizacoes',
  },
} as const;

export type AppRoutes = typeof ROUTES;
