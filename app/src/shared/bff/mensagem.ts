/**
 * Traduz um erro do BFF na frase que o usuário lê — e só nela.
 *
 * ── Duas audiências, duas mensagens ──────────────────────────────────────────
 *
 * O `client.ts` monta diagnóstico para QUEM CONSERTA: nome de variável, host,
 * qual proteção interceptou, o que conferir no painel. Isso é indispensável, e
 * é exatamente o que **não pode** chegar ao aluno.
 *
 * Em 2026-08-29 chegou: a tela do NutriBot exibiu
 * `"elevapro-preview.vercel.app respondeu 500 ... o deployment inteiro fica
 * atrás de login"`. Para o aluno aquilo não é acionável, e ainda entrega host,
 * plataforma e forma da nossa infraestrutura — reconhecimento de graça para
 * quem estiver olhando.
 *
 * Então: o detalhe vai para o log, a frase curta vai para a tela. Em
 * desenvolvimento o detalhe também aparece, porque ali quem lê é quem conserta.
 *
 * ── Por que a função loga, em vez de só formatar ─────────────────────────────
 *
 * Formatar e registrar em chamadas separadas significaria cada tela lembrar das
 * duas — e a tela que esquecesse a segunda perderia o diagnóstico em silêncio.
 * É a forma exata do defeito que este módulo existe para fechar. Uma chamada,
 * as duas audiências servidas.
 */

import { BffConfigError, BffHttpError, BffNotJsonError, BffUnreachableError } from './client';

/** Última linha de defesa: nem `Error` era. */
const GENERICA = 'Não consegui falar com a IA agora. Tente de novo em instantes.';

/** Frases por classe. Nenhuma nomeia host, variável ou plataforma. */
const PARA_O_USUARIO = {
  configuracao:
    'O app não está configurado para falar com o servidor. Atualize para a versão mais recente.',
  rede: 'Não consegui falar com o servidor. Confira sua conexão e tente de novo.',
  servidorForaDoAr:
    'O serviço está fora do ar no momento. Já estamos sabendo — tente de novo em alguns minutos.',
  consentimento: 'Preciso do seu consentimento para usar seus dados de saúde antes de responder.',
  iaIndisponivel: 'A IA não respondeu desta vez. Tente de novo em instantes.',
} as const;

/**
 * O detalhe técnico, para o log e para o desenvolvimento.
 *
 * `console.error` aparece no Metro, no `adb logcat` e nos logs do Expo — é onde
 * quem conserta procura. Nunca na tela de um build de release.
 */
function registrar(erro: unknown): void {
  const detalhe = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro);
  console.error('[bff]', detalhe);
}

/** Em desenvolvimento, quem lê a tela é quem conserta. */
function ehDesenvolvimento(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function frasePublica(erro: unknown): string {
  if (erro instanceof BffConfigError) return PARA_O_USUARIO.configuracao;

  // Rede e "quem respondeu não foi a aplicação" viram a mesma frase para o
  // aluno: em nenhum dos dois há o que ele possa fazer além de tentar de novo,
  // e distinguir só entregaria a topologia.
  if (erro instanceof BffUnreachableError) return PARA_O_USUARIO.rede;
  if (erro instanceof BffNotJsonError) return PARA_O_USUARIO.servidorForaDoAr;

  if (erro instanceof BffHttpError) {
    if (erro.code === 'consent_required') return PARA_O_USUARIO.consentimento;
    // Configuração ausente no servidor é trabalho do time. Para o aluno é
    // "fora do ar" — mandá-lo tentar de novo o faria repetir o que não tem
    // como funcionar, e nomear a causa não o ajudaria em nada.
    if (erro.code === 'server_misconfigured') return PARA_O_USUARIO.servidorForaDoAr;
    if (erro.code === 'ai_unavailable') return PARA_O_USUARIO.iaIndisponivel;
    return GENERICA;
  }

  return GENERICA;
}

/**
 * A frase para o usuário. O diagnóstico vai para o log, não para a tela.
 *
 * @example
 * try { await NutriBotService.sendMessage(...) }
 * catch (erro) { setErro(mensagemDeErroBff(erro)) }
 */
export function mensagemDeErroBff(erro: unknown): string {
  registrar(erro);

  const publica = frasePublica(erro);

  // O detalhe só volta para a tela quando quem lê é quem conserta. Em release
  // esta linha não roda, e é essa a diferença entre depurar e vazar.
  if (ehDesenvolvimento() && erro instanceof Error) {
    return `${publica}\n\n[dev] ${erro.message}`;
  }

  return publica;
}
