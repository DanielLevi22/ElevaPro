/**
 * As perguntas da Anamnese — uma definição só, para as duas plataformas.
 *
 * Existiam duas cópias, uma em cada lado, com os mesmos ids. Elas já tinham
 * divergido na apresentação (caixa dos títulos) e nada acusava — foi essa
 * ausência de fonte única que deixou as duas telas do mobile gravarem formas
 * diferentes na mesma coluna sem ninguém notar.
 *
 * Os títulos ficam em Title Case; o mobile aplica `uppercase` na renderização,
 * então a caixa daqui não decide o que aparece na tela.
 */

export type QuestionType =
  | "text"
  | "number"
  | "boolean"
  | "single_choice"
  | "multiple_choice"
  | "date";

export interface AnamnesisQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
  /** Texto de apoio dentro do campo. Só o mobile usa hoje. */
  placeholder?: string;
  condition?: { questionId: string; expectedValue: unknown };
}

export interface AnamnesisSection {
  id: string;
  title: string;
  questions: AnamnesisQuestion[];
}

export const GENERAL_ANAMNESIS: AnamnesisSection[] = [
  {
    id: "personal_data",
    title: "Dados Pessoais",
    questions: [
      { id: "full_name", text: "Nome completo", type: "text", required: true },
      { id: "age", text: "Idade", type: "number", required: true },
      { id: "height", text: "Altura (cm)", type: "number", required: true },
      {
        id: "gender",
        text: "Sexo biológico (para cálculo de metabolismo)",
        type: "single_choice",
        options: ["Masculino", "Feminino"],
        required: true,
      },
      { id: "weight", text: "Peso corporal atual (kg)", type: "number", required: true },
      {
        id: "profession_routine",
        text: "Profissão / rotina diária",
        type: "single_choice",
        options: ["Sedentário", "Ativo", "Pesado"],
        required: true,
      },
    ],
  },
  {
    id: "training_history",
    title: "Histórico de Treinamento",
    questions: [
      { id: "training_time", text: "Há quanto tempo treina?", type: "text", required: true },
      {
        id: "experience_level",
        text: "Como você considera seu nível de experiência?",
        type: "single_choice",
        options: ["Iniciante (0-1 ano)", "Intermediário (1-3 anos)", "Avançado (+3 anos)"],
        required: true,
      },
      {
        id: "trained_sport_specific",
        text: "Pratica algum esporte específico?",
        type: "boolean",
        required: true,
      },
      {
        id: "sport_specific_name",
        text: "Se sim, qual?",
        type: "text",
        condition: { questionId: "trained_sport_specific", expectedValue: true },
      },
      {
        id: "weekly_frequency",
        text: "Frequência atual de treino semanal",
        type: "text",
        required: true,
      },
      {
        id: "had_professional_help",
        text: "Já teve acompanhamento profissional?",
        type: "boolean",
      },
      {
        id: "modalities",
        text: "Modalidades que já praticou (ex: musculação, cross, luta)",
        type: "text",
      },
    ],
  },
  {
    id: "goals",
    title: "Objetivos",
    questions: [
      {
        id: "main_goal",
        text: "Seu principal objetivo é",
        type: "single_choice",
        options: [
          "Hipertrofia",
          "Emagrecimento",
          "Força / Performance",
          "Saúde / Bem-estar",
          "Preparação Física",
        ],
        required: true,
      },
      {
        id: "intend_to_compete",
        text: "Pretende competir?",
        type: "single_choice",
        options: ["Sim", "Não", "Talvez no futuro"],
        required: true,
      },
      { id: "goal_deadline", text: "Prazo para alcançar seus objetivos", type: "date" },
      {
        id: "motivation_level",
        text: "De 0 a 10, qual seu nível de motivação hoje?",
        type: "single_choice",
        options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        required: true,
      },
      { id: "biggest_motivator", text: "O que mais te motiva a treinar?", type: "text" },
    ],
  },
  {
    id: "basic_movements",
    title: "Experiência com os Movimentos Básicos",
    questions: [
      {
        id: "squat_level",
        text: "Agachamento",
        type: "single_choice",
        options: [
          "Nunca fiz",
          "Faço com pouca carga",
          "Já faço livre com segurança",
          "Tenho boa técnica",
        ],
        required: true,
      },
      {
        id: "bench_press_level",
        text: "Supino",
        type: "single_choice",
        options: [
          "Nunca fiz",
          "Faço com pouca carga",
          "Já faço livre com segurança",
          "Tenho boa técnica",
        ],
        required: true,
      },
      {
        id: "deadlift_level",
        text: "Levantamento Terra",
        type: "single_choice",
        options: ["Nunca fiz", "Já fiz poucas vezes", "Faço com segurança", "Tenho boa técnica"],
        required: true,
      },
    ],
  },
  {
    id: "current_loads",
    title: "Cargas Atuais",
    questions: [
      { id: "squat_rm", text: "Agachamento – carga máxima ou estimada (kg)", type: "number" },
      { id: "bench_rm", text: "Supino – carga máxima ou estimada (kg)", type: "number" },
      { id: "deadlift_rm", text: "Terra – carga máxima ou estimada (kg)", type: "number" },
      { id: "never_tested_1rm", text: "Nunca testou 1RM?", type: "boolean" },
    ],
  },
  {
    id: "health_injuries",
    title: "Saúde e Lesões",
    questions: [
      {
        id: "injuries",
        text: "Possui ou já teve alguma lesão?",
        type: "multiple_choice",
        options: ["Coluna", "Ombros", "Joelhos", "Quadril", "Cotovelo", "Punhos", "Nenhuma"],
        required: true,
      },
      { id: "other_injuries", text: "Outra lesão (se houver)", type: "text" },
      {
        id: "current_pain",
        text: "Sente dores atualmente? Onde e com que frequência?",
        type: "text",
      },
      { id: "surgeries", text: "Já passou por cirurgia? Qual e quando?", type: "text" },
      { id: "medical_conditions", text: "Possui alguma condição médica?", type: "text" },
      { id: "medications", text: "Usa algum medicamento contínuo?", type: "text" },
      {
        id: "family_history",
        text: "Histórico familiar de problemas cardíacos ou diabetes?",
        type: "text",
      },
    ],
  },
  {
    id: "mobility",
    title: "Mobilidade e Limitações",
    questions: [
      {
        id: "deep_squat_difficulty",
        text: "Sente dificuldade em agachar profundo?",
        type: "boolean",
      },
      {
        id: "deadlift_neutral_spine",
        text: "Sente dificuldade em manter coluna neutra no terra?",
        type: "boolean",
      },
      {
        id: "bench_stability",
        text: "Sente dificuldade na estabilidade no supino?",
        type: "boolean",
      },
      {
        id: "mobility_limitations",
        text: "Possui alguma limitação de movimento conhecida?",
        type: "text",
      },
      {
        id: "postural_assessment",
        text: "Já fez avaliação postural ou de mobilidade?",
        type: "boolean",
      },
    ],
  },
  {
    id: "routine_sleep",
    title: "Rotina, Sono e Recuperação",
    questions: [
      { id: "sleep_hours", text: "Quantas horas dorme por noite?", type: "number", required: true },
      {
        id: "sleep_quality",
        text: "Qualidade do sono",
        type: "single_choice",
        options: ["Boa", "Regular", "Ruim"],
        required: true,
      },
      {
        id: "stress_level",
        text: "Nível de estresse diário",
        type: "single_choice",
        options: ["Baixo", "Médio", "Alto"],
        required: true,
      },
      { id: "physical_job", text: "Trabalho físico pesado?", type: "boolean" },
    ],
  },
  {
    id: "nutrition",
    title: "Alimentação e Suplementação",
    questions: [
      { id: "nutritionist", text: "Possui acompanhamento nutricional?", type: "boolean" },
      {
        id: "diet_quality",
        text: "Como avalia sua alimentação",
        type: "single_choice",
        options: ["Boa", "Regular", "Ruim"],
      },
      {
        id: "dietary_restrictions",
        text: "Possui alguma restrição alimentar?",
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
      },
      {
        id: "supplements",
        text: "Suplementos utilizados",
        type: "multiple_choice",
        options: ["Whey", "Creatina", "Cafeína", "Outros", "Nenhum"],
      },
      {
        id: "alcohol",
        text: "Consumo de álcool?",
        type: "single_choice",
        options: ["Não", "Social", "Frequente"],
      },
      {
        id: "smoking",
        text: "Fumante?",
        type: "single_choice",
        options: ["Não", "Sim", "Ocasionalmente"],
      },
      {
        id: "water_intake",
        text: "Quantos litros de água bebe por dia?",
        type: "number",
        required: true,
      },
    ],
  },
  {
    id: "logistics",
    title: "Disponibilidade e Logística",
    questions: [
      {
        id: "training_days",
        text: "Quantos dias por semana pode treinar?",
        type: "number",
        required: true,
      },
      { id: "training_duration", text: "Tempo médio por treino (minutos)", type: "number" },
      {
        id: "gym_type",
        text: "Treina em academia ou home gym?",
        type: "single_choice",
        options: ["Academia", "Home Gym"],
      },
      {
        id: "equipment",
        text: "Equipamentos disponíveis (ex: gaiola, barra olímpica)",
        type: "text",
      },
    ],
  },
  {
    id: "expectations",
    title: "Expectativas com a Consultoria",
    questions: [
      {
        id: "expectations_text",
        text: "O que você espera do acompanhamento?",
        type: "text",
        required: true,
      },
      {
        id: "negative_experiences",
        text: "Já teve experiências negativas com treino? Quais?",
        type: "text",
      },
      {
        id: "commitment",
        text: "Está disposto a seguir planejamento e feedbacks?",
        type: "boolean",
      },
      { id: "biggest_difficulty", text: "Maior dificuldade atual no treino", type: "text" },
    ],
  },
  {
    id: "observations",
    title: "Observações Finais",
    questions: [
      {
        id: "final_notes",
        text: "Alguma informação importante que não foi citada acima?",
        type: "text",
      },
      {
        id: "has_videos",
        text: "Possui vídeos dos levantamentos para análise técnica?",
        type: "boolean",
      },
    ],
  },
];
