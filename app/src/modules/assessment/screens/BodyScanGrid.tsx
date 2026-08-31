import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '@/components/ui/appAlert';
import { colors } from '@/constants/colors';
import { ROUTES } from '@/navigation/types';
import { useAssessmentStore } from '../store/assessmentStore';

const { width } = Dimensions.get('window');
const GRID_SPACING = 16;
const CARD_WIDTH = (width - 48 - GRID_SPACING) / 2;

type PoseType = 'front' | 'back' | 'side';

interface PoseConfig {
  id: PoseType;
  label: string;
  icon: string; // MaterialCommunityIcons name
  description: string;
}

// Três fotos, não quatro. As duas laterais davam a mesma informação para a
// análise e dobravam o incômodo de se fotografar — o que faz o aluno desistir
// no meio.
const POSES: PoseConfig[] = [
  { id: 'front', label: 'Frente', icon: 'human-handsup', description: 'Pés alinhados' },
  { id: 'back', label: 'Costas', icon: 'human-handsup', description: 'Vista posterior' },
  { id: 'side', label: 'Lateral', icon: 'human-greeting', description: 'Perfil, um dos lados' },
];

export default function BodyScanGrid() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { capturedImages, studentId } = useAssessmentStore();

  const { studentId: paramIdRaw } = useLocalSearchParams();

  useEffect(() => {
    const paramId = Array.isArray(paramIdRaw) ? paramIdRaw[0] : paramIdRaw;
    const effectiveId = studentId || paramId;

    if (!effectiveId) {
      showAlert({
        title: 'Erro de Identificação',
        message: 'Não conseguimos identificar o aluno. Por favor, volte e tente novamente.',
        type: 'error',
        buttonText: 'Voltar',
        onDismiss: () => router.back(),
      });
    } else if (paramId && !studentId) {
      // Sync store if missing
      useAssessmentStore.getState().setStudentId(paramId);
    }
  }, [studentId, paramIdRaw, router]);

  /**
   * Cada pose vai direto para a câmera.
   *
   * A galeria saiu: foto escolhida do rolo não passa pelo portão, não tem
   * enquadramento registrado e não terá conversão px/cm — e ficaria
   * indistinguível de uma que passou. É o mesmo fallback invisível que o
   * `ADR-0022` recusou para a falha de medida, só que pela porta da frente.
   */
  const handlePosePress = (pose: PoseType) => {
    router.push({ pathname: ROUTES.ASSESSMENT.CAMERA, params: { target: pose } });
  };

  const allCaptured = POSES.every((p) => !!capturedImages[p.id]);

  const handleFinish = () => {
    if (allCaptured) {
      // O id viaja por parâmetro para sobreviver à navegação.
      router.push({ pathname: ROUTES.ASSESSMENT.PROCESSING, params: { studentId } });
    }
  };

  return (
    <View className="flex-1 bg-black">
      <View style={{ paddingTop: insets.top }} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">Captura de Fotos</Text>
          <View className="w-10" />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
          <Text className="text-zinc-400 text-center mb-6 text-sm">
            Clique nos quadros para capturar cada ângulo:
          </Text>

          <View className="flex-row flex-wrap justify-between gap-y-6">
            {POSES.map((pose) => {
              const hasImage = !!capturedImages[pose.id];

              return (
                <TouchableOpacity
                  key={pose.id}
                  style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }}
                  className={`rounded-3xl overflow-hidden border-2 relative ${hasImage ? 'border-primary' : 'border-zinc-800 bg-zinc-900'}`}
                  onPress={() => handlePosePress(pose.id)}
                  activeOpacity={0.8}
                >
                  {/* Header / Icon Area */}
                  <View className="absolute top-0 w-full h-12 z-20 items-center justify-center">
                    {/* This can be the "mini boneco" floating above or inside */}
                  </View>

                  {hasImage ? (
                    <Image
                      source={{ uri: capturedImages[pose.id] }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center p-4 pt-8">
                      {/* Mini Boneco visualization using Icons */}
                      <View className="w-20 h-20 rounded-full bg-zinc-800/50 items-center justify-center mb-3 border border-zinc-700">
                        <MaterialCommunityIcons
                          name={pose.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                          size={40}
                          color={colors.primary.solid}
                          style={{ opacity: 0.8 }}
                        />
                        {/* Simple rotation for back/side logic if needed visually, 
                                             or just trust the icon choice */}
                      </View>

                      <Text className="text-white font-bold text-sm text-center mb-1">
                        {pose.label}
                      </Text>
                      <Text className="text-zinc-500 text-center text-[10px] leading-tight">
                        {pose.description}
                      </Text>

                      <View className="mt-4 flex-row gap-3">
                        <View className="bg-zinc-800 p-2 rounded-full border border-zinc-700">
                          <Ionicons name="camera" size={18} color="#a1a1aa" />
                        </View>
                        <View className="bg-zinc-800 p-2 rounded-full border border-zinc-700">
                          <Ionicons name="images" size={18} color="#a1a1aa" />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Checkmark Overlay if done */}
                  {hasImage && (
                    <View className="absolute top-3 right-3 bg-primary rounded-full p-1 shadow-lg z-20">
                      <Ionicons name="checkmark" size={16} color="black" />
                    </View>
                  )}

                  {/* Retake Label if done */}
                  {hasImage && (
                    <View className="absolute bottom-0 w-full bg-black/60 py-2 items-center">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="refresh" size={10} color="white" />
                        <Text className="text-white text-[10px] font-bold uppercase">Refazer</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer CTA */}
        <View
          className="p-6 border-t border-zinc-900 bg-black/80 blur-lg absolute bottom-0 w-full"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <TouchableOpacity
            disabled={!allCaptured}
            onPress={handleFinish}
            style={{ opacity: allCaptured ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={
                allCaptured ? [colors.primary.start, colors.primary.end] : ['#27272a', '#27272a']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 rounded-2xl items-center"
            >
              <Text
                className={`font-bold text-lg uppercase tracking-widest ${allCaptured ? 'text-white' : 'text-zinc-500'}`}
              >
                {allCaptured ? 'Realizar Análise' : `Complete as ${POSES.length} Fotos`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
