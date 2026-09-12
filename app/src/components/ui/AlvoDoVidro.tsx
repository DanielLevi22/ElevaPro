import { BlurTargetView } from 'expo-blur';
import { createContext, type ReactNode, useContext, useRef } from 'react';
import { Platform, type View } from 'react-native';

/**
 * O que o vidro desfoca por trás de si, no Android.
 *
 * ## Por que isto existe
 *
 * No iOS o `BlurView` desfoca o que estiver atrás dele, e pronto. No Android
 * não: o `expo-blur` nasce com `blurMethod: 'none'` e os dois métodos reais
 * **exigem** a prop `blurTarget` — um `ref` para o `BlurTargetView` que envolve
 * o conteúdo a ser desfocado. Sem ele o próprio pacote avisa e volta para
 * `'none'`.
 *
 * Foi assim que o vidro ficou sem blur no Android sem ninguém perceber: o
 * `BlurView` estava lá, e não desfocava nada.
 *
 * ## Por que fica fora da rolagem
 *
 * O alvo envolve o fundo da tela, que no kit é `position: absolute` — a foto
 * não rola, o conteúdo rola por cima dela. Além de ser o desenho, é o que
 * permite o blur: alvo dentro de `ScrollView` muda a cada frame de rolagem.
 *
 * @example
 * <AlvoDoVidro>
 *   <FundoDeFoto … />
 * </AlvoDoVidro>
 * <ScrollView>…cartões de vidro…</ScrollView>
 */
const Contexto = createContext<React.RefObject<View | null> | null>(null);

/** O `RenderEffect` do Android chegou na 31; abaixo dela não há blur barato. */
const API_DO_RENDER_EFFECT = 31;

export const METODO_DE_BLUR =
  Platform.OS === 'android' && Number(Platform.Version) >= API_DO_RENDER_EFFECT
    ? ('dimezisBlurViewSdk31Plus' as const)
    : ('none' as const);

export function AlvoDoVidro({ children }: { children: ReactNode }) {
  const alvo = useRef<View>(null);

  return (
    <Contexto.Provider value={alvo}>
      <BlurTargetView ref={alvo} style={{ position: 'absolute', inset: 0 }}>
        {children}
      </BlurTargetView>
    </Contexto.Provider>
  );
}

/**
 * O alvo da tela atual, ou `null` quando a tela não declara um.
 *
 * `null` não é erro: tela sem fundo para desfocar — um formulário sobre cor
 * chapada — não precisa de alvo, e ali o vidro é só o gradiente e a borda.
 */
export function useAlvoDoVidro(): React.RefObject<View | null> | null {
  return useContext(Contexto);
}
