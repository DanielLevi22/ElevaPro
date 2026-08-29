import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { fetchBff, lerRespostaBff } from '@/shared/bff';
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

export const AIBodyScanService = {
  analyzeImages: async (
    images: {
      front?: string;
      back?: string;
      side?: string;
    },
    /** Só quando o aluno ainda não tem avaliação física registrada. */
    informed?: { heightCm: number; weightKg?: number },
    /** Enquadramento usado, para o próximo escaneamento reproduzir. */
    framing?: CaptureFraming | null
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

    const base64Images: Record<string, string> = {};
    for (const key of ['front', 'back', 'side'] as const) {
      const uri = images[key];
      if (!uri) continue;
      const b64 = await resizeToBase64(uri);
      if (b64) base64Images[key] = b64;
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
        heightCm: informed?.heightCm,
        weightKg: informed?.weightKg,
        framing: framing ?? undefined,
      },
      { token }
    );

    // A verificação de origem vem ANTES da leitura do status, de propósito. Um
    // 403 com HTML é proteção de plataforma barrando a rota, não o aluno sem
    // consentimento — e ler o status primeiro faria as duas virarem a mesma
    // tela, que é o defeito que este caminho inteiro existe para desfazer.
    // Toda resposta desta rota é JSON, inclusive os erros (ver route.ts).
    const corpo = await lerRespostaBff<
      Partial<Omit<BodyScanResult, 'id' | 'date' | 'imageUrl'>> & { error?: string }
    >(response, url);

    // 403 do BFF é sempre falta de consentimento nesta rota: o aluno analisa a
    // si mesmo, então não há outro motivo para ele ser barrado.
    if (response.status === 403) {
      throw new BodyScanConsentError();
    }

    if (response.status === 422) {
      throw new BodyScanScaleError();
    }

    if (!response.ok) {
      // O código do BFF vira mensagem aqui, e não na tela, para as duas rotas
      // de erro (rede e resposta ruim) chegarem no mesmo formato.
      throw new BodyScanAnalysisError(corpo.error ?? `http_${response.status}`);
    }

    const data = corpo as Omit<BodyScanResult, 'id' | 'date' | 'imageUrl'>;

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
