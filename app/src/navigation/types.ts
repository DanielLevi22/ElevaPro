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
    SECURITY: '/(tabs)/security',
    INDEX: '/(tabs)/index',
    RANKING: '/(tabs)/ranking',
    CARDIO: '/(tabs)/cardio',
    /** O menu: aberto pelo "Menu" do + e pela engrenagem do perfil. */
    MENU: '/(tabs)/menu',
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

  // Ajuda
  SETTINGS: {
    /** As preferências dos avisos do dia (#376, E5). */
    NOTICES: '/settings/notices',
  },

  HELP: {
    /** Os comandos de voz da execução do treino. */
    VOICE_COMMANDS: '/help/voice-commands',
  },

  // Onboarding
  ONBOARDING: {
    /** O1 a O3 do onboarding do Praticante (#365). */
    WELCOME: '/onboarding/welcome',
    SCOPE: '/onboarding/scope',
    GOAL: '/onboarding/goal',
    LEVEL: '/onboarding/level',
    CONSENT: '/onboarding/consent',
    ABOUT: '/onboarding/about',
    SCAN_OFFER: '/onboarding/scan-offer',
    HEALTH: '/onboarding/health',
    SCREENING: '/onboarding/screening',
    TRAINING: '/onboarding/training',
    FOOD: '/onboarding/food',
    BUILDING: '/onboarding/building',
    PLAN: '/onboarding/plan',
    HEALTH_CONNECT: '/onboarding/health-connect',
  },

  // Check-in da semana (#376). A entrada mora em `checkin.tsx`, e não em
  // `checkin/index.tsx`, pelo mesmo motivo da técnica: o typegen erra a segunda.
  BLOCK: {
    DELOAD: '/block/deload',
    REVIEW: '/block/review',
    MEASURES: '/block/measures',
    CHANGES: '/block/changes',
    EARLY: '/block/early',
    BUILDING: '/block/building',
    REPORT: '/block/report',
    REST: '/block/rest',
    RETURN: '/block/return',
    HISTORY: (id: string) => ({ pathname: '/block/history/[id]', params: { id } }) as const,
    NEXT: '/block/next',
    /** "Semana corrida?" (#376, F5): o aviso do 7º dia sem treino abre aqui. */
    BUSY_WEEK: '/block/busy-week',
  },

  CHECKIN: {
    ROOT: '/checkin',
    RESULT: '/checkin/result',
    SIMPLER: '/checkin/simpler',
    REPORT: '/checkin/report',
  },

  // Student Flows
  STUDENTS: {
    ROOT: '/(tabs)/students',
    CREATE: '/(tabs)/students/create',
    DETAILS: (id: string): `/(tabs)/students/${string}` => `/(tabs)/students/${id}`,
    WORKOUTS: (id: string): `/(tabs)/students/${string}/workouts` =>
      `/(tabs)/students/${id}/workouts`,
    // A dieta do aluno abre a aba Nutrição, e a avaliação por foto é do próprio
    // aluno: as telas legadas de `[id]/nutrition` e `[id]/assessment` saíram (#436).
    // A linha do tempo que morava em `/history` foi para o Acompanhamento (#334),
    // e de lá para as Atividades, que o Gerenciamento abre.
    ACTIVITIES: (id: string): `/(tabs)/students/${string}/activities` =>
      `/(tabs)/students/${id}/activities`,
    ANAMNESIS: '/students/anamnesis',
    /** As avaliações físicas do aluno, o mesmo fluxo do web: lista, ficha e correções. */
    ASSESSMENTS: {
      LIST: (id: string): `/(tabs)/students/${string}/assessments` =>
        `/(tabs)/students/${id}/assessments`,
      /** Sem `assessmentId`, ficha nova; com, a correção daquela avaliação. */
      FORM: (id: string, assessmentId?: string) =>
        ({
          pathname: '/(tabs)/students/[id]/assessments/form',
          params: assessmentId ? { id, assessmentId } : { id },
        }) as const,
      REVISIONS: (id: string, assessmentId: string) =>
        ({
          pathname: '/(tabs)/students/[id]/assessments/revisions',
          params: { id, assessmentId },
        }) as const,
    },
    /**
     * O fluxo de Progresso do aluno visto pelo especialista — o "Evolução geral"
     * do Acompanhamento (#334). As mesmas telas da aba do aluno, dentro da pilha de
     * Alunos; em objeto pela mesma razão de `PROGRESS.SCAN`. O hub é `hub`, e não
     * `index`: `progress/index` sai tipado como caminho literal, que o roteador
     * não serve (a armadilha de `PROGRESS.SCANS`), e fora da pasta ele ficaria sem
     * o `_layout` que diz quem está olhando.
     */
    PROGRESS: {
      HOME: (id: string, segment: 'overview' | 'nutrition' | 'training' = 'overview') =>
        ({ pathname: '/(tabs)/students/[id]/progress/hub', params: { id, segment } }) as const,
      LOADS: (id: string) =>
        ({ pathname: '/(tabs)/students/[id]/progress/loads', params: { id } }) as const,
      BODY: (id: string) =>
        ({ pathname: '/(tabs)/students/[id]/progress/body', params: { id } }) as const,
      CIRCUMFERENCES: (id: string) =>
        ({ pathname: '/(tabs)/students/[id]/progress/circumferences', params: { id } }) as const,
      COMPARE: (id: string) =>
        ({ pathname: '/(tabs)/students/[id]/progress/compare', params: { id } }) as const,
      MEASUREMENTS: (id: string) =>
        ({ pathname: '/(tabs)/students/[id]/progress/measurements', params: { id } }) as const,
      REPORT: (id: string) =>
        ({ pathname: '/(tabs)/students/[id]/progress/report', params: { id } }) as const,
    },
    /** Uma periodização aberta a partir dos treinos do aluno, sem sair da pilha de Alunos. */
    PERIODIZATION: (studentId: string, periodizationId: string) =>
      ({
        pathname: '/(tabs)/students/[id]/workouts/[periodizationId]',
        params: { id: studentId, periodizationId },
      }) as const,
    /**
     * A Nova periodização de um aluno, na pilha de Alunos. A da aba Treinos subia
     * por cima do que aquela aba guardava, e o Voltar caía no treino de outro
     * aluno (#437).
     */
    PERIODIZATION_NEW: (studentId: string, studentName?: string) =>
      ({
        pathname: '/(tabs)/students/[id]/workouts/new',
        params: { id: studentId, ...(studentName ? { studentName } : {}) },
      }) as const,
    /** A fase dessa periodização, ainda na pilha de Alunos. */
    PHASE: (studentId: string, periodizationId: string, phaseId: string) =>
      ({
        pathname: '/(tabs)/students/[id]/workouts/[periodizationId]/phases/[phaseId]',
        params: { id: studentId, periodizationId, phaseId },
      }) as const,
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
    /**
     * A ficha do treino pro especialista/personal — `workoutId` repete `id`
     * porque `WorkoutDetailsScreen` ainda lê os dois nomes de parâmetro.
     */
    DETAILS_FOR_SPECIALIST: (id: string, studentId: string | undefined) =>
      ({
        pathname: '/(tabs)/workouts/details/[id]',
        params: { id, workoutId: id, studentId },
      }) as const,
    /** A mesma ficha, pro aluno/membro — com `mode=execute` quando vem da execução do dia. */
    DETAILS_STUDENT: (id: string, executar = false) =>
      ({
        pathname: '/(tabs)/workouts/details/[id]',
        params: executar ? { id, mode: 'execute' } : { id },
      }) as const,
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
    /** A mesma fase no modo de quem treina, que abre a ficha para executar. */
    PHASE_EXECUTE: (periodizationId: string, phaseId: string) =>
      ({
        pathname: '/(tabs)/workouts/periodizations/[id]/phases/[phaseId]',
        params: { id: periodizationId, phaseId, mode: 'execute' },
      }) as const,
    EXECUTE: (id: string): `/(tabs)/workouts/execute/${string}` => `/(tabs)/workouts/execute/${id}`,
    /** "Só tenho 20 min" (#376, F3): a mesma sessão, com os três primeiros exercícios. */
    EXECUTE_SHORT: (id: string) =>
      ({ pathname: '/(tabs)/workouts/execute/[id]', params: { id, short: '1' } }) as const,
    /**
     * O formulário da periodização, como o modal do web (#387): grava só a
     * periodização. Fase, ficha e exercício nascem cada um na sua tela.
     */
    PERIODIZATION_NEW: (studentId?: string, studentName?: string) =>
      ({
        pathname: '/(tabs)/workouts/periodization-form',
        params: { ...(studentId ? { studentId } : {}), ...(studentName ? { studentName } : {}) },
      }) as const,
    PERIODIZATION_EDIT: (periodizationId: string) =>
      ({ pathname: '/(tabs)/workouts/periodization-form', params: { periodizationId } }) as const,
    // Chat com o assistente de treino (#335). Mora fora da criação, como o
    // coach do web: chega-se a ele pelo histórico de conversas.
    ASSISTANT: '/(tabs)/workouts/assistant',
  },

  // Nutrição do aluno, no desenho de vidro (#298). O member segue nas telas antigas.
  NUTRITION: {
    ROOT: '/(tabs)/nutrition',
    /** Leitura do plano enviado; edição é uma ação explícita, em rascunho. */
    PLAN: (id: string) => ({ pathname: '/(tabs)/nutrition/[id]', params: { id } }) as const,
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
    /**
     * A criação de dieta em passos (#337): ponto de partida, metas, o plano com
     * as refeições, a revisão e o envio. Os parâmetros vão por `params`.
     */
    WIZARD_START: '/(tabs)/nutrition/wizard/start',
    WIZARD_GOALS: '/(tabs)/nutrition/wizard/goals',
    WIZARD_PLAN: '/(tabs)/nutrition/wizard/plan',
    WIZARD_MEAL: '/(tabs)/nutrition/wizard/meal',
    WIZARD_FOOD_SEARCH: '/(tabs)/nutrition/wizard/food-search',
    WIZARD_REVIEW: '/(tabs)/nutrition/wizard/review',
    WIZARD_SENT: '/(tabs)/nutrition/wizard/sent',
    WIZARD_ASSISTANT: '/(tabs)/nutrition/wizard/assistant',
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
    /** A tendência de peso, com a faixa do ritmo e os ajustes (#376, A10). */
    WEIGHT_TREND: '/(tabs)/progress/weight',
    /** Sua jornada: a linha do tempo desde o primeiro plano (#376, D1). */
    JOURNEY: '/(tabs)/progress/journey',
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
