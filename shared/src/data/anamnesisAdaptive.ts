export type PersonaTrack = "beginner" | "returning" | "intermediate" | "advanced";

export interface AdaptiveQuestion {
  id: string;
  text: string;
  type: "text" | "number" | "boolean" | "single_choice" | "multiple_choice";
  options?: string[];
  weight: number; // precision contribution 1–10
  whyWeAsk: string;
  unit?: string;
  placeholder?: string;
}

export interface UnlockCard {
  afterQuestionId: string;
  emoji: string;
  title: string;
  detail: string;
}

// ─── Persona Options ────────────────────────────────────────────────────────────

export const PERSONA_OPTIONS = [
  {
    track: "beginner" as PersonaTrack,
    emoji: "🌱",
    label: "Estou começando agora",
    detail: "16 perguntas — sem jargão técnico",
  },
  {
    track: "returning" as PersonaTrack,
    emoji: "🔄",
    label: "Já treinei, mas parei",
    detail: "21 perguntas — foco em recomeçar certo",
  },
  {
    track: "intermediate" as PersonaTrack,
    emoji: "💪",
    label: "Treino regularmente",
    detail: "26 perguntas — personalização avançada",
  },
  {
    track: "advanced" as PersonaTrack,
    emoji: "🏆",
    label: "Treino há anos / sou atleta",
    detail: "32 perguntas — contexto completo",
  },
];

// ─── Base Questions (all tracks) ───────────────────────────────────────────────

const BASE_QUESTIONS: AdaptiveQuestion[] = [
  {
    id: "main_goal",
    text: "Qual é o seu objetivo principal?",
    type: "single_choice",
    options: ["Hipertrofia", "Emagrecimento", "Força / Performance", "Saúde / Bem-estar"],
    weight: 10,
    whyWeAsk:
      "É a bússola de todo o seu plano — treino, volume e dieta mudam completamente conforme o objetivo.",
  },
  {
    id: "gender",
    text: "Qual é o seu sexo biológico?",
    type: "single_choice",
    options: ["Masculino", "Feminino"],
    weight: 8,
    whyWeAsk: "Usamos para calcular seu metabolismo basal com mais precisão.",
  },
  {
    id: "weight",
    text: "Qual é o seu peso atual?",
    type: "number",
    unit: "kg",
    placeholder: "75",
    weight: 10,
    whyWeAsk: "Determina suas metas calóricas e carga de treino.",
  },
  {
    id: "height",
    text: "Qual é a sua altura?",
    type: "number",
    unit: "cm",
    placeholder: "175",
    weight: 8,
    whyWeAsk: "Junto com o peso, calcula seu IMC e metabolismo basal.",
  },
  {
    id: "training_days",
    text: "Quantos dias por semana você pode treinar?",
    type: "single_choice",
    options: ["2 dias", "3 dias", "4 dias", "5 dias", "6+ dias"],
    weight: 10,
    whyWeAsk: "O volume semanal do seu treino depende diretamente da frequência disponível.",
  },
  {
    id: "training_duration",
    text: "Quanto tempo você tem por treino?",
    type: "single_choice",
    options: ["30–40 min", "45–60 min", "60–90 min", "90+ min"],
    weight: 8,
    whyWeAsk: "Define quantos exercícios e séries cabem em cada sessão.",
  },
  {
    id: "gym_type",
    text: "Onde você vai treinar?",
    type: "single_choice",
    options: ["Academia completa", "Academia básica", "Home gym", "Ao ar livre"],
    weight: 8,
    whyWeAsk: "Selecionamos exercícios compatíveis com os equipamentos disponíveis.",
  },
  {
    id: "dietary_restrictions",
    text: "Você tem alguma restrição alimentar?",
    type: "multiple_choice",
    options: [
      "Nenhuma",
      "Vegetariano",
      "Vegano",
      "Intolerante a Lactose",
      "Intolerante a Glúten",
      "Diabetes",
      "Outra",
    ],
    weight: 6,
    whyWeAsk: "Garante que as recomendações de nutrição sejam viáveis para você.",
  },
  {
    id: "injuries",
    text: "Tem alguma dor ou lesão que devo saber?",
    type: "multiple_choice",
    options: ["Nenhuma", "Coluna", "Ombros", "Joelhos", "Quadril", "Cotovelo", "Punhos"],
    weight: 6,
    whyWeAsk: "Adaptamos os exercícios para proteger regiões sensíveis.",
  },
  {
    id: "medical_conditions",
    text: "Tem alguma condição médica?",
    type: "text",
    placeholder: 'Ex: pressão alta, diabetes... ou "nenhuma"',
    weight: 5,
    whyWeAsk: "Pressão alta, diabetes ou outras condições afetam intensidade e tipo de treino.",
  },
  {
    id: "sleep_hours",
    text: "Em média, quantas horas você dorme por noite?",
    type: "number",
    unit: "horas",
    placeholder: "7",
    weight: 4,
    whyWeAsk:
      "O sono é onde o músculo cresce. Dormindo pouco, reduzimos o volume para evitar overtraining.",
  },
  {
    id: "stress_level",
    text: "Como está seu nível de estresse no dia a dia?",
    type: "single_choice",
    options: ["Baixo", "Médio", "Alto"],
    weight: 4,
    whyWeAsk: "Estresse crônico eleva o cortisol e prejudica a recuperação — ajustamos o volume.",
  },
  {
    id: "diet_quality",
    text: "Como você avalia sua alimentação hoje?",
    type: "single_choice",
    options: ["Boa", "Regular", "Ruim"],
    weight: 3,
    whyWeAsk: "Calibra quão agressivo deve ser o ajuste calórico inicial.",
  },
  {
    id: "session_time_preference",
    text: "Você prefere treinar em qual período?",
    type: "single_choice",
    options: ["Manhã", "Tarde", "Noite", "Não importa"],
    weight: 2,
    whyWeAsk: "Influencia sugestões de suplementação (ex: cafeína) e refeições pré-treino.",
  },
  {
    id: "food_preferences",
    text: "Tem algum alimento que ama ou detesta?",
    type: "text",
    placeholder: "Ex: odeio brócolis, adoro frango...",
    weight: 2,
    whyWeAsk: "Tornamos o plano alimentar realista para você seguir no dia a dia.",
  },
  {
    id: "commitment",
    text: "Qual é o seu nível de comprometimento?",
    type: "single_choice",
    options: [
      "Vou tentar quando der",
      "Comprometido, mas flexível",
      "Total — sigo o plano à risca",
    ],
    weight: 3,
    whyWeAsk:
      "Ajusta o rigor das metas — não tem sentido plano rígido para quem precisa de flexibilidade.",
  },
];

// ─── Returning Track extras ─────────────────────────────────────────────────────

const RETURNING_EXTRA: AdaptiveQuestion[] = [
  {
    id: "training_time",
    text: "Quanto tempo você treinou antes de parar?",
    type: "text",
    placeholder: "Ex: 2 anos",
    weight: 3,
    whyWeAsk: "Quanto mais longa a base anterior, mais rápida é a recuperação muscular.",
  },
  {
    id: "modalities",
    text: "Quais modalidades você praticava?",
    type: "text",
    placeholder: "Ex: musculação, crossfit, corrida...",
    weight: 3,
    whyWeAsk: "Histórico motor influencia a seleção de exercícios.",
  },
  {
    id: "had_professional_help",
    text: "Você teve acompanhamento de personal antes?",
    type: "boolean",
    weight: 2,
    whyWeAsk: "Ajuda a calibrar o nível de detalhamento nas explicações do plano.",
  },
  {
    id: "negative_experiences",
    text: "O que não funcionou no seu treino anterior?",
    type: "text",
    placeholder: "Ex: falta de progressão, muito volume...",
    weight: 4,
    whyWeAsk: "Evitamos repetir abordagens que já provaram não funcionar para você.",
  },
  {
    id: "biggest_difficulty",
    text: "Qual foi a maior dificuldade que te fez parar?",
    type: "text",
    placeholder: "Ex: viagens frequentes, lesão...",
    weight: 4,
    whyWeAsk: "O plano é estruturado para minimizar exatamente esse obstáculo.",
  },
];

// ─── Intermediate Track extras ──────────────────────────────────────────────────

const INTERMEDIATE_EXTRA: AdaptiveQuestion[] = [
  {
    id: "squat_level",
    text: "Como está sua técnica no agachamento?",
    type: "single_choice",
    options: ["Nunca fiz", "Faço com pouca carga", "Faço livre com segurança", "Tenho boa técnica"],
    weight: 4,
    whyWeAsk: "Define progressão e variações de agachamento no seu plano.",
  },
  {
    id: "bench_press_level",
    text: "Como está sua técnica no supino?",
    type: "single_choice",
    options: ["Nunca fiz", "Faço com pouca carga", "Faço livre com segurança", "Tenho boa técnica"],
    weight: 4,
    whyWeAsk: "Define variações de peito e ombro no seu plano.",
  },
  {
    id: "deadlift_level",
    text: "Como está sua técnica no levantamento terra?",
    type: "single_choice",
    options: ["Nunca fiz", "Já fiz poucas vezes", "Faço com segurança", "Tenho boa técnica"],
    weight: 4,
    whyWeAsk: "O terra é o exercício mais técnico — define progressão de posterior e lombar.",
  },
  {
    id: "supplements",
    text: "Usa algum suplemento atualmente?",
    type: "multiple_choice",
    options: ["Nenhum", "Whey", "Creatina", "Cafeína", "Outros"],
    weight: 2,
    whyWeAsk: "Incluímos ou excluímos sugestões de suplementação conforme o que você já usa.",
  },
  {
    id: "nutritionist",
    text: "Você tem acompanhamento com nutricionista?",
    type: "boolean",
    weight: 2,
    whyWeAsk:
      "Se sim, focamos na estrutura do treino e deixamos a dieta detalhada para o nutricionista.",
  },
];

// ─── Advanced Track extras ──────────────────────────────────────────────────────

const ADVANCED_EXTRA: AdaptiveQuestion[] = [
  {
    id: "intend_to_compete",
    text: "Você tem objetivos competitivos?",
    type: "single_choice",
    options: ["Sim", "Não", "Talvez no futuro"],
    weight: 3,
    whyWeAsk: "Competição muda periodização, peaking e volume de forma significativa.",
  },
  {
    id: "goal_deadline",
    text: "Tem algum evento ou prazo em mente?",
    type: "text",
    placeholder: "Ex: campeonato em julho, viagem em 3 meses...",
    weight: 2,
    whyWeAsk: "Periodizamos o ciclo para atingir o pico no momento certo.",
  },
  {
    id: "trained_sport_specific",
    text: "Pratica ou praticou algum esporte específico?",
    type: "text",
    placeholder: "Ex: jiu-jitsu, natação, ciclismo...",
    weight: 2,
    whyWeAsk: "Esportes criam padrões motores que influenciam o treino de força.",
  },
  {
    id: "physical_job",
    text: "Seu trabalho exige esforço físico intenso?",
    type: "boolean",
    weight: 2,
    whyWeAsk: "Trabalho pesado é volume não computado — reduzimos para evitar overtraining.",
  },
  {
    id: "squat_rm",
    text: "Qual sua carga máxima (ou estimada) no agachamento?",
    type: "number",
    unit: "kg",
    placeholder: "100",
    weight: 4,
    whyWeAsk: "Calibramos cargas e progressões com base na sua força atual.",
  },
  {
    id: "expectations_text",
    text: "O que você espera de um coach de IA que um plano genérico não entrega?",
    type: "text",
    placeholder: "Ex: quero entender o porquê de cada exercício...",
    weight: 3,
    whyWeAsk: "Personalizamos o tom, as ênfases e os detalhes do plano conforme suas expectativas.",
  },
];

// ─── Unlock Cards ────────────────────────────────────────────────────────────────

export const UNLOCK_CARDS: UnlockCard[] = [
  {
    afterQuestionId: "height",
    emoji: "🔥",
    title: "Metabolismo calculado",
    detail: "Já estimamos suas calorias de manutenção com base no seu perfil físico.",
  },
  {
    afterQuestionId: "gym_type",
    emoji: "🏋️",
    title: "Exercícios selecionados",
    detail: "Filtramos o banco de exercícios compatíveis com o seu local de treino.",
  },
  {
    afterQuestionId: "injuries",
    emoji: "🛡️",
    title: "Plano adaptado para você",
    detail: "Identificamos regiões que precisam de atenção e ajustamos os movimentos.",
  },
  {
    afterQuestionId: "commitment",
    emoji: "⚡",
    title: "Estrutura base definida",
    detail: "Com esses dados, já conseguimos montar a periodização inicial do seu treino.",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function getTrackQuestions(track: PersonaTrack): AdaptiveQuestion[] {
  switch (track) {
    case "beginner":
      return BASE_QUESTIONS;
    case "returning":
      return [...BASE_QUESTIONS, ...RETURNING_EXTRA];
    case "intermediate":
      return [...BASE_QUESTIONS, ...RETURNING_EXTRA, ...INTERMEDIATE_EXTRA];
    case "advanced":
      return [...BASE_QUESTIONS, ...RETURNING_EXTRA, ...INTERMEDIATE_EXTRA, ...ADVANCED_EXTRA];
  }
}

export function getPrecisionScore(
  questions: AdaptiveQuestion[],
  responses: Record<string, unknown>,
): number {
  const totalWeight = questions.reduce((acc, q) => acc + q.weight, 0);
  const answeredWeight = questions
    .filter((q) => {
      const v = responses[q.id];
      return v !== undefined && v !== "" && v !== null && !(Array.isArray(v) && v.length === 0);
    })
    .reduce((acc, q) => acc + q.weight, 0);
  return 30 + Math.round((answeredWeight / totalWeight) * 64);
}

export function getQuestionPrecisionDelta(
  question: AdaptiveQuestion,
  questions: AdaptiveQuestion[],
): number {
  const totalWeight = questions.reduce((acc, q) => acc + q.weight, 0);
  return Math.max(1, Math.round((question.weight / totalWeight) * 64));
}
