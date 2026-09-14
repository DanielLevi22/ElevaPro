// Tipos gerados do banco pelo Supabase CLI (`npm run db:types`). Vivem em
// shared/ porque são a fonte única das duas plataformas: enquanto existiam só
// no web, o cliente do mobile era construído sem genérico e toda consulta de lá
// devolvia `any` — foi assim que as dívidas #7, #10, #40 e #44 nasceram.

// Tabela de permissões do CASL — fonte única das duas plataformas.
export * from "./auth/abilities";
export * from "./data/anamnesisAdaptive";
export * from "./data/anamnesisQuestions";
export type { Database, Json } from "./database/database.types";
export * from "./services/activity.service";
export * from "./services/auth.service";
export * from "./services/bodyScan.service";
export * from "./services/bodyScanDescricao";
export * from "./services/briefing.service";
export * from "./services/diarioAlimentar.service";
export * from "./services/fluxoDoBodyScan";
export * from "./services/gamification.service";
export * from "./services/health.service";
export * from "./services/nutrition.service";
export * from "./services/students.service";
export type { ResumoDaPeriodizacao } from "./services/workouts/resumoDasPeriodizacoes";
export * from "./services/workouts.service";
export * from "./technique/agachamento";
export * from "./technique/diagnostico";
export * from "./technique/fatos";
export * from "./technique/gravacao";
export * from "./technique/varredura";
export * from "./types/activity.types";
export * from "./types/auth.types";
export * from "./types/bodyScan.types";
export * from "./types/briefing.types";
export * from "./types/gamification.types";
export * from "./types/health.types";
export * from "./types/nutrition.types";
export * from "./types/physicalAssessment.types";
export * from "./types/students.types";
export * from "./types/workouts.types";
export * from "./utils/anamnese";
export * from "./utils/calendario";
export * from "./utils/diarioAlimentar";
export * from "./utils/nome";
export * from "./utils/periodizacao";
export * from "./utils/pse";
export * from "./utils/sessao";
export * from "./utils/texto";
export * from "./utils/treino";
