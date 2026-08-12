import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Alert, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useAssessmentStore } from '../store/assessmentStore';

export default function BodyScanCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const target = params.target as 'front' | 'back' | 'side';

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
    console.log('--- TAKE PICTURE PRESSED ---');
    if (!cameraRef.current) return;

    try {
      Vibration.vibrate(50);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        skipProcessing: true,
      });

      console.log('CAPTURED:', photo?.uri);

      if (photo?.uri) {
        const { setCapturedImage } = useAssessmentStore.getState();

        if (target) {
          setCapturedImage(target, photo.uri);
          router.back();
        } else {
          Alert.alert('Erro', 'Modo de captura inválido');
          router.back();
        }
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

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" mode="picture" />

      {/* Absolute Overlay Controls */}
      <View className="absolute top-12 left-0 right-0 items-center">
        <View className="bg-black/50 px-6 py-3 rounded-full border border-white/20 backdrop-blur-md">
          <Text className="text-white font-bold text-lg">{getTitle()}</Text>
        </View>
      </View>

      <View className="absolute bottom-12 w-full items-center">
        <TouchableOpacity
          onPress={takePicture}
          className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 items-center justify-center shadow-lg"
        >
          <View className="w-16 h-16 bg-white rounded-full border-2 border-black" />
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 bg-black/50 px-6 py-3 rounded-full backdrop-blur-md"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
