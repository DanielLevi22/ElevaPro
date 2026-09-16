/**
 * A regra mora em `@elevapro/shared` (`mealsOfDay`) desde a #312.
 *
 * Este caminho existe só para as duas telas antigas que ainda o importam, a do
 * especialista (`DietDetailsScreen`) e a do member (`StudentNutritionScreen`). As
 * duas estão acima do limite de tamanho e fora de todo lote de vidro até agora;
 * trocar o import obrigaria a reescrevê-las. Apague quando elas forem refeitas.
 */
export { mealsOfDay as refeicoesDoDia } from '@elevapro/shared';
