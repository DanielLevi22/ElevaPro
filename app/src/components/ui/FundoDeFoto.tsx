import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { Image, type ImageSourcePropType, useWindowDimensions, View } from 'react-native';
import { comOpacidade, useCores } from '@/shared/design';

/**
 * A faixa de foto no topo, com o véu que a funde ao fundo da tela.
 *
 * O véu **não é cor nova**: é a própria cor de fundo em opacidades crescentes,
 * terminando opaca para o conteúdo abaixo emendar sem costura. Isso vale nos
 * dois fluxos do kit, e é o que permite um componente só.
 *
 * O que muda entre eles é a rampa, e ela é por tema — no claro a foto precisa
 * recuar mais para texto escuro passar contraste, e por isso o kit dá a ela
 * **mais altura** no claro do que no escuro.
 *
 * @example
 * <FundoDeFoto imagem={require('…/back.jpg')} receita={RECEITA_DA_HOME} />
 */
type Parada = { opacidade: number; posicao: number };

export type ReceitaDoFundo = {
  /** Fração da altura da tela, por tema. */
  fracao: { claro: number; escuro: number };
  veu: { claro: Parada[]; escuro: Parada[] };
};

/**
 * Auth: faixa de 300 em 800, véu de 45% a 55% e então opaco.
 * O conteúdo fica na metade de baixo da faixa, com o wordmark em cima.
 */
export const RECEITA_DA_AUTENTICACAO: ReceitaDoFundo = {
  fracao: { claro: 300 / 800, escuro: 300 / 800 },
  veu: {
    escuro: [
      { opacidade: 0.45, posicao: 0 },
      { opacidade: 0.55, posicao: 0.55 },
      { opacidade: 1, posicao: 1 },
    ],
    claro: [
      { opacidade: 0.6, posicao: 0 },
      { opacidade: 0.72, posicao: 0.55 },
      { opacidade: 1, posicao: 1 },
    ],
  },
};

/**
 * Home: faixa mais alta, porque o conteúdo sobre a foto é mais — cabeçalho,
 * anel e a frase do dia. No claro são 430 em 820 contra 400 no escuro.
 */
export const RECEITA_DA_HOME: ReceitaDoFundo = {
  fracao: { claro: 430 / 820, escuro: 400 / 820 },
  veu: {
    escuro: [
      { opacidade: 0.55, posicao: 0 },
      { opacidade: 0.55, posicao: 0.42 },
      { opacidade: 1, posicao: 1 },
    ],
    claro: [
      { opacidade: 0.62, posicao: 0 },
      { opacidade: 0.7, posicao: 0.4 },
      { opacidade: 0.9, posicao: 0.72 },
      { opacidade: 1, posicao: 1 },
    ],
  },
};

interface FundoDeFotoProps {
  imagem: ImageSourcePropType;
  receita: ReceitaDoFundo;
}

export function FundoDeFoto({ imagem, receita }: FundoDeFotoProps) {
  const cores = useCores();
  const { colorScheme } = useColorScheme();
  const tema = colorScheme === 'dark' ? 'escuro' : 'claro';

  const { height: alturaDaTela } = useWindowDimensions();
  // Fração da **tela**, e não do pai: no `Hero` o pai tem a altura do conteúdo,
  // e uma classe `h-[%]` mediria contra ele. Por isso é medida, e não classe.
  const altura = Math.round(alturaDaTela * receita.fracao[tema]);
  const paradas = receita.veu[tema];

  return (
    <View className="absolute left-0 right-0 top-0" style={{ height: altura }}>
      <Image source={imagem} resizeMode="cover" className="h-full w-full" />
      <LinearGradient
        // O `LinearGradient` do Expo exige tupla de duas cores no tipo, e um
        // `map` devolve `string[]`. A receita sempre tem três paradas ou mais,
        // então a asserção descreve o que é verdade e não esconde um risco.
        colors={
          paradas.map((p) => comOpacidade(cores.background, p.opacidade)) as [
            string,
            string,
            string,
          ]
        }
        locations={paradas.map((p) => p.posicao) as [number, number, number]}
        className="absolute inset-0"
      />
    </View>
  );
}
