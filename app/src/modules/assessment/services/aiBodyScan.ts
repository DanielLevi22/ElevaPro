import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { BodyScanResult } from '../types/assessment';

const bffUrl = () => `${process.env.EXPO_PUBLIC_API_URL}/api/ai/body-scan`;

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
  analyzeImages: async (images: {
    front?: string;
    back?: string;
    side?: string;
  }): Promise<BodyScanResult> => {
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

    const response = await fetch(bffUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ images: base64Images }),
    });

    // 403 do BFF é sempre falta de consentimento nesta rota: o aluno analisa a
    // si mesmo, então não há outro motivo para ele ser barrado.
    if (response.status === 403) {
      throw new BodyScanConsentError();
    }

    if (!response.ok) {
      throw new Error(`body-scan BFF error: ${response.status}`);
    }

    const data = (await response.json()) as Omit<BodyScanResult, 'id' | 'date' | 'imageUrl'>;

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
