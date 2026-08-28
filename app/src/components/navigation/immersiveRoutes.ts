/**
 * Telas onde a barra de navegação não deve aparecer.
 *
 * São fluxos imersivos: o rodapé é da tela, não da navegação — "Iniciar
 * Treino", barra de descanso, botão de finalizar. Com a TabBar flutuando por
 * cima, o botão da tela ficava desenhado atrás dela e não recebia toque; e
 * empurrar o botão para cima da barra deixava os dois disputando o mesmo canto.
 *
 * A saída dessas telas é o botão de voltar/fechar no topo, não a troca de aba.
 */

/** Rotas de `/workouts/<algo>` que são navegação normal, não detalhe de treino. */
const WORKOUT_NON_DETAIL_SEGMENTS = new Set([
  'create',
  'create-periodization',
  'select-exercises',
  'index',
]);

const IMMERSIVE_PATTERNS: RegExp[] = [
  // Detalhe do treino, nas três rotas que renderizam WorkoutDetailsScreen.
  /^\/workouts\/details\/[^/]+$/,
  /^\/students\/[^/]+\/workouts\/details\/[^/]+$/,
  // Execução do treino.
  /^\/workouts\/execute\/[^/]+$/,
];

/**
 * Diz se a barra de navegação deve sumir no caminho informado.
 *
 * @example
 * isImmersiveRoute('/workouts/execute/abc-123'); // true
 * isImmersiveRoute('/workouts/create');          // false
 */
export const isImmersiveRoute = (pathname: string): boolean => {
  if (IMMERSIVE_PATTERNS.some((pattern) => pattern.test(pathname))) return true;

  // `/workouts/<id>` também abre o detalhe, mas o padrão colide com as rotas
  // fixas do mesmo nível — por isso a checagem explícita.
  const bareWorkout = /^\/workouts\/([^/]+)$/.exec(pathname);
  return bareWorkout !== null && !WORKOUT_NON_DETAIL_SEGMENTS.has(bareWorkout[1]);
};
