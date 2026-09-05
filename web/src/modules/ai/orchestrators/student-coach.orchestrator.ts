import {
  ANALYTICAL_COACH_PROMPT,
  EXPRESS_COACH_PROMPT,
  STUDENT_COACH_BASE_PROMPT,
} from "../prompts/student-coach.prompts";
import type { AIProvider, SystemBlock, ToolDefinition } from "../providers/types";
import { STUDENT_COACH_TOOLS } from "../tools/studentCoachTools";
import { BaseOrchestrator } from "./base.orchestrator";

type CoachMode = "express" | "analytical";
type PersonaTrack = "beginner" | "returning" | "intermediate" | "advanced";

const TRACK_HINTS: Record<PersonaTrack, string> = {
  beginner:
    "O aluno é iniciante — use linguagem simples, evite jargões, priorize exercícios básicos e segurança.",
  returning:
    "O aluno retornou após pausa — reintroduza gradualmente, pergunte sobre nível atual de condicionamento.",
  intermediate:
    "O aluno tem experiência intermediária — pode usar variações e progressões moderadas.",
  advanced:
    "O aluno é avançado — pode usar técnicas como drop-sets, periodização ondulatória e volumes maiores.",
};

export class StudentCoachOrchestrator extends BaseOrchestrator {
  constructor(
    provider: AIProvider,
    private mode: CoachMode,
    private track: PersonaTrack,
  ) {
    super(provider);
  }

  buildSystemBlocks(contextText: string): SystemBlock[] {
    const modePrompt = this.mode === "express" ? EXPRESS_COACH_PROMPT : ANALYTICAL_COACH_PROMPT;
    return [
      { text: STUDENT_COACH_BASE_PROMPT, cacheControl: true },
      { text: modePrompt, cacheControl: true },
      {
        text: `PERFIL DO ALUNO:\n${contextText}\n\nPERSONA: ${TRACK_HINTS[this.track]}`,
        cacheControl: true,
      },
    ];
  }

  getTools(): ToolDefinition[] {
    return STUDENT_COACH_TOOLS;
  }
}
