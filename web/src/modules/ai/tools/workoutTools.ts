import type { ToolDefinition } from "../providers/types";

export const WORKOUT_TOOLS: ToolDefinition[] = [
  {
    name: "propose_periodization",
    description:
      "Apresenta uma proposta de periodização (macrociclo) para o especialista revisar. Use SOMENTE após ter discutido e concordado sobre: objetivo principal, duração total em semanas e as fases/mesociclos. NÃO inclua divisão de treino nem exercícios — isso vem depois.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: 'Nome da periodização (ex: "Hipertrofia 12 Semanas")',
        },
        goal: {
          type: "string",
          description: "Objetivo principal (Hipertrofia, Força, Emagrecimento, Condicionamento)",
        },
        durationWeeks: {
          type: "number",
          description: "Duração total em semanas",
        },
        level: {
          type: "string",
          description: "Nível do aluno (Iniciante, Intermediário, Avançado)",
        },
        phases: {
          type: "array",
          description: "Lista de fases/mesociclos da periodização",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nome da fase (ex: Adaptação, Hipertrofia)" },
              weeks: { type: "number", description: "Duração desta fase em semanas" },
              focus: {
                type: "string",
                description: "Foco desta fase (ex: Resistência Muscular, Volume Máximo)",
              },
            },
            required: ["name", "weeks", "focus"],
          },
        },
      },
      required: ["name", "goal", "durationWeeks", "level", "phases"],
    },
  },
  {
    name: "save_periodization",
    description:
      "Salva a periodização no banco de dados após confirmação explícita do especialista. Use SOMENTE quando o especialista aprovar a proposta com palavras como 'ok', 'pode salvar', 'confirma', 'aprovado'.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        goal: { type: "string" },
        durationWeeks: { type: "number" },
        level: { type: "string" },
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              weeks: { type: "number" },
              focus: { type: "string" },
            },
            required: ["name", "weeks", "focus"],
          },
        },
      },
      required: ["name", "goal", "durationWeeks", "level", "phases"],
    },
  },
  {
    name: "propose_workouts",
    description:
      "Apresenta os treinos de uma fase para o especialista revisar e aprovar. Use SOMENTE depois de: (1) a periodização estar salva, (2) ter concordado sobre a divisão, e (3) ter consultado 'query_exercises' — todo `exercise_name` precisa ter vindo de lá, escrito exatamente igual. A aprovação acontece no cartão, não no chat: depois de chamar, diga apenas que a proposta está pronta para revisão.",
    input_schema: {
      type: "object" as const,
      properties: {
        phase_id: {
          type: "string",
          description: "Id da fase (training_plan) a que estes treinos pertencem",
        },
        phase_name: { type: "string", description: "Nome da fase, para o especialista se situar" },
        workouts: {
          type: "array",
          description: "Um item por treino da divisão (ex: Treino A, B, C)",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: 'Ex: "Treino A — Peito e Tríceps"' },
              muscle_group: { type: "string", description: "Grupo principal do treino" },
              difficulty: { type: "string", description: "beginner, intermediate ou advanced" },
              day_of_week: {
                type: "string",
                description: "monday…sunday, se a divisão fixar o dia",
              },
              description: { type: "string" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    exercise_name: {
                      type: "string",
                      description:
                        "Nome EXATO como veio de 'query_exercises'. Nome inventado não é salvo.",
                    },
                    sets: { type: "number" },
                    reps: { type: "string", description: 'Ex: "8-12" ou "10"' },
                    rest_seconds: { type: "number" },
                    notes: { type: "string" },
                  },
                  required: ["exercise_name", "sets", "reps", "rest_seconds"],
                },
              },
            },
            required: ["title", "exercises"],
          },
        },
      },
      required: ["phase_id", "phase_name", "workouts"],
    },
  },
  {
    name: "query_exercises",
    description:
      "Busca exercícios do catálogo. Use antes de sugerir qualquer exercício ao especialista — nunca invente nome que não veio daqui. A resposta traz `total`, então você sabe se está vendo o grupo inteiro.",
    input_schema: {
      type: "object" as const,
      properties: {
        muscle_group: {
          // Os valores reais do banco. A versão anterior sugeria "Ombros" e
          // "Braços", que não existem, e a busca voltava vazia — o coach então
          // afirmava que o catálogo estava vazio.
          type: "string",
          enum: [
            "peito",
            "costas",
            "ombro",
            "biceps",
            "triceps",
            "pernas",
            "gluteos",
            "abdomen",
            "cardio",
          ],
          description:
            "Grupo muscular. Use exatamente um destes valores. Para 'braços', consulte biceps e triceps separadamente.",
        },
        search_term: {
          type: "string",
          description: "Buscar por nome de exercício (ex: Supino, Agachamento)",
        },
      },
    },
  },
];
