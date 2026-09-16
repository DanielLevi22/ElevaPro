import {
  type ConsentPurpose,
  type ConsentStatus,
  dataCurtaDoInstante,
  HEALTH_PURPOSE,
  RANKING_PURPOSE,
  TECHNIQUE_PURPOSE,
} from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';

/**
 * As finalidades que o Student autoriza, e o que dizer de cada uma em Minhas
 * autorizações e na folha de retirar.
 *
 * Separadas de propósito: é o que torna a separação da migration 0041 visível para
 * quem decide — dá para retirar a câmera durante o exercício e continuar com a
 * avaliação física.
 */
export interface Authorization {
  purpose: ConsentPurpose;
  title: string;
  description: string;
}

export const AUTHORIZATIONS: readonly Authorization[] = [
  {
    purpose: HEALTH_PURPOSE,
    title: 'Dados de saúde',
    // O que o Student retira precisa estar escrito aqui, senão ele decide sobre uma
    // lista que não corresponde ao que é coletado.
    description:
      'Avaliação física, anamnese, body scan, passos e calorias, sono e frequência cardíaca de repouso, a prontidão do dia calculada deles, a frequência cardíaca média e o tempo em cada zona das corridas, as refeições registradas, a água do dia e as medidas corporais que você ou seu especialista registram.',
  },
  {
    purpose: TECHNIQUE_PURPOSE,
    title: 'Análise de Técnica',
    description: 'A câmera lê seu corpo durante a série. Nada é gravado.',
  },
  {
    purpose: RANKING_PURPOSE,
    title: 'Ranking',
    description:
      'Seu primeiro nome, a inicial do sobrenome e seus pontos da semana aparecem para outros participantes do ranking.',
  },
];

export interface AuthorizationFooter {
  text: string;
  /**
   * `revoke` só no aceite vigente: nos outros estados nada está sendo tratado.
   * `authorize` na saúde sem aceite, porque a folha de retirar promete que autorizar
   * de novo "leva um toque". A técnica não tem: ela pede na própria tela.
   */
  action: 'revoke' | 'authorize' | null;
}

/**
 * O rodapé de cada finalidade: a data e a versão do aceite, ou por que não há, e a
 * ação que cabe.
 *
 * @example authorizationFooter(AUTHORIZATIONS[0], status) // { text: '28 ago 2026 · versão 1.7', action: 'revoke' }
 */
export function authorizationFooter(
  authorization: Authorization,
  { state, givenAt, policyVersion }: ConsentStatus
): AuthorizationFooter {
  if (state === 'granted' && givenAt) {
    return { text: `${acceptedOn(givenAt)} · versão ${policyVersion}`, action: 'revoke' };
  }
  const asksHere = authorization.purpose.type === HEALTH_PURPOSE.type;
  const action = asksHere ? 'authorize' : null;
  const ask = asksHere ? '' : ' O app pede quando você abrir a tela que precisa.';
  if (state === 'outdated' && givenAt) {
    return {
      text: `Aceita em ${acceptedOn(givenAt)}, na versão ${policyVersion}. A política mudou desde então.${ask}`,
      action,
    };
  }
  return { text: `${state === 'revoked' ? 'Retirada.' : 'Não autorizado.'}${ask}`, action };
}

function acceptedOn(iso: string): string {
  return `${dataCurtaDoInstante(iso)} ${new Date(iso).getFullYear()}`;
}

export interface RevokeEffect {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

/**
 * "O que muda agora" na folha de retirar: só o que de fato para.
 *
 * Retirar a saúde fecha o que consulta o aceite — a leitura do relógio
 * (`healthSync`), a anotação e a FC da sessão (`consentimento.ts`), a água (a RLS da
 * 0052), a medida declarada e a do especialista (a RLS da 0056), o body scan e as
 * rotas de inteligência artificial (`authorizeStudentWithHealthConsent`) e a leitura
 * do especialista (a RLS das tabelas do Art. 11). Treino e refeição não consultam, e
 * o kit prometia que paravam (#308).
 *
 * @example revokeEffects(AUTHORIZATIONS[0], hasSpecialist)
 */
export function revokeEffects(
  authorization: Authorization,
  hasSpecialist: boolean
): RevokeEffect[] {
  return EFFECTS_BY_PURPOSE[authorization.purpose.type] ?? healthRevokeEffects(hasSpecialist);
}

/** O que para em cada finalidade que não depende de haver especialista. */
const EFFECTS_BY_PURPOSE: Record<string, RevokeEffect[]> = {
  [RANKING_PURPOSE.type]: [
    { icon: 'eye-off-outline', text: 'Seu nome sai do placar na hora' },
    { icon: 'barbell-outline', text: 'Seus treinos seguem contando pontos, visíveis só para você' },
  ],
  [TECHNIQUE_PURPOSE.type]: [
    { icon: 'videocam-off-outline', text: 'A câmera deixa de ler seu corpo durante a série' },
    {
      icon: 'barbell-outline',
      text: 'Seus treinos seguem iguais; a análise pede de novo antes de abrir a câmera',
    },
  ],
};

function healthRevokeEffects(hasSpecialist: boolean): RevokeEffect[] {
  return [
    { icon: 'watch-outline', text: 'O relógio para de enviar passos, sono e FC' },
    ...(hasSpecialist
      ? [
          {
            icon: 'eye-off-outline' as const,
            text: 'Seu especialista perde o acesso a estes dados',
          },
        ]
      : []),
    {
      icon: 'create-outline',
      text: 'As anotações, a FC dos treinos, a água do dia e as medidas novas deixam de ser guardadas; os treinos e as refeições continuam registrados',
    },
    {
      icon: 'sparkles-outline',
      text: 'O body scan e as funções de inteligência artificial param',
    },
    { icon: 'eye-outline', text: 'Seu histórico continua visível só para você' },
  ];
}
