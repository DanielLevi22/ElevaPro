import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Alert, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useDeviceLevel } from '../hooks/useDeviceLevel';
import { useAssessmentStore } from '../store/assessmentStore';

/**
 * Onde a cabeça e os pés devem ficar, em fração da altura da tela.
 *
 * São as marcas que tornam duas capturas comparáveis: encaixando o corpo entre
 * elas, a distância até a câmera é a mesma nas duas vezes, para a mesma pessoa
 * e a mesma lente. É disso que o delta depende (`ADR-010`).
 */
const MARCA_TOPO = 0.1;
const MARCA_BASE = 0.9;

export default function BodyScanCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const target = params.target as 'front' | 'back' | 'side';
  const { pitch, roll, nivelado, disponivel } = useDeviceLevel();

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
    if (!cameraRef.current || !nivelado) return;

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
          Alert.alert('Erro', 'Modo de captura inválido');
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
        });
        router.back();
      }
    } catch (e) {
      console.error('ERROR:', e);
      Alert.alert('Erro', 'Tente novamente');
    }
  };

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
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" mode="picture" />

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
          Encaixe a cabeça na marca de cima e os pés na de baixo. Descalço, roupa justa.
        </Text>
      </View>

      <View className="absolute bottom-12 w-full items-center">
        {!nivelado && (
          <View className="mb-4 bg-amber-500/20 border border-amber-500/40 px-5 py-2 rounded-full">
            <Text className="text-amber-300 text-xs font-bold">{dicaDeNivel()}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={takePicture}
          disabled={!nivelado}
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
