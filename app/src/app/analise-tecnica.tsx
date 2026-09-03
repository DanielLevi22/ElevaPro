import { AnaliseDeTecnicaScreen } from '@/technique';

/**
 * Rota da Análise de Técnica.
 *
 * Sem `__DEV__`: a fase 2 da #194 entregou o consentimento próprio da
 * finalidade (`TECNICA`), que era o que o portão de desenvolvimento estava
 * substituindo enquanto não existia. Agora quem barra é o consentimento, que é
 * a barreira certa — a de desenvolvimento protegia por ausência de caminho.
 */
export default function AnaliseTecnica() {
  return <AnaliseDeTecnicaScreen />;
}
