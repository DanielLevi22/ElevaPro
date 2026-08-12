import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { useAssessmentStore } from '../store/assessmentStore';

export default function BodyScanProcessing() {
  const { studentId: paramIdRaw, id: fallbackIdRaw } = useLocalSearchParams();
  const router = useRouter();
  const { capturedImages, submitScan, status: _status, studentId: storeId } = useAssessmentStore();

  useEffect(() => {
    let mounted = true;

    const process = async () => {
      if (Object.keys(capturedImages).length === 0) {
        // No images? Go back
        router.replace('/assessment/body-scan' as never);
        return;
      }

      await submitScan();

      if (mounted) {
        // Navigate to results
        setTimeout(() => {
          // Prioritize PARAMS over STORE to fix "demo-scan" bug
          const paramId = Array.isArray(paramIdRaw) ? paramIdRaw[0] : paramIdRaw;
          const fallbackId = Array.isArray(fallbackIdRaw) ? fallbackIdRaw[0] : fallbackIdRaw;

          const targetId = paramId || fallbackId || storeId || 'demo-scan';

          console.log('Processing done. Target Student ID:', targetId);

          router.replace({
            pathname: '/(tabs)/students/posture-analysis',
            params: { studentId: targetId },
          } as never);
        }, 1000);
      }
    };

    process();

    return () => {
      mounted = false;
    };
  }, [capturedImages, submitScan, paramIdRaw, fallbackIdRaw, storeId, router]);

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <LinearGradient
        colors={[colors.background.primary, '#1a1a2e', '#000000']}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      <Animated.View entering={FadeInUp.springify()} className="items-center">
        <View className="w-24 h-24 bg-primary/20 rounded-full items-center justify-center mb-6 border border-primary/40 shadow-[0_0_30px_rgba(255,107,53,0.3)]">
          <ActivityIndicator size="large" color={colors.primary.start} />
        </View>

        <Text className="text-white text-2xl font-black font-display mb-2">Analisando...</Text>
        <Text className="text-zinc-400 text-center px-10">
          Nossa IA está construindo seu modelo 3D e calculando suas métricas.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(500)}
        className="mt-10 flex-row gap-4 flex-wrap justify-center px-6"
      >
        {capturedImages.front && (
          <View className="items-center gap-1">
            <Image
              source={{ uri: capturedImages.front }}
              className="w-16 h-24 rounded-lg border-2 border-primary/50"
            />
            <Text className="text-zinc-500 text-[10px]">Frente</Text>
          </View>
        )}
        {capturedImages.back && (
          <View className="items-center gap-1">
            <Image
              source={{ uri: capturedImages.back }}
              className="w-16 h-24 rounded-lg border-2 border-primary/50"
            />
            <Text className="text-zinc-500 text-[10px]">Costas</Text>
          </View>
        )}
        {capturedImages.side && (
          <View className="items-center gap-1">
            <Image
              source={{ uri: capturedImages.side }}
              className="w-16 h-24 rounded-lg border-2 border-primary/50"
            />
            <Text className="text-zinc-500 text-[10px]">Lateral</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}
