import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { PontoDaPose } from '../../../../modules/technique-spike';

/**
 * O boneco de palito por cima do preview.
 *
 * Existe para responder à única pergunta que o aluno faz antes de confiar no
 * contador: "ele está me vendo?". Sem o esqueleto, uma leitura errada e uma
 * câmera mal posicionada parecem a mesma coisa — a tela parada.
 *
 * **Nada aqui é gravado.** Os pontos chegam do quadro atual e são substituídos
 * pelos do próximo.
 */

/** Os pares do BlazePose que interessam ao agachamento visto de lado. */
const OSSOS: [number, number][] = [
  [11, 13], // ombro-cotovelo
  [13, 15], // cotovelo-punho
  [11, 23], // ombro-quadril (tronco)
  [23, 25], // quadril-joelho (coxa)
  [25, 27], // joelho-tornozelo (canela)
  [27, 31], // tornozelo-pé
  [12, 14],
  [14, 16],
  [12, 24],
  [24, 26],
  [26, 28],
  [28, 32],
  [11, 12], // ombros
  [23, 24], // quadris
];

/**
 * Abaixo disto o ponto é chute do modelo, não observação.
 *
 * Desenhar o que ele extrapolou faria o aluno confiar num membro que a câmera
 * não viu — e é justamente por não confiar nesses pontos que o julgador cala.
 */
const VISIVEL = 0.5;

interface EsqueletoProps {
  pontos: PontoDaPose[];
  /** Tamanho do quadro em pixels, para converter a coordenada normalizada. */
  largura: number;
  altura: number;
  /** Verde quando o julgador está lendo; cinza quando ele congelou. */
  lendo: boolean;
}

export function Esqueleto({ pontos, largura, altura, lendo }: EsqueletoProps) {
  if (pontos.length === 0 || largura === 0) return null;

  const cor = lendo ? '#34d399' : '#9ca3af';
  const x = (p: PontoDaPose) => p.x * largura;
  const y = (p: PontoDaPose) => p.y * altura;
  const visivel = (i: number) => pontos[i] !== undefined && pontos[i].visibility >= VISIVEL;

  // O índice do landmark é a identidade dele — 23 é o quadril esquerdo em todo
  // quadro —, então ele viaja junto em vez de sair do laço de renderização.
  const visiveis = pontos
    .map((ponto, indice) => ({ ponto, indice }))
    .filter(({ indice }) => visivel(indice));

  return (
    <View className="absolute inset-0" pointerEvents="none">
      <Svg height={altura} width={largura}>
        {OSSOS.filter(([a, b]) => visivel(a) && visivel(b)).map(([a, b]) => (
          <Line
            key={`${a}-${b}`}
            stroke={cor}
            strokeWidth={3}
            x1={x(pontos[a])}
            x2={x(pontos[b])}
            y1={y(pontos[a])}
            y2={y(pontos[b])}
          />
        ))}
        {visiveis.map(({ ponto, indice }) => (
          <Circle cx={x(ponto)} cy={y(ponto)} fill={cor} key={indice} r={4} />
        ))}
      </Svg>
    </View>
  );
}
