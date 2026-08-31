import { ROUTES } from '@/navigation/types';
import { getBff } from '@/shared/bff';

const ROTA = '/api/ai/body-scan/eligibility';

/** Por que o aluno não pode escanear. Espelha o que o BFF devolve. */
export type MotivoDoPortao = 'consentimento' | 'sem_anamnese' | 'altura_invalida' | 'peso_invalido';

export interface Elegibilidade {
  podeEscanear: boolean;
  fonte?: 'assessment' | 'anamnese';
  motivo?: MotivoDoPortao;
}

/**
 * O aluno pode escanear? — perguntado antes de abrir a câmera.
 *
 * Sem isto o aluno tirava três fotos, esperava a análise e só então descobria
 * que faltava a altura. A pergunta não traz o valor da medida: o app precisa
 * saber se pode e de onde viria, nunca quanto.
 */
export async function consultarElegibilidade(token: string): Promise<Elegibilidade> {
  return getBff<Elegibilidade>(ROTA, { token });
}

export interface AvisoDoPortao {
  titulo: string;
  texto: string;
  /** O que o botão diz. Nunca vazio: motivo sem ação é beco. */
  rotulo: string;
  /**
   * Para onde o botão leva, ou `null` quando resolve na própria tela.
   *
   * Tipado pela própria constante, e não como `string`: com `string` a tela
   * precisaria de um cast no `router.push`, e cast em rota faz destino
   * inexistente deixar de ser erro de compilação e virar botão que não faz
   * nada — sem erro, sem log, sem sintoma.
   */
  destino: typeof ROUTES.STUDENT.ANAMNESIS | null;
}

/**
 * O que a tela diz, por motivo.
 *
 * Cada um leva a uma ação diferente. "Responda a anamnese" e "corrija sua
 * altura" são caminhos distintos, e um texto só para os dois manda responder de
 * novo quem já respondeu — a versão educada do "tente de novo" que abriu a
 * issue, e igualmente inútil.
 */
export function avisoDoPortao(motivo: MotivoDoPortao): AvisoDoPortao {
  switch (motivo) {
    case 'consentimento':
      return {
        titulo: 'Falta a sua autorização',
        // As duas metades são separadas de propósito. O texto da `1.1` falava
        // só de "as imagens", e a partir do portão de captura isso passou a
        // cobrir duas coisas muito diferentes: o que é analisado no aparelho e
        // morre lá, e o que sai para um terceiro. Não armazenar não é não
        // tratar (Art. 5º, X), e o aluno autoriza sabendo qual é qual.
        texto: [
          'Para analisar suas fotos preciso da sua autorização para tratar dados de saúde.',
          'No seu aparelho: enquanto a tela da câmera fica aberta, ela analisa a imagem a cada dois segundos para te dizer como se posicionar. Essas imagens não são gravadas nem enviadas — existem só naquele instante, dentro do celular.',
          'Fora do seu aparelho: as três fotos que você tira vão para um serviço de inteligência artificial externo e não são guardadas — só o resultado e as medidas ficam salvos.',
        ].join('\n\n'),
        rotulo: 'Autorizar',
        // Resolve aqui mesmo: o aluno autoriza e segue sem sair da tela.
        destino: null,
      };
    case 'sem_anamnese':
      return {
        titulo: 'Antes, a anamnese',
        texto:
          'A análise é calibrada pela sua altura e pelo seu peso. Responda a anamnese uma vez e eu consigo calcular — leva poucos minutos.',
        rotulo: 'Responder anamnese',
        destino: ROUTES.STUDENT.ANAMNESIS,
      };
    case 'altura_invalida':
      return {
        titulo: 'Confira a sua altura',
        texto:
          'A altura que está na sua anamnese não parece certa, e é ela que dá escala à foto. Corrija e volte aqui.',
        rotulo: 'Corrigir na anamnese',
        destino: ROUTES.STUDENT.ANAMNESIS,
      };
    case 'peso_invalido':
      return {
        titulo: 'Confira o seu peso',
        texto:
          'O peso que está na sua anamnese não parece certo, e ele entra no cálculo. Corrija e volte aqui.',
        rotulo: 'Corrigir na anamnese',
        destino: ROUTES.STUDENT.ANAMNESIS,
      };
  }
}
