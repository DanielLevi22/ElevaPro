/**
 * Telas onde a barra de navegação não deve aparecer.
 *
 * São as telas antigas de detalhe do treino, que desenham o próprio botão no
 * rodapé: com a TabBar flutuando por cima, o botão ficava atrás dela e não
 * recebia toque. A saída dessas telas é o botão de voltar no topo.
 *
 * As telas do kit de vidro não entram aqui. O kit desenha o detalhe, a sessão
 * e o resumo **com** a tab bar, e o botão fixo acima dela (`BotaoFixoNoRodape`)
 * — esconder a barra deixava a tela com uma faixa vazia embaixo e as
 * proporções diferentes do desenho. Por isso o detalhe só é imersivo fora da
 * visão do aluno, onde a tela ainda é a antiga.
 */

/** Rotas de `/workouts/<algo>` que são navegação normal, não detalhe de treino. */
const WORKOUT_NON_DETAIL_SEGMENTS = new Set(['create', 'select-exercises', 'index', 'execute']);

/** O detalhe do treino que o especialista abre pela ficha do aluno: sempre a tela antiga. */
const DETALHE_PELA_FICHA = /^\/students\/[^/]+\/workouts\/details\/[^/]+$/;

/** O detalhe pelas rotas de `/workouts`: tela antiga para quem monta o plano. */
const DETALHE_EM_TREINOS = /^\/workouts\/details\/[^/]+$/;

/**
 * Diz se a barra de navegação deve sumir no caminho informado.
 *
 * @example
 * isImmersiveRoute('/workouts/details/abc-123', false); // true — o especialista edita
 * isImmersiveRoute('/workouts/details/abc-123', true);  // false — o aluno vê o detalhe do kit
 * isImmersiveRoute('/workouts/execute/abc-123', true);  // false — a sessão do kit tem tab bar
 */
export const isImmersiveRoute = (pathname: string, visaoDoAluno = false): boolean => {
  if (DETALHE_PELA_FICHA.test(pathname)) return true;
  if (visaoDoAluno) return false;
  if (DETALHE_EM_TREINOS.test(pathname)) return true;

  // `/workouts/<id>` também abre o detalhe, mas o padrão colide com as rotas
  // fixas do mesmo nível — por isso a checagem explícita.
  const bareWorkout = /^\/workouts\/([^/]+)$/.exec(pathname);
  return bareWorkout !== null && !WORKOUT_NON_DETAIL_SEGMENTS.has(bareWorkout[1]);
};
