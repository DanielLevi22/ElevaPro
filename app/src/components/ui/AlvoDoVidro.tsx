import { BlurTargetView } from 'expo-blur';
import { createContext, type ReactNode, useContext, useRef } from 'react';
import { Platform, View } from 'react-native';

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
 * ## Por que o fundo entra por prop, e o conteúdo por filho
 *
 * São duas regras que puxam para lados opostos:
 *
 * - a biblioteca nativa (Dimezis BlurView) proíbe o vidro **dentro** do alvo
 *   que ele desfoca — o alvo fica só com o fundo;
 * - o contexto só alcança quem está **dentro** do provedor — os cartões
 *   precisam estar nele.
 *
 * A primeira versão envolvia só o fundo, e os cartões moravam na `ScrollView`
 * irmã, fora do provedor. Medido no aparelho, os vinte vidros da tela inicial
 * recebiam alvo `null`: o `BlurView` nem era montado no Android, e a foto
 * atravessava os cartões nítida. Com o fundo por prop, o provedor cobre os dois
 * e o alvo continua só com o fundo.
 *
 * O fundo fica fora da rolagem, como no kit, onde a foto é `position: absolute`
 * e o conteúdo rola por cima dela.
 *
 * @example
 * <AlvoDoVidro fundo={<FundoDeFoto … />}>
 *   <ScrollView>…cartões de vidro…</ScrollView>
 * </AlvoDoVidro>
 */
const Contexto = createContext<React.RefObject<View | null> | null>(null);

/** O `RenderEffect` do Android chegou na 31; abaixo dela não há blur barato. */
const API_DO_RENDER_EFFECT = 31;

export const METODO_DE_BLUR =
  Platform.OS === 'android' && Number(Platform.Version) >= API_DO_RENDER_EFFECT
    ? ('dimezisBlurViewSdk31Plus' as const)
    : ('none' as const);

interface AlvoDoVidroProps {
  /** O que o vidro desfoca: foto, luz ambiente. Nunca contém vidro. */
  fundo: ReactNode;
  /** O conteúdo com vidro, que recebe o alvo pelo contexto. */
  children: ReactNode;
}

/**
 * O alvo é pintado com a cor da tela, e não transparente.
 *
 * O blur nativo limpa o quadro com o fundo da **janela** antes de desenhar o
 * alvo (`setFrameClearDrawable(decorView.background)`), e o fundo da janela é
 * claro. Onde o alvo não tem nada — abaixo da foto — o vidro desfocava esse
 * claro: medido no aparelho, os cartões abaixo da foto saíram brancos no tema
 * escuro. A cor da tela estava numa View fora do alvo, onde o blur não a vê.
 *
 * E a cor tem de ser **filha**, não estilo do alvo: o `ExpoBlurTargetView`
 * repassa os filhos a uma `BlurTarget` interna, e é ela que o blur captura — o
 * `backgroundColor` do componente fica na casca de fora.
 */
export function AlvoDoVidro({ fundo, children }: AlvoDoVidroProps) {
  const alvo = useRef<View>(null);

  return (
    <Contexto.Provider value={alvo}>
      <BlurTargetView ref={alvo} style={{ position: 'absolute', inset: 0 }}>
        <View className="absolute inset-0 bg-background" />
        {fundo}
      </BlurTargetView>
      {children}
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
