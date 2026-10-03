import { TECHNIQUE_RELEASED } from '@/shared/technique/release';
import { AnaliseDeTecnicaScreen, TecnicaEmDesenvolvimento } from '@/technique';

/**
 * Rota da Análise de Técnica.
 *
 * Sem `__DEV__`: a fase 2 da #194 entregou o consentimento próprio da
 * finalidade (`TECHNIQUE_PURPOSE`), que era o que o portão de desenvolvimento estava
 * substituindo enquanto não existia. Agora quem barra é o consentimento, que é
 * a barreira certa — a de desenvolvimento protegia por ausência de caminho.
 *
 * Enquanto a análise está em desenvolvimento, a rota mostra o aviso
 * (`TECHNIQUE_RELEASED`): nem a câmera nem o pedido de autorização abrem.
 */
export default function AnaliseTecnica() {
  return TECHNIQUE_RELEASED ? <AnaliseDeTecnicaScreen /> : <TecnicaEmDesenvolvimento />;
}
