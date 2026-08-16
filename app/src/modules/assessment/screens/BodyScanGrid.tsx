import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageSourceModal } from '@/components/ui/ImageSourceModal';
import { colors } from '@/constants/colors';
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
  const { capturedImages, setCapturedImage, studentId } = useAssessmentStore();

  const { studentId: paramIdRaw } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPose, setSelectedPose] = useState<PoseType | null>(null);

  useEffect(() => {
    const paramId = Array.isArray(paramIdRaw) ? paramIdRaw[0] : paramIdRaw;
    const effectiveId = studentId || paramId;

    console.log('🔍 BodyScanGrid | Store ID:', studentId, 'Param ID:', paramId);

    if (!effectiveId) {
      Alert.alert(
        'Erro de Identificação',
        'Não conseguimos identificar o aluno. Por favor, volte e tente novamente.',
        [{ text: 'Voltar', onPress: () => router.back() }]
      );
    } else if (paramId && !studentId) {
      // Sync store if missing
      useAssessmentStore.getState().setStudentId(paramId);
    }
  }, [studentId, paramIdRaw, router]);

  const handlePosePress = (pose: PoseType) => {
    setSelectedPose(pose);
    setModalVisible(true);
  };

  const onSelectCamera = () => {
    setModalVisible(false);
    if (selectedPose) {
      router.push({
        pathname: '/assessment/camera',
        params: { target: selectedPose },
      } as never);
    }
  };

  const onSelectGallery = async () => {
    setModalVisible(false);
    if (!selectedPose) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status === 'denied') {
        Alert.alert('Permissão Necessária', 'Precisamos de acesso à galeria para carregar fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedImage(selectedPose, result.assets[0].uri);
      }
    } catch (e) {
      console.error('Gallery failed', e);
      Alert.alert('Erro', 'Falha ao abrir galeria.');
    }
  };

  const allCaptured = POSES.every((p) => !!capturedImages[p.id]);

  const handleFinish = () => {
    if (allCaptured) {
      // Pass studentId to ensure it survives navigation
      console.log('Navigating to processing with StudentID:', studentId);
      router.push({
        pathname: '/assessment/processing',
        params: { studentId: studentId },
      } as never);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ImageSourceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectCamera={onSelectCamera}
        onSelectGallery={onSelectGallery}
      />

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
          {/* Instructions (Moved from Intro) */}
          <View className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm mb-8">
            <Text className="text-white font-bold text-lg mb-4 text-center">
              Instruções Importantes
            </Text>
            <View className="gap-4">
              <View className="flex-row items-center gap-4">
                <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
                  <Ionicons name="sunny-outline" size={16} color={colors.primary.solid} />
                </View>
                <Text className="text-zinc-300 flex-1 text-sm">
                  Realize o exame em um{' '}
                  <Text className="text-white font-bold">ambiente iluminado</Text>.
                </Text>
              </View>
              <View className="flex-row items-center gap-4">
                <View className="w-8 h-8 rounded-full bg-secondary/10 items-center justify-center border border-secondary/20">
                  <Ionicons name="shirt-outline" size={16} color={colors.secondary.main} />
                </View>
                <Text className="text-zinc-300 flex-1 text-sm">
                  Use roupas <Text className="text-white font-bold">justas</Text> ou roupa de banho.
                </Text>
              </View>
              <View className="flex-row items-center gap-4">
                <View className="w-8 h-8 rounded-full bg-orange-500/10 items-center justify-center border border-orange-500/20">
                  <Ionicons name="phone-portrait-outline" size={16} color={colors.primary.start} />
                </View>
                <Text className="text-zinc-300 flex-1 text-sm">
                  Apoie o celular na <Text className="text-white font-bold">vertical</Text>.
                </Text>
              </View>
            </View>
          </View>

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
