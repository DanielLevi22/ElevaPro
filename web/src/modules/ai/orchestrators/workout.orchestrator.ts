import { SPECIALIST_COACH_PROMPT } from "../prompts/specialist.prompts";
import type { SystemBlock, ToolDefinition } from "../providers/types";
import { BODY_SCAN_TOOL } from "../tools/bodyScanTools";
import { WORKOUT_TOOLS } from "../tools/workoutTools";
import { BaseOrchestrator } from "./base.orchestrator";

export class WorkoutOrchestrator extends BaseOrchestrator {
  buildSystemBlocks(contextText: string): SystemBlock[] {
    return [
      { text: SPECIALIST_COACH_PROMPT, cacheControl: true },
      { text: `DADOS DO ALUNO:\n${contextText}`, cacheControl: true },
    ];
  }

  getTools(): ToolDefinition[] {
    return [...WORKOUT_TOOLS, BODY_SCAN_TOOL];
  }
}
