import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { Posicao } from '../services/percurso';

/**
 * Desenha o percurso da corrida, sem mapa de fundo.
 *
 * O traçado existe só aqui: as coordenadas chegam da memória da sessão, viram
 * um caminho na tela e morrem junto com ela. Não há serviço de mapas, chave de
 * API nem arquivo de tiles — e não há coluna de coordenada no banco, então esta
 * é a única tela do produto em que o percurso pode ser visto (issue #278).
 */

const LADO = 100;
/** Margem para o traço não encostar na borda do viewBox. */
const FOLGA = 6;

interface TracadoDaCorridaProps {
  pontos: Posicao[];
  className?: string;
}

/**
 * Projeta as posições num quadrado, preservando a forma do percurso.
 *
 * Um grau de longitude encolhe conforme se afasta do equador, então escalar
 * latitude e longitude pelo mesmo fator entortaria o traçado — em Fortaleza o
 * erro é pequeno, no Sul do país é visível. O `cos` da latitude média corrige.
 */
function projetar(pontos: Posicao[]): string {
  const latitudes = pontos.map((p) => p.latitude);
  const longitudes = pontos.map((p) => p.longitude);

  const latMin = Math.min(...latitudes);
  const latMax = Math.max(...latitudes);
  const lonMin = Math.min(...longitudes);
  const lonMax = Math.max(...longitudes);

  const encolhimento = Math.cos(((latMin + latMax) / 2) * (Math.PI / 180));
  const alturaGraus = latMax - latMin;
  const larguraGraus = (lonMax - lonMin) * encolhimento;

  // Escala única para os dois eixos: é o que mantém a proporção. Um percurso
  // reto — de ida e volta pela mesma avenida — tem um dos lados perto de zero, e
  // escalar cada eixo por conta esticaria essa linha até virar um retângulo.
  const util = LADO - FOLGA * 2;
  const escala = util / Math.max(alturaGraus, larguraGraus, Number.EPSILON);

  const sobraX = (util - larguraGraus * escala) / 2;
  const sobraY = (util - alturaGraus * escala) / 2;

  return pontos
    .map((ponto) => {
      const x = FOLGA + sobraX + (ponto.longitude - lonMin) * encolhimento * escala;
      // O eixo Y do SVG cresce para baixo e a latitude cresce para o norte.
      const y = FOLGA + sobraY + (latMax - ponto.latitude) * escala;
      // Uma casa decimal basta num viewBox de 100: a segunda casa é um
      // milésimo do lado do desenho, abaixo de um pixel em qualquer tela.
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function TracadoDaCorrida({ pontos, className }: TracadoDaCorridaProps) {
  // Dois pontos são o mínimo para haver linha. Abaixo disso não há percurso —
  // e um marcador sozinho no meio da tela seria a posição de partida do aluno
  // desenhada sem motivo nenhum.
  if (pontos.length < 2) return null;

  const caminho = projetar(pontos);
  const [inicioX, inicioY] = caminho.split(' ')[0].split(',').map(Number);

  return (
    <View className={className}>
      <Svg viewBox={`0 0 ${LADO} ${LADO}`} width="100%" height="100%">
        <Polyline
          points={caminho}
          fill="none"
          stroke="#FF6B35"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={inicioX} cy={inicioY} r={4} fill="#FF6B35" />
      </Svg>
    </View>
  );
}
