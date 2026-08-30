import PostureAnalysis from '@/modules/assessment/screens/PostureAnalysis';

/**
 * A análise corporal do próprio aluno.
 *
 * Existe porque a rota gêmea vive em `(tabs)/students/`, que é a aba do
 * especialista — `href: null` para quem é `student` ou `member`. O aluno
 * terminava a análise e era mandado para dentro de uma aba que não existe para
 * ele: a navegação não acontecia, e como a tela de processamento não tinha
 * estado de sucesso, ele ficava no "Analisando..." para sempre.
 *
 * A análise é sempre do próprio chamador — o BFF usa `authorizeStudent` e
 * deriva o id do token —, então este é o destino certo de todo escaneamento.
 */
export default function StudentPostureAnalysisRoute() {
  return <PostureAnalysis />;
}
