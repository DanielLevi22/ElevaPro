import { Dimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

/**
 * O corpo desenhado sobre a foto — esqueleto e zonas musculares.
 *
 * Saiu da tela de análise postural, que passava de 700 linhas e é justamente o
 * tipo de arquivo que o `check-file-size` cobra de quem o toca. A extração veio
 * depois dos testes de caracterização da tela, não antes: refatorar UI sem rede
 * troca dívida conhecida por regressão desconhecida.
 *
 * Recebe a vista por prop em vez de ler do fechamento — é o que permite testá-lo
 * sem montar a tela inteira.
 */

const { width } = Dimensions.get('window');
const PHOTO_ASPECT_RATIO = 4 / 3;
const PHOTO_WIDTH = width - 48;
const PHOTO_HEIGHT = PHOTO_WIDTH * PHOTO_ASPECT_RATIO;

// Figura de referência, simétrica de propósito.
//
// Antes as coordenadas descreviam uma postura "levemente escoliótica" — ombro
// direito mais baixo, quadril deslocado —, desenhada igual para todo aluno. Um
// diagrama genérico pode ser genérico; o que ele não pode é afirmar uma
// assimetria que ninguém mediu naquele corpo.
const JOINTS = {
  nose: { x: 0.5, y: 0.15 },
  leftShoulder: { x: 0.35, y: 0.25 },
  rightShoulder: { x: 0.65, y: 0.25 },
  leftElbow: { x: 0.3, y: 0.45 },
  rightElbow: { x: 0.7, y: 0.45 },
  leftWrist: { x: 0.25, y: 0.65 },
  rightWrist: { x: 0.75, y: 0.65 },
  leftHip: { x: 0.4, y: 0.6 },
  rightHip: { x: 0.6, y: 0.6 },
  leftKnee: { x: 0.38, y: 0.8 },
  rightKnee: { x: 0.62, y: 0.8 },
  leftAnkle: { x: 0.38, y: 0.95 },
  rightAnkle: { x: 0.62, y: 0.95 },
};

// Analysis Data for each view

export const BodyDiagram = ({ vista }: { vista: string }) => {
  const toPixel = (ratio: number, isX: boolean) => ratio * (isX ? PHOTO_WIDTH : PHOTO_HEIGHT);

  // Helper to draw bone
  const Bone = ({
    start,
    end,
    color = 'rgba(255,255,255,0.2)',
  }: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    color?: string;
  }) => (
    <Line
      x1={toPixel(start.x, true)}
      y1={toPixel(start.y, false)}
      x2={toPixel(end.x, true)}
      y2={toPixel(end.y, false)}
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  );

  // Helper to draw joint
  const Joint = ({
    pos,
    color = 'white',
    radius = 2.5,
  }: {
    pos: { x: number; y: number };
    color?: string;
    radius?: number;
  }) => (
    <Circle
      cx={toPixel(pos.x, true)}
      cy={toPixel(pos.y, false)}
      r={radius}
      fill={color}
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="0.5"
    />
  );

  // Muscle Volume Highlights (Circles/Ellipses loosely representing muscle groups)
  const MuscleZone = ({
    cx,
    cy,
    rx,
    ry: _ry,
    color = 'rgba(16, 185, 129, 0.2)',
    stroke: _stroke = 'transparent',
  }: {
    cx: number;
    cy: number;
    rx: number;
    ry?: number;
    color?: string;
    stroke?: string;
  }) => (
    <Circle
      cx={toPixel(cx, true)}
      cy={toPixel(cy, false)}
      r={toPixel(rx, true)} // keeping simple with circle for now
      fill={color}
      stroke={_stroke}
      strokeWidth="1"
      strokeDasharray={_stroke !== 'transparent' ? '4, 4' : undefined}
    />
  );

  return (
    <Svg
      height={PHOTO_HEIGHT}
      width={PHOTO_WIDTH}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Muscle Volume Analysis Overlay (Concept) */}
      {vista === 'front' && (
        <>
          {/* Chest Area */}
          <MuscleZone
            cx={0.5}
            cy={0.28}
            rx={0.15}
            color="rgba(59, 130, 246, 0.1)"
            stroke="rgba(59, 130, 246, 0.3)"
          />
          {/* Shoulder - Disproportion Highlight */}
          <MuscleZone
            cx={0.65}
            cy={0.28}
            rx={0.06}
            color="rgba(245, 158, 11, 0.2)"
            stroke="rgba(245, 158, 11, 0.6)"
          />
        </>
      )}

      {/* Connection Lines - Base Skeleton (Very Subtle) */}
      <Bone start={JOINTS.leftShoulder} end={JOINTS.rightShoulder} />
      <Bone start={JOINTS.leftShoulder} end={JOINTS.leftElbow} />
      <Bone start={JOINTS.leftElbow} end={JOINTS.leftWrist} />
      <Bone start={JOINTS.rightShoulder} end={JOINTS.rightElbow} />
      <Bone start={JOINTS.rightElbow} end={JOINTS.rightWrist} />
      <Bone start={JOINTS.leftShoulder} end={JOINTS.leftHip} />
      <Bone start={JOINTS.rightShoulder} end={JOINTS.rightHip} />
      <Bone start={JOINTS.leftHip} end={JOINTS.rightHip} />
      <Bone start={JOINTS.leftHip} end={JOINTS.leftKnee} />
      <Bone start={JOINTS.leftKnee} end={JOINTS.leftAnkle} />
      <Bone start={JOINTS.rightHip} end={JOINTS.rightKnee} />
      <Bone start={JOINTS.rightKnee} end={JOINTS.rightAnkle} />

      {/* Highlight Problematic Bone (Shoulders) - Using a softer red/rose */}
      {vista === 'side_r' && (
        <Bone start={JOINTS.leftShoulder} end={JOINTS.rightShoulder} color="#f43f5e" />
      )}

      {/* Joints */}
      {Object.values(JOINTS).map((pos, i) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: posture skeleton joints
          <Joint key={i} pos={pos} />
        );
      })}
    </Svg>
  );
};
