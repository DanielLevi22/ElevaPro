import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { ROUTES } from '@/navigation/types';
import {
  avisoDoPortao,
  consultarElegibilidade,
  type Elegibilidade,
} from '../services/elegibilidade';
import { useAssessmentStore } from '../store/assessmentStore';

// Import local image using require to ensure resolution
const bodyScanImage = require('@/assets/images/body-scan-hologram-v3.png');

const { width: _width } = Dimensions.get('window');

// Types for Orbiting Card
interface OrbitingCardProps {
  label: string;
  value: string;
  unit?: string;
  color: string;
  initialAngle: number; // in radians
  radiusX: number;
  yPos: number; // Base Y position
  duration?: number;
}

const OrbitingInfoCard = ({
  label,
  value,
  unit,
  color,
  initialAngle,
  radiusX,
  yPos,
  duration = 8000,
}: OrbitingCardProps) => {
  const progress = useSharedValue(initialAngle);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(initialAngle + 2 * Math.PI, {
        duration: duration,
        easing: Easing.linear,
      }),
      -1, // Infinite
      false // No reverse
    );
  }, [duration, initialAngle, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const angle = progress.value;

    // Calculate position
    // Sin for Z-depth (front/back), Cos for X-position (left/right) -> making it rotate
    // Using Sin for depth: 1 is front, -1 is back
    const sinVal = Math.sin(angle);
    const cosVal = Math.cos(angle);

    const translateX = cosVal * radiusX;

    // Vertical oscillation (bobbing)
    const bobbing = Math.sin(angle * 2) * 15;
    const translateY = yPos + bobbing;

    // Scale based on depth (larger when in front)
    const scale = interpolate(sinVal, [-1, 1], [0.7, 1.1], Extrapolate.CLAMP);

    // Opacity based on depth (faded when back)
    const opacity = interpolate(sinVal, [-1, 1], [0.4, 1], Extrapolate.CLAMP);

    // Z-Index: > 0 means in front of body (body zIndex usually 0 or 10)
    // We'll set the body container to specific zIndex.
    const zIndex = sinVal > 0 ? 20 : 1;

    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
      zIndex,
      position: 'absolute',
      // Center horizontally initially
      left: 0,
      right: 0,
      alignItems: 'center',
    };
  });

  return (
    <Animated.View style={animatedStyle} pointerEvents="none">
      {/* Wrapper to center the content at the point */}
      <View className="items-center justify-center w-[100px]">
        <View
          className="bg-black/80 border border-white/20 p-3 rounded-2xl backdrop-blur-md shadow-lg shadow-black/50 items-center justify-center"
          style={{ borderColor: `${color}40` }} // 25% opacity border of the theme color
        >
          <Text className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color }}>
            {label}
          </Text>
          <Text className="text-white text-xl font-black">
            {value}
            <Text className="text-sm text-zinc-400 font-normal">{unit}</Text>
          </Text>

          {/* Connecting Dot */}
          <View
            className="absolute -bottom-2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        </View>
      </View>
    </Animated.View>
  );
};

export default function BodyScanIntroduction({ hideHeader = false }: { hideHeader?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { studentId, id } = useLocalSearchParams<{ studentId?: string; id?: string }>();
  const { startScan, setStudentId } = useAssessmentStore();
  const authUserId = useAuthStore((s) => s.session?.user?.id ?? null);
  const token = useAuthStore((s) => s.session?.access_token ?? null);
  // Perguntado na ENTRADA, e não depois das três fotos. É a inversão que esta
  // tela existe para fazer: o aluno descobre que falta algo antes de gastar a
  // captura, não numa mensagem de erro no fim.
  const [portao, setPortao] = useState<Elegibilidade | null>(null);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    consultarElegibilidade(token)
      .then((r) => vivo && setPortao(r))
      // Falha de rede não fecha o portão: barrar o aluno porque a checagem caiu
      // seria trocar um beco por outro. A análise tem a própria guarda.
      .catch(() => vivo && setPortao({ podeEscanear: true }));
    return () => {
      vivo = false;
    };
  }, [token]);

  const aviso =
    portao && !portao.podeEscanear && portao.motivo ? avisoDoPortao(portao.motivo) : null;

  const handleStart = async () => {
    // O portão vem antes da câmera. `null` é a consulta ainda em voo: deixar
    // passar aqui devolveria o aluno ao caminho antigo.
    if (aviso) {
      if (aviso.destino) router.push(aviso.destino);
      return;
    }

    // params > auth user (member doing their own scan)
    const targetId = studentId || id || authUserId || undefined;

    if (targetId) {
      setStudentId(targetId as string);
    }

    await startScan();

    // O tutorial vem SEMPRE antes da câmera. Descobrir que a roupa estava larga
    // depois das três fotos é tarde demais, e o preparo muda a cada sessão: o
    // cômodo de hoje não é o de duas semanas atrás (`ADR-0022`).
    router.push({ pathname: ROUTES.ASSESSMENT.TUTORIAL, params: { studentId: targetId } });
  };

  return (
    <View className="flex-1 bg-black">
      {/* Background Gradient */}
      <LinearGradient
        colors={[colors.background.primary, '#0f172a', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Top ambient glow */}
      <View className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-primary-start opacity-10 blur-[100px] rounded-full" />
      <View className="absolute bottom-[-50px] right-[-50px] w-[300px] h-[300px] bg-secondary-main opacity-5 blur-[100px] rounded-full" />

      <View style={{ paddingTop: hideHeader ? 0 : insets.top }} className="flex-1">
        {/* Header - Conditionally Rendered */}
        {!hideHeader && (
          <View className="flex-row justify-between items-center px-6 py-4 z-10">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <View className="bg-white/5 px-3 py-1 rounded-full border border-white/10 flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-secondary anim-pulse" />
              <Text className="text-white/80 text-xs font-bold uppercase tracking-widest">
                AI Vision
              </Text>
            </View>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
              <Ionicons name="help" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 mt-2 items-center">
            <View className="bg-purple-500/20 px-3 py-1 rounded-md mb-4 border border-purple-500/30">
              <Text className="text-purple-400 text-[10px] font-bold uppercase tracking-widest">
                Tecnologia IA
              </Text>
            </View>
            <Text className="text-white text-3xl font-black font-display text-center leading-tight">
              Escaneamento <Text style={{ color: colors.primary.start }}>Corporal</Text>
            </Text>
            {/* Dizia "método extremamente preciso". Sobre estimativa de IA isso
                é informação enganosa, e o Art. 6°, VI exige transparência. */}
            <Text className="text-zinc-400 text-center text-sm mt-3 px-4 leading-relaxed">
              Três fotos viram uma estimativa de proporção, simetria e postura, para acompanhar sua
              evolução entre as avaliações. Não substitui a fita métrica.
            </Text>

            <View className="mt-5 mx-2 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
              <Text className="text-zinc-300 text-xs leading-relaxed">
                <Text className="text-white font-bold">Suas fotos saem do aparelho.</Text> Elas são
                enviadas a um serviço de inteligência artificial externo (Anthropic, nos Estados
                Unidos) só para gerar a análise.
              </Text>
              <Text className="text-zinc-300 text-xs leading-relaxed mt-2">
                <Text className="text-white font-bold">Nenhuma foto é guardada.</Text> O que fica
                salvo é o resultado — as medidas estimadas e as notas de postura.
              </Text>
            </View>
          </View>

          {/* MAIN VISUALIZER CONTAINER */}
          <View className="items-center justify-center h-[620px] relative mt-4">
            {/* Realistic Holographic Body Image */}
            {/* ZIndex 10 ensures it sits between background and front orbiting items */}
            <View style={{ zIndex: 10, elevation: 10 }}>
              <Image
                source={bodyScanImage}
                style={{
                  width: 380,
                  height: 600,
                  resizeMode: 'contain',
                  opacity: 0.9,
                }}
              />
            </View>

            {/* Orbiting Metrics */}
            {/* Center Point for logic is roughly center of this container */}

            {/* Biceps - Orbiting */}
            <OrbitingInfoCard
              label="Biceps"
              value="32"
              unit="cm"
              color={colors.secondary.main}
              initialAngle={0}
              radiusX={150}
              yPos={-140}
              duration={9000}
            />

            {/* Weight - Orbiting */}
            <OrbitingInfoCard
              label="Massa Magra"
              value="62"
              unit="kg"
              color={colors.status.warning}
              initialAngle={Math.PI / 2}
              radiusX={160}
              yPos={-60}
              duration={10000}
            />

            {/* Fat - Orbiting */}
            <OrbitingInfoCard
              label="Gordura"
              value="17"
              unit="%"
              color={colors.status.success}
              initialAngle={Math.PI}
              radiusX={150}
              yPos={50}
              duration={9500}
            />

            {/* IMC - Orbiting */}
            <OrbitingInfoCard
              label="IMC"
              value="22.1"
              unit=""
              color={colors.status.error}
              initialAngle={(3 * Math.PI) / 2}
              radiusX={160}
              yPos={130}
              duration={11000}
            />
          </View>

          {/* Instructions successfully moved to grid screen */}

          {/* CTA Button */}
          <View className="px-6 mt-8 z-20">
            {aviso && (
              <View className="mb-4 bg-amber-500/10 border border-amber-500/40 px-5 py-5 rounded-2xl">
                <Text className="text-amber-400 font-black text-base mb-2">{aviso.titulo}</Text>
                {/* Parágrafo por parágrafo, em branco cheio. O texto do
                    consentimento tem três blocos e precisa ser lido de fato:
                    autorização dada sobre texto que ninguém consegue ler é o
                    mesmo problema que a `POLICY_VERSION` nova existe para
                    resolver. O âmbar a 80% servia para aviso de uma linha. */}
                {aviso.texto.split('\n\n').map((paragrafo, indice, todos) => (
                  <Text
                    className={`text-white text-[15px] leading-6 ${
                      indice === todos.length - 1 ? '' : 'mb-3'
                    }`}
                    key={paragrafo}
                  >
                    {paragrafo}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={handleStart} activeOpacity={0.8}>
              <LinearGradient
                colors={
                  colors.gradients.primary as unknown as readonly [string, string, ...string[]]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 rounded-2xl items-center shadow-lg shadow-primary-solid/20"
              >
                <Text className="text-white font-black text-lg uppercase tracking-widest">
                  {aviso ? aviso.rotulo : 'Avançar'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
