import * as FileSystem from 'expo-file-system/legacy';
import { fetchBff, lerRespostaBff } from '@/shared/bff';

export interface FoodAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

const ROTA = '/api/ai/student/scan-food';

export const FoodRecognitionService = {
  analyzeFoodImage: async (uri: string, authToken: string): Promise<FoodAnalysisResult> => {
    const imageBase64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

    const { response, url } = await fetchBff(
      ROTA,
      { imageBase64, mimeType: 'image/jpeg' },
      { token: authToken }
    );

    // Confere que quem respondeu foi a aplicação antes de olhar o status: um
    // 200 com HTML de tela de login passava por `response.ok` e só quebrava no
    // `json()`, três camadas abaixo da causa.
    const dados = await lerRespostaBff<FoodAnalysisResult>(response, url);

    if (!response.ok) {
      throw new Error(`scan-food BFF error: ${response.status}`);
    }

    return dados;
  },
};
