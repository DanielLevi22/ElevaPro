import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Animated as RNAnimated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';
import { ScanComparison } from '../components/ScanComparison';

const { width } = Dimensions.get('window');
const PHOTO_ASPECT_RATIO = 4 / 3;
const PHOTO_WIDTH = width - 48;
const PHOTO_HEIGHT = PHOTO_WIDTH * PHOTO_ASPECT_RATIO;

// Mock Coordinates for a "Slightly Scoliotic" posture
const JOINTS = {
  nose: { x: 0.5, y: 0.15 },
  leftShoulder: { x: 0.35, y: 0.25 },
  rightShoulder: { x: 0.65, y: 0.28 }, // Lower right shoulder (imbalance)
  leftElbow: { x: 0.3, y: 0.45 },
  rightElbow: { x: 0.7, y: 0.48 },
  leftWrist: { x: 0.25, y: 0.65 },
  rightWrist: { x: 0.75, y: 0.68 },
  leftHip: { x: 0.4, y: 0.6 },
  rightHip: { x: 0.6, y: 0.6 },
  leftKnee: { x: 0.38, y: 0.8 },
  rightKnee: { x: 0.62, y: 0.8 },
  leftAnkle: { x: 0.38, y: 0.95 },
  rightAnkle: { x: 0.62, y: 0.95 },
};

// Analysis Data for each view
const ANALYSIS_VIEWS = [
  {
    id: 'front',
    label: 'Vista Frontal',
    description: 'Simetria e Proporções Musculares',
    feedback: [
      {
        title: 'Proporção Ombro/Cintura',
        risk: 'ÓTIMO',
        color: 'emerald',
        text: 'Ratio de 1.618 (Golden Ratio). Excelente proporção estética.',
      },
      {
        title: 'Simetria de Peitoral',
        risk: 'MODERADO',
        color: 'amber',
        text: 'Leve desproporção volumar no peitoral superior direito vs esquerdo.',
      },
      {
        title: 'Nivelamento de Quadril',
        risk: 'NORMAL',
        color: 'emerald',
        text: 'Cristas ilíacas niveladas, sem rotação aparente.',
      },
    ],
  },
  {
    id: 'back',
    label: 'Vista Posterior',
    description: 'Cadeia Posterior e Dorsais',
    feedback: [
      {
        title: 'Expansão de Dorsal',
        risk: 'BOM',
        color: 'emerald',
        text: 'Boa largura de dorsais, criando aspecto em V.',
      },
      {
        title: 'Alamento Escapular',
        risk: 'BAIXO',
        color: 'amber',
        text: 'Escápula direita levemente alada. Sugere fortalecimento de serrátil.',
      },
    ],
  },
  {
    id: 'side_r',
    label: 'Lateral Direita',
    description: 'Alinhamento e Postura',
    feedback: [
      {
        title: 'Projeção de Ombro',
        risk: 'ALTO',
        color: 'rose',
        text: 'Rotação interna excessiva. Desbalanço entre peitoral e manguito posterior.',
      },
      {
        title: 'Curvatura Lombar',
        risk: 'NORMAL',
        color: 'emerald',
        text: 'Lordose fisiológica preservada.',
      },
    ],
  },
  {
    id: 'side_l',
    label: 'Lateral Esquerda',
    description: 'Simetria Contralateral',
    feedback: [
      {
        title: 'Cadeia Posterior Perna',
        risk: 'NORMAL',
        color: 'emerald',
        text: 'Bons volumes de glúteo e posterior de coxa.',
      },
    ],
  },
];

// Radar Chart Component
const RadarChart = ({ data, size = 120 }: { data: Record<string, number>; size?: number }) => {
  const center = size / 2;
  const radius = (size - 40) / 2; // padding
  const AngleOffsets = { top: -90, right: 30, left: 150 };

  // Points for 3 axes (Triangle)
  const points = [
    { label: 'SIMETRIA', value: data.symmetry, angle: AngleOffsets.top },
    { label: 'MUSCULAR', value: data.muscle, angle: AngleOffsets.right },
    { label: 'POSTURA', value: data.posture, angle: AngleOffsets.left },
  ];

  const getCoordinates = (angle: number, value: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * (value / 100) * Math.cos(rad),
      y: center + radius * (value / 100) * Math.sin(rad),
    };
  };

  // Background Triangle (100% scale)
  const bgPoints = points
    .map((p) => {
      const c = getCoordinates(p.angle, 100);
      return `${c.x},${c.y}`;
    })
    .join(' ');

  // Data Triangle
  const dataPoints = points
    .map((p) => {
      const c = getCoordinates(p.angle, p.value);
      return `${c.x},${c.y}`;
    })
    .join(' ');

  return (
    <View className="items-center justify-center py-2 h-[160px]">
      <Svg height={size} width={size * 1.5}>
        {/* Axes Lines */}
        {points.map((p, _i) => {
          const start = getCoordinates(p.angle, 0);
          const end = getCoordinates(p.angle, 100);
          return (
            <Line
              key={p.angle}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Background Shape */}
        <Polygon
          points={bgPoints}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />

        {/* Data Shape */}
        <Polygon
          points={dataPoints}
          fill={`${colors.primary.solid}33`}
          stroke={colors.primary.solid}
          strokeWidth="2"
        />

        {/* Data Points & Labels */}
        {points.map((p, i) => {
          const c = getCoordinates(p.angle, p.value);
          const labelPos = getCoordinates(p.angle, 125); // Push labels out slightly

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: radar chart points
            <React.Fragment key={i}>
              <Circle cx={c.x} cy={c.y} r="3" fill={colors.primary.solid} />
              {/* Label */}
              <SvgText
                x={labelPos.x}
                y={labelPos.y}
                fill="rgba(255,255,255,0.6)"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {p.label}
              </SvgText>
              {/* Value */}
              <SvgText
                x={labelPos.x}
                y={labelPos.y + 12}
                fill="white"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {p.value}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

import { useAssessmentStore } from '../store/assessmentStore';

// ... (existing helper functions like SkeletonOverlay etc remain, we just update the component logic)

export default function PostureAnalysis() {
  const router = useRouter();
  const { studentId: paramStudentId, id: paramId } = useLocalSearchParams<{
    studentId?: string;
    id?: string;
  }>();
  const {
    capturedImages,
    lastResult,
    studentId: storeStudentId,
    scanDeltas,
    loadHistory,
  } = useAssessmentStore();

  // Prioritize Store ID, then Params (check both 'studentId' and 'id' for compatibility)
  const id = storeStudentId || paramStudentId || paramId;

  useEffect(() => {
    if (!id) return;
    // Falha aqui não derruba a tela: a análise atual continua legível sem a
    // comparação. O que não pode é a tela sumir por causa do histórico.
    loadHistory(id).catch((error) => {
      console.log('[PostureAnalysis] Histórico indisponível:', String(error));
    });
  }, [id, loadHistory]);

  useEffect(() => {
    if (!id) {
      console.error('❌ No Student ID found in PostureAnalysis! Save will fail.');
    } else {
      console.log('✅ PostureAnalysis loaded with Student ID:', id);
    }
  }, [id]);
  const [analyzing, setAnalyzing] = useState(true);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [scanPosition] = useState(new RNAnimated.Value(0));

  const currentView = ANALYSIS_VIEWS[currentViewIndex];

  const handleNext = () => {
    if (currentViewIndex < ANALYSIS_VIEWS.length - 1) setCurrentViewIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentViewIndex > 0) setCurrentViewIndex((prev) => prev - 1);
  };

  const getCurrentImageUri = () => {
    switch (currentView.id) {
      case 'front':
        return capturedImages.front;
      case 'back':
        return capturedImages.back;
      case 'side_r':
      case 'side_l':
        // As duas vistas laterais viraram uma só na captura: davam a mesma
        // informação e dobravam o incômodo de se fotografar.
        return capturedImages.side;
      default:
        return null;
    }
  };

  const currentImageUri = getCurrentImageUri();

  useEffect(() => {
    // Simulate AI Processing time
    const timer = setTimeout(() => {
      setAnalyzing(false);
    }, 2500); // Slightly faster
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Continuous Scanning Animation
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(scanPosition, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false, // height interpolation often needs false or layout animation
        }),
        RNAnimated.timing(scanPosition, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [scanPosition]);

  const SkeletonOverlay = () => {
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
        {currentView.id === 'front' && (
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
        {currentView.id === 'side_r' && (
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'ALTO':
      case 'ALTO RISCO':
        return 'rose';
      case 'MODERADO':
        return 'amber';
      case 'NORMAL':
      case 'BOM':
      case 'ÓTIMO':
        return 'emerald';
      default:
        return 'zinc';
    }
  };

  const ScannerLine = () => (
    <RNAnimated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(16, 185, 129, 0.8)', // Primary/Emerald color
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        opacity: 0.8,
        top: scanPosition.interpolate({
          inputRange: [0, 1],
          outputRange: [0, PHOTO_HEIGHT],
        }),
      }}
    />
  );

  const _ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-zinc-400 text-xs font-bold">{label.toUpperCase()}</Text>
        <Text className="text-white text-xs font-bold">{score}/100</Text>
      </View>
      <View className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <View
          style={{ width: `${score}%`, backgroundColor: color }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );

  if (analyzing) {
    return (
      <ScreenLayout className="bg-black justify-center items-center">
        <Animated.View entering={FadeIn} className="items-center">
          <View className="w-24 h-24 mb-6 rounded-full bg-primary/10 items-center justify-center relative">
            <View className="absolute w-full h-full rounded-full border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent animate-spin" />
            <MaterialCommunityIcons name="scan-helper" size={40} color={colors.primary.solid} />
          </View>
          <Text className="text-white text-xl font-bold mb-2 font-display">
            Analisando Biometria...
          </Text>
          <Text className="text-zinc-400 text-sm">Calculando proporções e simetria</Text>
        </Animated.View>
      </ScreenLayout>
    );
  }

  const isDemo = !lastResult;

  // Dynamic Data with fallback
  const scores = lastResult?.postureAnalysis?.scores || {
    symmetry: 85,
    muscle: 72,
    posture: 90,
  };

  const feedback = lastResult?.postureAnalysis?.feedback || {
    front: ANALYSIS_VIEWS[0].feedback,
    back: ANALYSIS_VIEWS[1].feedback,
    side: ANALYSIS_VIEWS[2].feedback,
  };

  const recommendations =
    lastResult?.postureAnalysis?.recommendations ||
    'Para corrigir a assimetria peitoral e rotação de ombro, priorize exercícios unilaterais (ex: Crucifixo Unilateral) e foque no fortalecimento de rotadores externos.';

  // Update currentView with AI feedback
  const currentFeedback = feedback[currentView.id as keyof typeof feedback] || [];

  return (
    <ScreenLayout className="bg-black">
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
        >
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-white font-bold text-lg">Análise Corporal I.A.</Text>
          <Text className="text-zinc-400 text-xs">{currentView.label}</Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Demo mode banner — shown when AI analysis failed */}
        {isDemo && (
          <View className="mx-6 mt-4 flex-row items-center gap-3 bg-amber-500/10 border border-amber-500/30 px-4 py-3 rounded-xl">
            <Ionicons name="warning-outline" size={16} color="#f59e0b" />
            <Text className="text-amber-400 text-xs flex-1 leading-5">
              Análise de demonstração — a IA não conseguiu processar as fotos. Tente novamente.
            </Text>
          </View>
        )}

        {/* A comparação vem antes das fotos e dos valores absolutos: é o número
            mais confiável da tela, porque o erro da estimativa se cancela na
            diferença (ADR-010). */}
        {!isDemo && <ScanComparison deltas={scanDeltas} />}

        {/* Photo Container with Navigation */}
        <View className="items-center mt-6 relative">
          {/* View Switcher Controls (Overlay left/right) */}
          <TouchableOpacity
            onPress={handlePrev}
            disabled={currentViewIndex === 0}
            className={`absolute left-4 top-1/2 -translate-y-6 z-30 w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10 ${currentViewIndex === 0 ? 'opacity-0' : 'opacity-100'}`}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            disabled={currentViewIndex === ANALYSIS_VIEWS.length - 1}
            className={`absolute right-4 top-1/2 -translate-y-6 z-30 w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10 ${currentViewIndex === ANALYSIS_VIEWS.length - 1 ? 'opacity-0' : 'opacity-100'}`}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>

          <Animated.View
            entering={ZoomIn.duration(600)}
            key={currentView.id}
            className="rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 relative shadow-2xl shadow-black"
            style={{ width: PHOTO_WIDTH, height: PHOTO_HEIGHT }}
          >
            {/* Results Image Display */}
            {currentImageUri ? (
              <Image
                source={{ uri: currentImageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require('@/assets/images/body-scan-hologram-v3.png')}
                style={{ width: '100%', height: '100%', opacity: 0.5 }}
                resizeMode="cover"
              />
            )}

            <SkeletonOverlay />
            <ScannerLine />

            {/* View Label Badge */}
            <View className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <Text className="text-white text-[10px] font-bold uppercase tracking-widest">
                {currentView.label}
              </Text>
            </View>
          </Animated.View>

          {/* Pagination Dots */}
          <View className="flex-row gap-2 mt-4">
            {ANALYSIS_VIEWS.map((_, i) => (
              <View
                key={ANALYSIS_VIEWS[i].id}
                className={`w-2 h-2 rounded-full ${i === currentViewIndex ? 'bg-primary scale-110' : 'bg-zinc-800'}`}
              />
            ))}
          </View>
        </View>

        {/* Results Report Dynamic */}
        <View className="px-6 mt-6">
          <Animated.View entering={FadeInDown.delay(300)} key={currentViewIndex}>
            {/* Score Dashboard Card (New Radar Design) */}
            <View className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl mb-6 relative overflow-hidden">
              {/* Background Glow */}
              <View className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-10 translate-x-10" />

              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 items-center justify-center shadow-lg">
                    <MaterialCommunityIcons
                      name="trophy-variant-outline"
                      size={18}
                      color="#FFD700"
                    />
                  </View>
                  <View>
                    <Text className="text-white text-base font-bold font-display">
                      Athletic Score
                    </Text>
                    <Text className="text-zinc-500 text-xs">Performance Geral</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text
                    className="text-3xl font-black italic text-white"
                    style={{ fontStyle: 'italic' }}
                  >
                    {Math.round((scores.symmetry + scores.muscle + scores.posture) / 3)}
                  </Text>
                  <View className="bg-emerald-500/20 px-2 py-0.5 rounded">
                    <Text className="text-emerald-400 text-[10px] font-bold">
                      {(scores.symmetry + scores.muscle + scores.posture) / 3 > 80
                        ? 'EXCELENTE'
                        : 'REGULAR'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* The Radar Chart */}
              <RadarChart data={scores} size={160} />
            </View>

            <View className="flex-row items-center mb-5 justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <MaterialCommunityIcons
                    name="google-analytics"
                    size={20}
                    color={colors.primary.solid}
                  />
                </View>
                <Text className="text-white text-lg font-bold font-display">Insights da I.A.</Text>
              </View>
            </View>

            {currentFeedback.length > 0 ? (
              currentFeedback.map((item: { title: string; risk: string; text: string }) => {
                const colorKey = getRiskColor(item.risk);

                return (
                  <View
                    key={item.title}
                    className={`bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl mb-4`}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <Text className={`text-white font-bold text-base`}>{item.title}</Text>
                      <View
                        className={`px-2.5 py-1 rounded-md border bg-${colorKey}-500/10 border-${colorKey}-500/20`}
                      >
                        <Text
                          className={`text-${colorKey}-400 text-[10px] font-bold tracking-wider`}
                        >
                          {item.risk}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-zinc-400 text-sm leading-6">{item.text}</Text>
                  </View>
                );
              })
            ) : (
              <Text className="text-zinc-500 text-sm italic mb-4">
                Sem observações para este ângulo.
              </Text>
            )}

            {/* AI Suggestion */}
            <View className="mt-2 bg-gradient-to-br from-zinc-900 to-black p-5 rounded-2xl border border-dashed border-zinc-700/50 relative overflow-hidden">
              <View className="flex-row items-center gap-2 mb-3">
                <MaterialCommunityIcons name="dumbbell" size={16} color={colors.primary.solid} />
                <Text className="text-zinc-200 font-bold text-sm">Recomendação de Treino</Text>
              </View>
              <Text className="text-zinc-400 text-sm leading-6">{recommendations}</Text>
            </View>

            {/* Actions Footer */}
            <View className="mt-8 flex-row gap-4 mb-8">
              <TouchableOpacity
                className="flex-1 bg-zinc-900 py-4 rounded-xl items-center border border-zinc-800 active:bg-zinc-800"
                onPress={() => router.back()}
              >
                <Text className="text-zinc-400 font-bold">Refazer Scan</Text>
              </TouchableOpacity>

              {/* O botão "Salvar Análise" saiu.
                  Ele gravava o resultado da IA dentro de `physical_assessments`
                  — a tabela da fita métrica — com nomes de coluna que nem
                  existiam. Era gravação duplicada: a análise já é persistida em
                  `body_scans` pelo próprio BFF, no momento em que acontece.
                  Mantê-lo faria estimativa e medição virarem a mesma coisa na
                  ficha do aluno (`ADR-010`). */}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
