import { colorScheme } from 'nativewind';
import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * O que a pessoa escolheu nas configurações. `sistema` é o padrão: quem nunca
 * abriu a opção continua vendo o tema do aparelho, como sempre viu.
 */
export type PreferenciaDeTema = 'sistema' | 'claro' | 'escuro';

const storage = createMMKV();

const clientStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

/** `sistema` tem nomes diferentes dos outros dois entre nós e o NativeWind. */
const ESQUEMA_DO_NATIVEWIND = {
  sistema: 'system',
  claro: 'light',
  escuro: 'dark',
} as const;

type EstadoDoTema = {
  preferencia: PreferenciaDeTema;
  escolher: (preferencia: PreferenciaDeTema) => void;
};

/**
 * Guarda a preferência de tema e a empurra para o NativeWind.
 *
 * O store não resolve cor — quem resolve é `useCores`, lendo o esquema que o
 * NativeWind está aplicando. Assim existe um só lugar decidindo qual tema vale,
 * e não dois que podem discordar.
 *
 * @example
 * const { preferencia, escolher } = useTemaStore();
 * <Switch value={preferencia === 'escuro'} onValueChange={() => escolher('escuro')} />
 */
export const useTemaStore = create<EstadoDoTema>()(
  persist(
    (set) => ({
      preferencia: 'sistema',
      escolher: (preferencia) => {
        colorScheme.set(ESQUEMA_DO_NATIVEWIND[preferencia]);
        set({ preferencia });
      },
    }),
    {
      name: 'tema-storage',
      storage: createJSONStorage(() => clientStorage),
      partialize: (state) => ({ preferencia: state.preferencia }),
      /**
       * O NativeWind nasce em `system` a cada boot. Sem reaplicar aqui, quem
       * escolheu claro num aparelho no escuro via a escolha ser ignorada até
       * mexer na opção de novo.
       */
      onRehydrateStorage: () => (estado) => {
        if (estado) colorScheme.set(ESQUEMA_DO_NATIVEWIND[estado.preferencia]);
      },
    }
  )
);
