import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';
import { MedidasDoScan } from '../components/MedidasDoScan';
import { RadarChart } from '../components/RadarChart';
import { ScanComparison } from '../components/ScanComparison';
import { ScanHistoryList } from '../components/ScanHistoryList';
import { SeloDeConfianca } from '../components/SeloDeConfianca';
import { avaliarConfianca } from '../services/confiancaDoScan';
import type { Vista } from '../services/portao';
import { useAssessmentStore } from '../store/assessmentStore';

const { width } = Dimensions.get('window');
const PHOTO_ASPECT_RATIO = 4 / 3;
const PHOTO_WIDTH = width - 48;
const PHOTO_HEIGHT = PHOTO_WIDTH * PHOTO_ASPECT_RATIO;

// Só a estrutura das abas. O `feedback` fixo que morava aqui — "Ratio de 1.618
// (Golden Ratio)", risco, cor — era texto clínico escrito à mão e mostrado a
// qualquer aluno. O feedback de verdade vem do resultado da análise.
const ANALYSIS_VIEWS: Array<{ id: Vista; label: string; description: string }> = [
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
  const [currentViewIndex, setCurrentViewIndex] = useState(0);

  const currentView = ANALYSIS_VIEWS[currentViewIndex];

  const handleNext = () => {
    if (currentViewIndex < ANALYSIS_VIEWS.length - 1) setCurrentViewIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentViewIndex > 0) setCurrentViewIndex((prev) => prev - 1);
  };

  // Busca direta pela vista. Antes era um `switch` que tratava `side_r` e
  // `side_l` — ids de quando havia duas laterais. A lista virou uma só, `side`,
  // e o `switch` caía no default: a tela mostrava o holograma de placeholder no
  // lugar da foto do aluno, na lateral, desde então. O tipo `Vista` no
  // `ANALYSIS_VIEWS` é o que impede a próxima divergência.
  const currentImageUri = capturedImages[currentView.id];

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

  // Aqui morava um `setTimeout(2500)` com o comentário "Simulate AI Processing
  // time": a tela mostrava "Analisando Biometria..." por dois segundos e meio
  // sobre um resultado que já estava no store quando ela montou. Era espera
  // fabricada para parecer cálculo — o mesmo defeito do "Athletic Score", em
  // forma de interação. Quem espera de verdade é a tela de processamento, que
  // acompanha a chamada real ao BFF.

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
  const currentFeedback = feedback[currentView.id] || [];

  return (
    <ScreenLayout className="bg-black">
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between z-10">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Fechar análise"
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
            accessibilityLabel="Vista anterior"
            onPress={handlePrev}
            disabled={currentViewIndex === 0}
            className={`absolute left-4 top-1/2 -translate-y-6 z-30 w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10 ${currentViewIndex === 0 ? 'opacity-0' : 'opacity-100'}`}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Próxima vista"
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
                testID="foto-da-vista"
                source={{ uri: currentImageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Image
                testID="sem-foto-da-vista"
                source={require('@/assets/images/body-scan-hologram-v3.png')}
                style={{ width: '100%', height: '100%', opacity: 0.5 }}
                resizeMode="cover"
              />
            )}

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
            {/* A ordem da tela é a da confiança, e não a do impacto visual. Primeiro
                o quanto dá para confiar nesta captura, depois o que foi medido,
                e só então o que a análise estimou por cima disso. Antes era o
                inverso: o radar de notas do modelo abria o relatório com o maior
                peso da tela, e a medida ficava no rodapé — o `ADR-0010` diz que
                o número confiável é o outro. */}
            {/* O selo antes das medidas: ressalva lida depois do número já
                chegou tarde. */}
            <SeloDeConfianca
              confianca={avaliarConfianca({
                vereditos: lastResult.quality ?? null,
                troncoRotacionado: lastResult.measured?.trunk_rotated ?? null,
                escala: lastResult.scaleSource ?? null,
              })}
            />

            {lastResult.measured ? <MedidasDoScan medidas={lastResult.measured} /> : null}

            {/* Score Dashboard Card (New Radar Design) */}
            <View className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl mb-6 relative overflow-hidden">
              {/* Background Glow */}
              <View className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-10 translate-x-10" />

              {/* Aqui morava um "Athletic Score / Performance Geral": a média das
                  três notas abaixo, no maior destaque da tela, com um selo
                  EXCELENTE/REGULAR que era sempre verde — resultado ruim ganhava
                  cor de bom. Nada disso era medido. Ninguém avaliou performance
                  atlética, e somar simetria com postura não produz uma quarta
                  grandeza; produz um número com aparência de índice.
                  As três notas ficam, porque são o que a análise realmente
                  devolveu, e o cabeçalho passa a dizer o que elas são. O número
                  confiável desta tela é o delta, que já aparece acima em
                  `ScanComparison` (`ADR-0010`). */}
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 items-center justify-center">
                  <MaterialCommunityIcons name="eye-outline" size={18} color="#a1a1aa" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-bold font-display">
                    Leitura das fotos
                  </Text>
                  <Text className="text-zinc-500 text-xs">
                    Notas estimadas pela análise — não são medidas
                  </Text>
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

            {/* O que o aparelho mediu — separado do que o modelo interpretou, e
                obrigatório: medida que só o especialista lê é tratamento sem
                livre acesso (Art. 18, II). */}
            {/* Fica junto do selo de confiança de propósito: os dois respondem
                a mesma pergunta — o quanto dá para apoiar decisão nisto. E fica
                depois dos números, não antes, porque aviso lido antes de haver
                o que avaliar vira ruído que o aluno aprende a pular. */}
            <View className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <View className="mb-2 flex-row items-center gap-2">
                <Ionicons
                  color={colors.text.secondary}
                  name="information-circle-outline"
                  size={18}
                />
                <Text className="font-bold text-sm text-zinc-200">O que isto é, e o que não é</Text>
              </View>
              <Text className="text-sm text-zinc-400 leading-6">
                Esta análise sai de fotos e serve para te dar direção e acompanhar mudança ao longo
                do tempo. Ela não substitui avaliação física presencial nem a orientação de um
                profissional — e não é diagnóstico.
              </Text>
              <Text className="mt-3 text-sm text-zinc-400 leading-6">
                Antes de mudar treino ou alimentação, e sempre que houver dor, lesão ou condição de
                saúde, fale com seu personal ou com um nutricionista. Leve estes números para a
                conversa: eles ajudam quem vai te avaliar de perto.
              </Text>
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
