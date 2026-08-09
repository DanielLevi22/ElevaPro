import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

/**
 * Registra o consentimento logo após a permissão do SO ser concedida.
 *
 * Sem este registro `hasCollectionConsent` sempre retorna false e nada é
 * persistido — a permissão nativa autoriza a leitura, o consentimento LGPD
 * autoriza o armazenamento. São coisas distintas.
 */
async function recordCollectionConsent(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    await createHealthService(supabase).grantCollectionConsent(session.user.id);
  } catch (error: unknown) {
    console.log('[HealthConnectScreen] Falha ao registrar consentimento:', String(error));
  }
}

export default function HealthConnectScreen() {
  const router = useRouter();
  const _insets = useSafeAreaInsets();
  // Ensure we are detecting platform correctly for icons
  const isIOS = Platform.OS === 'ios';

  const handleConnect = async () => {
    try {
      if (isIOS) {
        // O trecho anterior lia as permissoes de `Ionicons.AppleHealthKit`, o
        // import de icones — codigo sem efeito, mascarado por @ts-expect-error.
        const { requestAuthorization } = require('@kingstinct/react-native-healthkit');

        const granted = await requestAuthorization({
          toRead: [
            'HKQuantityTypeIdentifierStepCount',
            'HKQuantityTypeIdentifierActiveEnergyBurned',
          ],
        });

        if (granted) await recordCollectionConsent();
        router.replace('/(tabs)');
      } else {
        const { initialize, requestPermission } = require('react-native-health-connect');

        const isInitialized = await initialize();
        if (!isInitialized) {
          console.log('[HealthConnectScreen] Health Connect not initialized');
          router.replace('/(tabs)');
          return;
        }

        const permissions = [
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        ];

        await requestPermission(permissions);
        await recordCollectionConsent();
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('[HealthConnectScreen] Error requesting permissions:', error);
      router.replace('/(tabs)');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-black">
      {/* Background Gradients */}
      <View className="absolute top-0 left-0 right-0 h-[600px] overflow-hidden">
        <LinearGradient
          colors={[colors.primary.start, 'transparent']}
          className="absolute top-[-10%] left-0 right-0 h-[80%] opacity-20"
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <View className="flex-1 px-8 pt-16 pb-12 justify-between">
        {/* Header with Progress */}
        <View className="w-full">
          <View className="flex-row items-center border-b border-white/10 pb-4 mb-4">
            <TouchableOpacity onPress={handleSkip}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-white text-base font-bold">Você está quase lá</Text>
            </View>
            <View className="w-6" />
          </View>
          {/* Progress Bar */}
          <View className="h-1 bg-zinc-800 rounded-full w-full overflow-hidden">
            <View
              className="h-full w-[90%] rounded-full"
              style={{ backgroundColor: colors.primary.solid }}
            />
          </View>
        </View>

        {/* Central Icons */}
        <View className="flex-1 items-center justify-center -mt-20">
          <View className="flex-row items-center gap-6">
            {/* App Icon */}
            <View className="w-24 h-24 bg-zinc-900 rounded-3xl items-center justify-center border border-zinc-800 shadow-2xl relative overflow-hidden">
              <LinearGradient
                colors={[colors.primary.start, colors.primary.end]}
                className="absolute w-full h-full opacity-20"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Ionicons name="barbell" size={40} color="white" />
            </View>

            {/* Exchange Icon */}
            <Ionicons name="swap-horizontal" size={28} color="white" className="opacity-50" />

            {/* Health Platform Icon */}
            <View className="w-24 h-24 bg-white rounded-3xl items-center justify-center shadow-2xl overflow-hidden relative">
              {isIOS ? (
                <>
                  <LinearGradient
                    colors={['#FF2E63', '#ff6b8b']}
                    className="absolute w-full h-full opacity-10"
                  />
                  <Ionicons name="heart" size={48} color="#FF2E63" />
                </>
              ) : (
                <>
                  <LinearGradient
                    colors={['#00D9FF', '#4facfe']}
                    className="absolute w-full h-full opacity-10"
                  />
                  <Ionicons name="fitness" size={48} color="#00D9FF" />
                </>
              )}
            </View>
          </View>

          {/* Pulse Effect */}
          <View className="absolute z-[-1] w-full items-center justify-center">
            <View
              className="w-64 h-64 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: colors.primary.start }}
            />
          </View>
        </View>

        {/* Bottom Content */}
        <View className="w-full">
          <Text className="text-white text-3xl font-bold text-center mb-4">
            Sincronizar com {isIOS ? 'Apple Health' : 'Google Fit'}
          </Text>

          <Text className="text-zinc-400 text-center text-sm font-medium mb-12 px-2 leading-6">
            Sincronizar seu perfil de saúde agiliza o processo de criar um plano de treino
            personalizado e salvar seus resultados.
          </Text>

          <View className="gap-y-4">
            {/* Skip Button */}
            <TouchableOpacity
              onPress={handleSkip}
              className="py-4 items-center justify-center border border-zinc-800 rounded-full bg-zinc-900/50"
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-base">Pular por enquanto</Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handleConnect}
              className="w-full rounded-full shadow-lg"
              style={{ shadowColor: colors.primary.start, shadowOpacity: 0.3, shadowRadius: 10 }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary.start, colors.primary.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full py-4 rounded-full items-center justify-center"
              >
                <Text className="text-white font-bold text-base">Continuar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
