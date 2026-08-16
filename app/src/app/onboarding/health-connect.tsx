import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
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

        if (!granted) {
          Alert.alert(
            'Permissão não concedida',
            'Sem acesso ao HealthKit não dá para ler seus passos. Toque em Conectar para tentar de novo.'
          );
          return;
        }

        await recordCollectionConsent();
        router.replace('/(tabs)');
      } else {
        const { initialize, requestPermission } = require('react-native-health-connect');

        const isInitialized = await initialize();
        if (!isInitialized) {
          // Sair calado para as tabs fazia o toque no botão não produzir nada
          // visível — indistinguível de o app ter travado. A causa mais comum
          // é o Health Connect não estar instalado no aparelho.
          console.log('[HealthConnectScreen] Health Connect not initialized');
          Alert.alert(
            'Health Connect indisponível',
            'Não consegui falar com o Health Connect. Verifique se ele está instalado e atualizado na Play Store.'
          );
          return;
        }

        // As permissões de dado vêm sozinhas neste pedido. O Health Connect
        // trata `BackgroundAccessPermission` como especial e só a concede
        // depois de as comuns existirem — misturada aqui, o diálogo volta
        // vazio e tudo parece recusado.
        const granted = await requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        ]);

        console.log('[HealthConnect] permissões concedidas:', JSON.stringify(granted));

        const concedeuLeitura = granted.some(
          (p: { recordType: string; accessType: string }) =>
            p.accessType === 'read' &&
            (p.recordType === 'Steps' || p.recordType === 'ActiveCaloriesBurned')
        );

        // O retorno era descartado e o consentimento LGPD ficava gravado mesmo
        // quando o usuário recusava — o iOS já checava, o Android não. Dava um
        // estado impossível: consentimento concedido, permissão negada.
        if (!concedeuLeitura) {
          // Fica na tela em vez de mandar para as tabs: o botão "Conectar" é a
          // ação que resolve, e tirar o aluno daqui o obriga a redescobrir o
          // caminho para tentar de novo.
          Alert.alert(
            'Permissão não concedida',
            'Sem acesso ao Health Connect não dá para ler seus passos. Toque em Conectar para tentar de novo.'
          );
          return;
        }

        // Só agora, e num pedido separado: sem ela a leitura em background
        // volta lista vazia, mas ela não pode bloquear o fluxo — o aluno já
        // autorizou o essencial e recusar o background é escolha legítima.
        try {
          const comBackground = await requestPermission([
            { accessType: 'read', recordType: 'BackgroundAccessPermission' },
          ]);
          console.log('[HealthConnect] background:', JSON.stringify(comBackground));
        } catch (bgError) {
          console.log('[HealthConnect] background indisponível:', String(bgError));
        }

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
