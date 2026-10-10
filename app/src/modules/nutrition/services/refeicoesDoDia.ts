/**
 * A regra mora em `@elevapro/shared` (`mealsOfDay`) desde a #312.
 *
 * Este caminho existe só para a tela antiga do especialista que ainda o importa
 * (`DietPlanViewScreen`). Ela está acima do limite de tamanho e fora de todo
 * lote de vidro até agora; trocar o import obrigaria a reescrevê-la. Apague
 * quando ela for refeita.
 */
export { mealsOfDay as refeicoesDoDia } from '@elevapro/shared';
