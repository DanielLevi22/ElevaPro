import { createHealthService, type EtapaDaAnalise, separarLinhas } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { fetchBff, lerRespostaBff } from '@/shared/bff';
import type { MedidaDaFoto } from '../../../../modules/body-scan-pose';
import { BodyScanResult, CaptureFraming } from '../types/assessment';

const ROTA = '/api/ai/body-scan';

/**
 * Falta de consentimento, separada de falha.
 *
 * São situações opostas para o aluno — uma se resolve com um toque, a outra é
 * um erro — e uma `Error` genérica faria as duas virarem a mesma tela.
 */
export class BodyScanConsentError extends Error {
  constructor() {
    super('Consentimento de dados de saúde não concedido');
    this.name = 'BodyScanConsentError';
  }
}

/**
 * Falta a altura, que é a régua da imagem.
 *
 * Sem ela não há como converter pixel em centímetro, e a alternativa seria o
 * modelo chutar — que é exatamente o que este PRD removeu (`ADR-0010`).
 */
export class BodyScanScaleError extends Error {
  constructor() {
    super('Altura não encontrada — sem régua não há medida');
    this.name = 'BodyScanScaleError';
  }
}

/** Mensagem por código do BFF. Sem entrada, cai no texto genérico. */
const ANALYSIS_MESSAGES: Record<string, string> = {
  response_truncated: 'A análise ficou grande demais e foi cortada. Tente de novo.',
  ai_unavailable: 'O serviço de análise não respondeu. Tente de novo em instantes.',
  invalid_ai_response: 'A análise voltou incompleta. Tente de novo.',
  scale_lookup_failed: 'Não consegui buscar sua altura. Tente de novo.',
  consent_check_failed: 'Não consegui verificar sua autorização. Tente de novo.',
};

/**
 * A análise falhou, com texto que o aluno entende.
 *
 * Guarda o código junto: `AssessmentStatus.ERROR` sozinho fazia a tela mostrar
 * o mesmo estado mudo para quatro causas diferentes.
 */
export class BodyScanAnalysisError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(ANALYSIS_MESSAGES[code] ?? 'Não consegui completar a análise. Tente de novo.');
    this.name = 'BodyScanAnalysisError';
    this.code = code;
  }
}

async function resizeToBase64(uri: string): Promise<string | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], {
      compress: 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    return result.base64 ?? null;
  } catch {
    return null;
  }
}

/**
 * Lê o NDJSON da análise, avisando a cada etapa.
 *
 * O fluxo existe porque a geração leva ~30s e tela parada é indistinguível de
 * travada. Aqui ele vira duas coisas: a etapa, que a tela mostra, e a última
 * linha, que é o resultado.
 *
 * Etapa que não avança é sinal legítimo — significa que o modelo parou de
 * escrever. Não há relógio nenhum inventando movimento.
 */
async function lerFluxo(
  response: Response,
  aoProgredir?: (etapa: EtapaDaAnalise) => void
): Promise<Omit<BodyScanResult, 'id' | 'date' | 'imageUrl'>> {
  const leitor = response.body?.getReader();
  if (!leitor) throw new BodyScanAnalysisError('sem_fluxo');

  const decodificador = new TextDecoder();
  let resto = '';
  let resultado: Omit<BodyScanResult, 'id' | 'date' | 'imageUrl'> | null = null;

  while (true) {
    const { done, value } = await leitor.read();
    if (done) break;

    // `stream: true` porque um caractere multibyte pode chegar partido entre
    // dois pedaços — sem isso, um acento no laudo vira lixo.
    const { linhas, resto: sobra } = separarLinhas(
      resto + decodificador.decode(value, { stream: true })
    );
    resto = sobra;

    for (const linha of linhas) {
      if (linha.t === 'etapa') aoProgredir?.(linha.etapa);
      if (linha.t === 'erro') throw new BodyScanAnalysisError(linha.codigo);
      if (linha.t === 'ok') {
        resultado = linha.payload as Omit<BodyScanResult, 'id' | 'date' | 'imageUrl'>;
      }
    }
  }

  // Fluxo que fecha sem resultado nem erro é conexão cortada no meio — não é o
  // modelo tendo errado, e a mensagem não pode dizer que foi.
  if (!resultado) throw new BodyScanAnalysisError('fluxo_interrompido');

  return resultado;
}

export const AIBodyScanService = {
  analyzeImages: async (
    images: {
      front?: string;
      back?: string;
      side?: string;
    },
    /** Enquadramento usado, para o próximo escaneamento reproduzir. */
    framing?: CaptureFraming | null,
    /**
     * O que o aparelho mediu em cada foto, em pixels e graus.
     *
     * Vai em pixel porque o app não conhece a altura do aluno — o portão de
     * elegibilidade responde se e de onde, nunca quanto. Quem converte para
     * centímetro é o BFF, onde a Escala já foi resolvida (`ADR-0022`).
     */
    medidas?: Partial<Record<'front' | 'back' | 'side', MedidaDaFoto>>,
    /**
     * Os vereditos do portão sobre a captura.
     *
     * Veredito e nunca o histograma: o que o especialista precisa é saber se
     * pondera o número, não reprocessar uma foto que não é guardada.
     */
    qualidade?: {
      backlit: boolean;
      lowLight: boolean;
      blownOut: boolean;
      framingConfirmed: boolean;
    },
    /** Chamado a cada etapa do fluxo, para a tela deixar de parecer travada. */
    aoProgredir?: (etapa: EtapaDaAnalise) => void
  ): Promise<BodyScanResult> => {
    const session = useAuthStore.getState().session;
    const token = session?.access_token;
    if (!token || !session?.user?.id) throw new Error('Authentication required');

    // Checado aqui, antes de a foto ser lida do dispositivo. O BFF checa de
    // novo — ele é a barreira que vale —, mas nesta ordem a imagem nem chega a
    // ser codificada quando não há consentimento (Art. 11, I).
    if (!(await createHealthService(supabase).hasCollectionConsent(session.user.id))) {
      throw new BodyScanConsentError();
    }

    // As três em paralelo. Redimensionar e codificar é trabalho de CPU e disco
    // que não depende de ordem — em série, o aluno esperava a soma das três
    // antes de a requisição sequer começar.
    const codificadas = await Promise.all(
      (['front', 'back', 'side'] as const).map(async (key) => {
        const uri = images[key];

        return uri ? ([key, await resizeToBase64(uri)] as const) : null;
      })
    );

    const base64Images: Record<string, string> = {};
    for (const par of codificadas) {
      if (par?.[1]) base64Images[par[0]] = par[1];
    }

    if (Object.keys(base64Images).length === 0) {
      throw new Error('No valid images to analyze');
    }

    // `fetchBff` e não `fetch`: o `fetch` global segue redirect e faz a tela de
    // login da Vercel chegar aqui como 200 com HTML. Todo o tratamento por
    // código de erro abaixo ficava inalcançável — o desvio acontecia antes,
    // no `json()`, e virava a mensagem genérica de falha.
    const { response, url } = await fetchBff(
      ROTA,
      {
        images: base64Images,
        framing: framing ?? undefined,
        medidas,
        qualidade,
      },
      { token }
    );

    // Erro chega como JSON com código de status, e não pelo fluxo: tudo que
    // pode dar errado antes de o modelo começar — consentimento, Escala,
    // payload — acontece antes de o cabeçalho sair. Só o 200 é NDJSON.
    //
    // A verificação de origem vem ANTES da leitura do status, de propósito. Um
    // 403 com HTML é proteção de plataforma barrando a rota, não o aluno sem
    // consentimento — e ler o status primeiro faria as duas virarem a mesma
    // tela, que é o defeito que este caminho inteiro existe para desfazer.
    if (!response.ok) {
      const corpo = await lerRespostaBff<{ error?: string }>(response, url);

      // 403 do BFF é sempre falta de consentimento nesta rota: o aluno analisa
      // a si mesmo, então não há outro motivo para ele ser barrado.
      if (response.status === 403) throw new BodyScanConsentError();
      if (response.status === 422) throw new BodyScanScaleError();

      // O código do BFF vira mensagem aqui, e não na tela, para as duas rotas
      // de erro (rede e resposta ruim) chegarem no mesmo formato.
      throw new BodyScanAnalysisError(corpo.error ?? `http_${response.status}`);
    }

    // 200 que não é NDJSON é interceptação de plataforma servindo HTML. Passa
    // pelo leitor comum só para estourar com o diagnóstico certo — host e
    // variável de ambiente — em vez de morrer num parse silencioso.
    if (!(response.headers.get('content-type') ?? '').includes('application/x-ndjson')) {
      await lerRespostaBff(response, url);
      throw new BodyScanAnalysisError('resposta_inesperada');
    }

    const data = await lerFluxo(response, aoProgredir);

    if (!data?.metrics) {
      throw new Error('Invalid response from body-scan BFF');
    }

    return {
      ...data,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      imageUrl: images.front ?? '',
    };
  },
};
