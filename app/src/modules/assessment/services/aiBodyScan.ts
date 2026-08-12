import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { BodyScanResult } from '../types/assessment';

const bffUrl = () => `${process.env.EXPO_PUBLIC_API_URL}/api/ai/body-scan`;

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
    const token = useAuthStore.getState().session?.access_token;
    if (!token) throw new Error('Authentication required');

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
