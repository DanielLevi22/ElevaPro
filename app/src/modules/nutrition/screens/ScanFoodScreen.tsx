import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors as brandColors } from '@/constants/colors';
import {
  type FoodAnalysisResult,
  FoodRecognitionService,
} from '../services/FoodRecognitionService';

export default function ScanFoodScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);

  const pickImage = async (useCamera: boolean) => {
    try {
      let result: Awaited<ReturnType<typeof ImagePicker.launchCameraAsync>> | undefined;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showAlert({
            title: 'Permissão necessária',
            message: 'Precisamos de acesso à câmera para escanear sua comida.',
            type: 'warning',
          });
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled) {
        // Optimize image before sending (even to mock)
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImage(manipResult.uri);
        analyze(manipResult.uri);
      }
    } catch (_e) {
      showAlert({ title: 'Erro', message: 'Não foi possível carregar a imagem.', type: 'error' });
    }
  };

  const analyze = async (uri: string) => {
    setAnalyzing(true);
    setResult(null);
    try {
      const analysis = await FoodRecognitionService.analyzeFoodImage(
        uri,
        session?.access_token ?? ''
      );
      setResult(analysis);
    } catch (_e) {
      showAlert({ title: 'Erro', message: 'Falha na análise da imagem.', type: 'error' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <ScreenLayout>
      <View className="flex-1">
        {/* Header */}
        <View
          className="flex-row items-center px-6 py-5 border-b"
          style={{
            backgroundColor: brandColors.background.secondary,
            borderColor: brandColors.border.dark,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-5 p-2 rounded-xl border"
            style={{
              backgroundColor: brandColors.background.primary,
              borderColor: brandColors.border.dark,
            }}
          >
            <Ionicons name="close" size={20} color={brandColors.text.muted} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-black text-white font-display tracking-tight italic">
              ESCANEAR
            </Text>
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              Reconhecimento IA
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          {!image ? (
            <View className="flex-1 justify-center items-center gap-6 mt-10">
              <View className="h-64 w-64 bg-zinc-900 rounded-full items-center justify-center border-2 border-dashed border-zinc-700">
                <Ionicons name="camera-outline" size={80} color="#52525B" />
                <Text className="text-zinc-500 mt-4 text-center px-8">
                  Tire uma foto do seu prato para identificar macros
                </Text>
              </View>

              <View className="w-full gap-4 mt-8">
                <Button
                  variant="primary"
                  label="Tirar Foto"
                  onPress={() => pickImage(true)}
                  icon={<Ionicons name="camera" size={20} color="black" />}
                />
                <Button
                  variant="outline"
                  label="Galeria"
                  onPress={() => pickImage(false)}
                  icon={<Ionicons name="images" size={20} color="white" />}
                />
              </View>
            </View>
          ) : (
            <View className="items-center">
              <Image
                source={{ uri: image }}
                className="w-full h-64 rounded-2xl mb-6"
                contentFit="cover"
                transition={300}
              />

              {analyzing ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#FF6B35" />
                  <Text className="text-white mt-4 font-bold text-lg">Analisando Alimento...</Text>
                  <Text className="text-zinc-500 text-sm">Identificando componentes e porções</Text>
                </View>
              ) : result ? (
                <View
                  className="w-full rounded-[32px] p-6 border"
                  style={{
                    backgroundColor: brandColors.background.secondary,
                    borderColor: brandColors.border.dark,
                  }}
                >
                  <View className="flex-row items-start justify-between mb-6">
                    <View className="flex-1">
                      <Text className="text-white font-black text-2xl mb-2 italic font-display">
                        {result.name}
                      </Text>
                      <LinearGradient
                        colors={brandColors.gradients.success}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="self-start px-3 py-1 rounded-full"
                      >
                        <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                          {(result.confidence * 100).toFixed(0)}% Confiança
                        </Text>
                      </LinearGradient>
                    </View>
                  </View>

                  <View
                    className="flex-row justify-between p-4 rounded-2xl mb-8 border"
                    style={{
                      backgroundColor: brandColors.background.primary,
                      borderColor: brandColors.border.dark,
                    }}
                  >
                    <View className="items-center">
                      <Text className="text-zinc-500 text-[9px] font-black uppercase tracking-wider mb-1">
                        KCAL
                      </Text>
                      <Text className="text-white font-black text-lg italic">
                        {result.calories}
                      </Text>
                    </View>
                    <View className="w-[1px] bg-zinc-800" />
                    <View className="items-center">
                      <Text
                        className="text-[9px] font-black uppercase tracking-wider mb-1"
                        style={{ color: brandColors.macro.protein }}
                      >
                        PROT
                      </Text>
                      <Text className="text-white font-black text-lg italic">
                        {result.protein}g
                      </Text>
                    </View>
                    <View className="w-[1px] bg-zinc-800" />
                    <View className="items-center">
                      <Text
                        className="text-[9px] font-black uppercase tracking-wider mb-1"
                        style={{ color: brandColors.macro.carbs }}
                      >
                        CARB
                      </Text>
                      <Text className="text-white font-black text-lg italic">{result.carbs}g</Text>
                    </View>
                    <View className="w-[1px] bg-zinc-800" />
                    <View className="items-center">
                      <Text
                        className="text-[9px] font-black uppercase tracking-wider mb-1"
                        style={{ color: brandColors.macro.fat }}
                      >
                        GORD
                      </Text>
                      <Text className="text-white font-black text-lg italic">{result.fat}g</Text>
                    </View>
                  </View>

                  <Button
                    variant="primary"
                    label="ADICIONAR À DIETA"
                    onPress={() => {
                      showAlert({
                        title: 'Sucesso',
                        message: 'Alimento adicionado à sua dieta! (Simulação)',
                        type: 'success',
                      });
                      router.back();
                    }}
                  />
                  <TouchableOpacity onPress={handleReset} className="mt-6 py-2 items-center">
                    <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest">
                      Escanear Outro
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Button variant="outline" label="Tentar Novamente" onPress={handleReset} />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
