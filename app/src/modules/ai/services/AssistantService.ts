import { useAuthStore } from '@/modules/auth/store/authStore';
import { postBff as postBffCompartilhado } from '@/shared/bff';

function getToken(): string {
  const token = useAuthStore.getState().session?.access_token;
  if (!token) throw new Error('Authentication required');
  return token;
}

/**
 * O `?? ''` que morava em `bffBase` era tão mudo quanto o `${undefined}` dos
 * outros serviços: sem a variável, virava caminho relativo — e em React Native
 * não existe origem para completar um caminho relativo. Agora a ausência tem
 * nome (`BffConfigError`) e o helper compartilhado cuida do resto.
 */
async function postBff<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return postBffCompartilhado<T>(path, body, { token: getToken() });
}

export const AssistantService = {
  /**
   * Generates a weekly nutrition adherence summary
   */
  analyzeNutritionAdherence: async (
    _studentName: string,
    adherenceData: {
      totalMeals: number;
      completedMeals: number;
      logs: Record<string, unknown>[];
    },
    planName: string
  ): Promise<string> => {
    const result = await postBff<{ summary: string }>('/api/ai/nutrition/adherence', {
      planName,
      adherenceData,
    });
    return result.summary;
  },
};
