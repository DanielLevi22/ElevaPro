import { DEFAULT_PREFERENCES, type NoticePreferences } from '@elevapro/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';

interface NoticePreferencesState extends NoticePreferences {
  update: (change: Partial<NoticePreferences>) => void;
}

/**
 * As escolhas da pessoa em Avisos (E5). Ficam só no aparelho, como os próprios
 * avisos, que são locais: nada daqui precisa estar no servidor.
 *
 * @example useNoticePreferencesStore.getState().update({ hideDetails: false });
 */
export const useNoticePreferencesStore = create<NoticePreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      update: (change) => set(change),
    }),
    {
      name: 'notice-preferences',
      storage: createJSONStorage(() => armazenamentoNoAparelho('notice-preferences')),
    }
  )
);

/** As preferências sem as ações do store. */
export function currentPreferences(): NoticePreferences {
  const { update: _update, ...preferences } = useNoticePreferencesStore.getState();
  return preferences;
}
