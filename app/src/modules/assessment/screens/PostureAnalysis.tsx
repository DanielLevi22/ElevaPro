import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';
import { BodyDiagram } from '../components/BodyDiagram';
import { RadarChart } from '../components/RadarChart';
import { ScanComparison } from '../components/ScanComparison';
import { ScanHistoryList } from '../components/ScanHistoryList';
import { useAssessmentStore } from '../store/assessmentStore';

const { width } = Dimensions.get('window');
const PHOTO_ASPECT_RATIO = 4 / 3;
const PHOTO_WIDTH = width - 48;
const PHOTO_HEIGHT = PHOTO_WIDTH * PHOTO_ASPECT_RATIO;

// Só a estrutura das abas. O `feedback` fixo que morava aqui — "Ratio de 1.618
// (Golden Ratio)", risco, cor — era texto clínico escrito à mão e mostrado a
// qualquer aluno. O feedback de verdade vem do resultado da análise.
const ANALYSIS_VIEWS = [
  { id: 'front', label: 'Vista Frontal', description: 'Simetria e Proporções Musculares' },
  { id: 'back', label: 'Vista Posterior', description: 'Cadeia Posterior e Alinhamento' },
  { id: 'side', label: 'Vista Lateral', description: 'Curvatura e Postura' },
];

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
    scanHistory,
    loadHistory,
    deleteScan,
  } = useAssessmentStore();

  // Prioritize Store ID, then Params (check both 'studentId' and 'id' for compatibility)
  const id = storeStudentId || paramStudentId || paramId;

  useEffect(() => {
    if (!id) return;
    // Falha aqui não derruba a tela: a análise atual continua legível sem a
    // comparação. O que não pode é a tela sumir por causa do histórico.
    loadHistory(id).catch((error: unknown) => {
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

  // Sem resultado não há o que mostrar, e era aqui que a tela inventava: scores
  // fixos, feedback fabricado e um esqueleto assimétrico desenhado como se
  // fosse o corpo do aluno, atrás de uma tarja. Número inventado com aviso
  // continua sendo número inventado — é a mesma regra que o `ADR-0010` impôs ao
  // backend, aplicada à tela.
  if (!lastResult?.postureAnalysis) {
    return (
      <ScreenLayout>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="body-outline" size={48} color={colors.text.muted} />
          <Text className="text-white text-xl font-black text-center mt-4">
            Nenhuma análise ainda
          </Text>
          <Text className="text-zinc-400 text-sm text-center mt-2 leading-relaxed">
            Quando você fizer um escaneamento, o resultado aparece aqui.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-8 border border-white/15 px-8 py-4 rounded-2xl"
          >
            <Text className="text-white font-black uppercase tracking-widest text-xs">Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  const { scores, feedback, recommendations } = lastResult.postureAnalysis;

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
        {/* A comparação vem antes das fotos e dos valores absolutos: é o número
            mais confiável da tela, porque o erro da estimativa se cancela na
            diferença (ADR-0010). */}
        <ScanComparison deltas={scanDeltas} />

        {/*
          O histórico existia no store desde a entrega do body scan e não tinha
          tela. Sem lista não há como o titular apagar uma análise sua — e a
          eliminação do Art. 18, VI era um direito sem botão.
        */}
        {id && (
          <ScanHistoryList
            scans={scanHistory}
            onDelete={(scanId) => {
              deleteScan(scanId, id).catch((error: unknown) => {
                // Sem o objeto: o erro do PostgREST carrega o payload da linha,
                // e `body_scans` é o dado mais sensível do schema.
                console.log('[PostureAnalysis] falha ao apagar análise:', String(error));
              });
            }}
          />
        )}

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

            <BodyDiagram vista={currentView.id} />
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
                  ficha do aluno (`ADR-0010`). */}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
