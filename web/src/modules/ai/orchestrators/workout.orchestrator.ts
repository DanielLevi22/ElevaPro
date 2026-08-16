import { SPECIALIST_COACH_PROMPT } from "../prompts/specialist.prompts";
import type { SystemBlock, ToolDefinition } from "../providers/types";
import { BODY_SCAN_TOOL } from "../tools/bodyScanTools";
import { WORKOUT_TOOLS } from "../tools/workoutTools";
import type { PeriodizationProposal, SseEvent } from "../types";
import { BaseOrchestrator, type ToolCallHandler } from "./base.orchestrator";

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

  // propose_periodization yields a proposal SSE event and returns a static string.
  // All other tools delegate to the external onToolCall handler (DB ops in the route).
  protected async handleTool(
    name: string,
    input: unknown,
    onToolCall: ToolCallHandler | undefined,
  ): Promise<{ sseEvents: SseEvent[]; result: string }> {
    if (name === "propose_periodization") {
      return {
        sseEvents: [{ type: "proposal", data: input as PeriodizationProposal }],
        result: "Proposta apresentada ao especialista. Aguardando revisão e aprovação.",
      };
    }
    return super.handleTool(name, input, onToolCall);
  }
}
