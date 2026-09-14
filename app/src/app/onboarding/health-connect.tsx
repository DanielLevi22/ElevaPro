import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '@/components/ui/appAlert';
import { colors } from '@/constants/colors';
import { registrarFalha } from '@/lib/registro';
import { useCores } from '@/shared/design';
import {
  isPlatformAvailable,
  requestBackgroundRead,
  requestReadPermissions,
} from '@/shared/wearable';

const PLATFORM_UNAVAILABLE_ALERT = {
  title: 'Health Connect indisponível',
  message:
    'Não consegui falar com o Health Connect. Verifique se ele está instalado e atualizado na Play Store.',
  type: 'info',
} as const;

function permissionDeniedAlert(isIOS: boolean) {
  const platform = isIOS ? 'HealthKit' : 'Health Connect';
  return {
    title: 'Permissão não concedida',
    message: `Sem acesso ao ${platform} não dá para ler seus passos. Toque em Conectar para tentar de novo.`,
    type: 'warning',
  } as const;
}

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
  const cores = useCores();

  const handleConnect = async () => {
    try {
      if (!(await isPlatformAvailable())) {
        // Sair calado para as tabs fazia o toque no botão não produzir nada
        // visível — indistinguível de o app ter travado.
        showAlert(PLATFORM_UNAVAILABLE_ALERT);
        return;
      }

      // O retorno era descartado e o consentimento LGPD ficava gravado mesmo
      // quando o usuário recusava: consentimento concedido, permissão negada.
      if (!(await requestReadPermissions())) {
        // Fica na tela: o botão "Conectar" é a ação que resolve.
        showAlert(permissionDeniedAlert(isIOS));
        return;
      }

      await requestBackgroundRead();
      await recordCollectionConsent();
      router.replace('/(tabs)');
    } catch {
      registrarFalha('relogio.pedir_permissoes');
      router.replace('/(tabs)');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-black">
      {/* Background Gradients */}
      <View className="absolute top-0 left-0 right-0 h-[37.5rem] overflow-hidden">
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
            {/* O rosa e o ciano de antes eram hexadecimal à mão; a marca não sai por
                classe nem por `useCores`, e a tela é refeita no lote da saúde. */}
            <View className="w-24 h-24 bg-white rounded-3xl items-center justify-center shadow-2xl overflow-hidden relative">
              <View className="absolute w-full h-full bg-primary/10" />
              {isIOS ? (
                <Ionicons name="heart" size={48} color={cores.primary} />
              ) : (
                <Ionicons name="fitness" size={48} color={cores.primary} />
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

          {/*
            Este texto é o que a `POLICY_VERSION` versiona: subir a constante
            sem mexer aqui pede reconsentimento sob o mesmo texto de antes, que
            é reconsentimento à toa — e é assim que se ensina a aceitar sem ler.
            O que ele precisa dizer, e antes não dizia: o que é lido, quem lê, e
            o que acontece ao desligar.
          */}
          <Text className="text-zinc-400 text-center text-sm font-medium mb-4 px-2 leading-6">
            Lemos do seu relógio{' '}
            <Text className="text-white font-semibold">
              passos, calorias, quanto você dormiu, sua frequência cardíaca de repouso e a
              frequência cardíaca média das suas corridas
            </Text>
            , para acompanhar sua atividade entre os treinos.
          </Text>

          {/*
            A ausência também precisa ser dita. Nesta feature ela é a decisão:
            o GPS mede distância e ritmo no aparelho e as coordenadas morrem com
            a sessão. Sem esta frase o aluno assume o contrário — todo aplicativo
            de corrida que ele conhece guarda o mapa — e consentimento assumido
            errado não é informado (Art. 9°).
          */}
          <Text className="text-zinc-400 text-center text-sm font-medium mb-4 px-2 leading-6">
            Durante a corrida o GPS mede{' '}
            <Text className="text-white font-semibold">distância e ritmo</Text>. O caminho que você
            percorreu é desenhado na tela e{' '}
            <Text className="text-white font-semibold">descartado ao fim do treino</Text> — ele não
            é salvo nem enviado para ninguém.
          </Text>

          <Text className="text-zinc-500 text-center text-xs mb-10 px-2 leading-5">
            Seu personal vinculado vê esses dados. Você pode desligar quando quiser em Minhas
            Autorizações: a coleta para na hora e ele perde o acesso — o histórico continua visível
            só para você.
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
