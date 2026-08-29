import { Ionicons } from '@expo/vector-icons';
import { type CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, Vibration, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { useDeviceLevel } from '../hooks/useDeviceLevel';
import { useAssessmentStore } from '../store/assessmentStore';

/**
 * Onde a cabeça e os pés devem ficar, em fração da altura da tela.
 *
 * São as marcas que tornam duas capturas comparáveis: encaixando o corpo entre
 * elas, a distância até a câmera é a mesma nas duas vezes, para a mesma pessoa
 * e a mesma lente. É disso que o delta depende (`ADR-0010`).
 */
const MARCA_TOPO = 0.1;
const MARCA_BASE = 0.9;

/**
 * Segundos do temporizador.
 *
 * Existe por causa da câmera frontal: para o corpo inteiro caber, o aparelho
 * fica a metros de distância — e aí ninguém alcança o botão. Sem temporizador,
 * a frontal deixa o aluno se ver e continua exigindo uma segunda pessoa.
 */
const TEMPORIZADOR_SEGUNDOS = 10;

export default function BodyScanCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const target = params.target as 'front' | 'back' | 'side';
  const { pitch, roll, nivelado, disponivel } = useDeviceLevel();
  const [facing, setFacing] = useState<CameraType>('back');
  const [temporizador, setTemporizador] = useState(false);
  const [contagem, setContagem] = useState<number | null>(null);

  // `useRef` para o efeito da contagem não depender da função e reiniciar o
  // temporizador a cada re-render do sensor de nível, que emite 5x por segundo.
  const dispararRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (contagem === null) return;

    if (contagem <= 0) {
      setContagem(null);
      dispararRef.current();
      return;
    }

    Vibration.vibrate(30);
    const id = setTimeout(() => setContagem((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [contagem]);

  // Handle permission
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <TouchableOpacity
          className="bg-orange-500 px-8 py-4 rounded-full"
          onPress={async () => {
            await requestPermission();
          }}
        >
          <Text className="text-white font-bold">Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    // Revalidado no disparo, não no toque: com o temporizador o aparelho fica
    // apoiado em algum lugar e pode ter escorregado nesses 10 segundos.
    if (!cameraRef.current || !nivelado) {
      showAlert({
        title: 'Fora de nível',
        message: 'Ajuste o aparelho e tente de novo.',
        type: 'warning',
      });
      return;
    }

    try {
      Vibration.vibrate(50);
      const photo = await cameraRef.current.takePictureAsync({
        // Era 0.5, e a imagem ainda passava por `compress: 0.6` no envio: duas
        // compressões, a primeira jogando fora informação antes da segunda. O
        // tamanho enviado é decidido no resize, então comprimir aqui não
        // economiza nada — só piora a medida de largura em pixels.
        quality: 1,
        base64: false,
        // Era `true`, o que pula a correção de orientação do Android e pode
        // devolver a rotação só na EXIF. Com a altura em pixels virando régua,
        // largura e altura trocadas quebrariam a escala em silêncio.
        skipProcessing: false,
      });

      if (photo?.uri) {
        const { setCapturedImage, setCaptureFraming } = useAssessmentStore.getState();

        if (!target) {
          showAlert({ title: 'Erro', message: 'Modo de captura inválido', type: 'error' });
          router.back();
          return;
        }

        setCapturedImage(target, photo.uri);
        // Guardado para o próximo escaneamento reproduzir o mesmo
        // enquadramento — sem isso a comparação perde a base.
        setCaptureFraming({
          markTop: MARCA_TOPO,
          markBottom: MARCA_BASE,
          pitch,
          roll,
          levelSensor: disponivel,
          // Qual lente. Frontal e traseira têm distância focal diferente, então
          // "o corpo ocupando a mesma fração do quadro" não significa a mesma
          // distância entre as duas — comparar escaneamentos de lentes
          // diferentes introduz um erro que ninguém veria sem este campo.
          camera: facing,
        });
        router.back();
      }
    } catch (e) {
      console.error('ERROR:', e);
      showAlert({ title: 'Erro', message: 'Tente novamente', type: 'error' });
    }
  };

  // A contagem dispara pelo ref para o efeito não depender desta função, que
  // muda a cada leitura do sensor.
  dispararRef.current = takePicture;

  const getTitle = () => {
    switch (target) {
      case 'front':
        return 'Frente';
      case 'back':
        return 'Costas';
      case 'side':
        return 'Lateral';
      default:
        return 'Foto';
    }
  };

  const dicaDeNivel = () => {
    if (!disponivel) return 'Mantenha o celular em pé';
    if (Math.abs(pitch) > Math.abs(roll)) {
      return pitch > 0 ? 'Incline o topo para trás' : 'Incline o topo para a frente';
    }
    return roll > 0 ? 'Gire para a esquerda' : 'Gire para a direita';
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mode="picture"
        // Explícito, e nunca `true`: espelhar troca esquerda e direita, e a
        // análise reporta lado ("ombro direito elevado"). Uma imagem espelhada
        // faria o laudo apontar o ombro errado — e pareceria correto.
        mirror={false}
      />

      {/* Marcas de enquadramento. Diferente da silhueta antiga, elas não são
          decoração: o disparo só libera com o aparelho nivelado. */}
      <View
        pointerEvents="none"
        className="absolute left-0 right-0"
        style={{ top: `${MARCA_TOPO * 100}%` }}
      >
        <View className="h-[2px] bg-primary/70" />
        <Text className="text-primary text-[10px] font-bold uppercase tracking-widest ml-4 mt-1">
          topo da cabeça
        </Text>
      </View>

      <View
        pointerEvents="none"
        className="absolute left-0 right-0"
        style={{ top: `${MARCA_BASE * 100}%` }}
      >
        <View className="h-[2px] bg-primary/70" />
        <Text className="text-primary text-[10px] font-bold uppercase tracking-widest ml-4 mt-1">
          pés
        </Text>
      </View>

      <View className="absolute top-12 left-0 right-0 items-center">
        <View className="bg-black/50 px-6 py-3 rounded-full border border-white/20">
          <Text className="text-white font-bold text-lg">{getTitle()}</Text>
        </View>
        <Text className="text-white/80 text-xs mt-3 px-10 text-center leading-relaxed">
          {facing === 'front'
            ? 'Apoie o celular, ligue o temporizador e afaste-se até caber entre as marcas.'
            : 'Encaixe a cabeça na marca de cima e os pés na de baixo. Descalço, roupa justa.'}
        </Text>
      </View>

      {/* Trocar de lente e ligar o temporizador ficam no topo direito, longe do
          disparo: são ajustes de preparo, não parte do gesto de fotografar. */}
      <View className="absolute top-12 right-5 gap-3">
        <TouchableOpacity
          onPress={() => setFacing((atual) => (atual === 'back' ? 'front' : 'back'))}
          className="w-12 h-12 rounded-full bg-black/50 border border-white/20 items-center justify-center"
          accessibilityLabel={facing === 'back' ? 'Usar câmera frontal' : 'Usar câmera traseira'}
        >
          <Ionicons name="camera-reverse-outline" size={22} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTemporizador((v) => !v)}
          className={`w-12 h-12 rounded-full items-center justify-center border ${
            temporizador ? 'bg-primary border-primary' : 'bg-black/50 border-white/20'
          }`}
          accessibilityLabel={
            temporizador ? 'Desligar temporizador' : `Temporizador de ${TEMPORIZADOR_SEGUNDOS}s`
          }
        >
          <Ionicons name="timer-outline" size={22} color={temporizador ? 'black' : 'white'} />
        </TouchableOpacity>
      </View>

      {contagem !== null && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Text className="text-white text-[120px] font-black">{contagem}</Text>
        </View>
      )}

      <View className="absolute bottom-12 w-full items-center">
        {!nivelado && (
          <View className="mb-4 bg-amber-500/20 border border-amber-500/40 px-5 py-2 rounded-full">
            <Text className="text-amber-300 text-xs font-bold">{dicaDeNivel()}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            if (temporizador) {
              setContagem(TEMPORIZADOR_SEGUNDOS);
              return;
            }
            takePicture();
          }}
          disabled={!nivelado || contagem !== null}
          className={`w-20 h-20 rounded-full border-4 items-center justify-center ${
            nivelado ? 'bg-white border-gray-300' : 'bg-white/30 border-white/30'
          }`}
        >
          <View
            className={`w-16 h-16 rounded-full border-2 ${
              nivelado ? 'bg-white border-black' : 'bg-white/40 border-black/30'
            }`}
          />
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 bg-black/50 px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
