import type { ToolDefinition } from "../providers/types";

export const NUTRITION_TOOLS: ToolDefinition[] = [
  {
    name: "query_foods",
    description:
      "Busca alimentos do catálogo. Use antes de sugerir qualquer alimento — nunca invente nome que não veio daqui, porque item de refeição sem alimento cadastrado não é salvo. Sem `search_term` devolve o catálogo inteiro, que é pequeno: chame assim uma vez e monte o plano com o que voltou.",
    input_schema: {
      type: "object" as const,
      properties: {
        search_term: {
          // Sem filtro por categoria: `foods.category` é NULL em 100% das
          // linhas, e filtrar por ela devolveria zero sempre.
          type: "string",
          description: "Parte do nome do alimento (ex: frango, arroz, aveia). Opcional.",
        },
      },
    },
  },
  {
    name: "propose_diet_plan",
    description:
      "Apresenta as metas do plano alimentar para o especialista revisar. Use SOMENTE após concordar sobre objetivo, tipo de dieta, período e as metas de calorias e macros. Ainda NÃO inclua refeições — isso vem depois, com 'propose_meals'.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: 'Ex: "Cutting 8 semanas"' },
        plan_type: {
          type: "string",
          enum: ["unique", "cyclic"],
          description:
            "'unique' = mesmas refeições todos os dias. 'cyclic' = cardápio por dia da semana. PERGUNTE ao especialista; são estruturas diferentes.",
        },
        start_date: {
          type: "string",
          description: "AAAA-MM-DD. PERGUNTE — não invente nem assuma hoje.",
        },
        duration_weeks: { type: "number", description: "Duração em semanas" },
        target_calories: { type: "number" },
        target_protein: { type: "number", description: "Gramas por dia" },
        target_carbs: { type: "number", description: "Gramas por dia" },
        target_fat: { type: "number", description: "Gramas por dia" },
        notes: { type: "string", description: "Observação para o aluno, opcional" },
      },
      required: [
        "name",
        "plan_type",
        "start_date",
        "duration_weeks",
        "target_calories",
        "target_protein",
        "target_carbs",
        "target_fat",
      ],
    },
  },
  {
    name: "propose_meals",
    description:
      "Apresenta as refeições do plano para o especialista revisar e aprovar. Use SOMENTE depois de o plano estar salvo e de ter consultado 'query_foods' — todo `food_name` precisa ter vindo de lá. A aprovação acontece no cartão, não no chat: depois de chamar, diga apenas que a proposta está pronta.",
    input_schema: {
      type: "object" as const,
      properties: {
        meals: {
          type: "array",
          description: "Uma entrada por refeição do dia (café, almoço, lanche, jantar…)",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: 'Ex: "Café da manhã"' },
              meal_time: { type: "string", description: 'Horário, ex: "07:00"' },
              day_of_week: {
                type: "number",
                description:
                  "0=Dom a 6=Sáb. SÓ para dieta cíclica. Na dieta única, NÃO envie este campo.",
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    food_name: {
                      type: "string",
                      description: "Nome EXATO como veio de 'query_foods'.",
                    },
                    quantity: { type: "number", description: "Quantidade na unidade abaixo" },
                    unit: { type: "string", description: 'Ex: "g", "ml", "unidade"' },
                  },
                  required: ["food_name", "quantity", "unit"],
                },
              },
            },
            required: ["name", "items"],
          },
        },
      },
      required: ["meals"],
    },
  },
];
