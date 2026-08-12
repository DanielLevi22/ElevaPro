import { NUTRITION_COACH_PROMPT } from "../prompts/nutrition.prompts";
import type { SystemBlock, ToolDefinition } from "../providers/types";
import { NUTRITION_TOOLS } from "../tools/nutritionTools";
import { BaseOrchestrator } from "./base.orchestrator";

/**
 * Coach de nutrição do especialista.
 *
 * Herda da base o loop de ferramenta, os eventos de atividade
 * (`tool_start`/`tool_end`) e o tratamento de erro — resolvidos e testados no
 * coach de treino. Aqui só mudam o prompt e as ferramentas.
 *
 * O contexto do aluno chega pronto de `loadStudentContext`, que já verifica
 * `student_consents` antes de ler qualquer dado de saúde e não inclui o nome do
 * titular. Ver o parecer em `docs/PRDs/ai-nutrition-coach.md`.
 */
export class NutritionOrchestrator extends BaseOrchestrator {
  buildSystemBlocks(contextText: string): SystemBlock[] {
    return [
      { text: NUTRITION_COACH_PROMPT, cacheControl: true },
      { text: `DADOS DO ALUNO:\n${contextText}`, cacheControl: true },
    ];
  }

  getTools(): ToolDefinition[] {
    return NUTRITION_TOOLS;
  }
}
