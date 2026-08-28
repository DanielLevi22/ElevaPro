import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/components/ui/appAlert';
import { useAuthStore } from '../store/authStore';

export function StudentLoginScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithCode } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!code.trim()) {
      showAlert({
        title: 'Erro',
        message: 'Por favor, digite o código de convite.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithCode(code.trim());

      if (result.success) {
        router.replace('/(tabs)');
      } else {
        showAlert({
          title: 'Erro',
          message: result.error || 'Código inválido ou não encontrado.',
          type: 'error',
        });
      }
    } catch (error) {
      showAlert({ title: 'Erro', message: 'Ocorreu um erro inesperado.', type: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 p-6">
              {/* Header */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="self-start bg-card p-2.5 rounded-xl mb-8"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <View className="flex-1 justify-center">
                <View className="items-center mb-10">
                  <View className="w-[100px] h-[100px] rounded-full bg-cyan-400/15 items-center justify-center mb-6">
                    <Ionicons name="school" size={56} color="#22D3EE" />
                  </View>

                  <Text className="text-3xl font-extrabold text-foreground mb-3 text-center">
                    Área do Aluno
                  </Text>
                  <Text className="text-base text-zinc-400 text-center leading-6">
                    Insira o código fornecido pelo seu Personal Trainer para acessar seus treinos.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-zinc-400 text-sm mb-2 font-semibold ml-1">
                    CÓDIGO DE CONVITE
                  </Text>
                  <TextInput
                    value={code}
                    onChangeText={(text) => setCode(text.toUpperCase())}
                    placeholder="EX: AB12CD"
                    placeholderTextColor="#52525B"
                    autoCapitalize="characters"
                    maxLength={6}
                    className="bg-card border-2 border-border rounded-2xl p-5 text-foreground text-2xl font-bold text-center tracking-[4px]"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading || code.length < 6}
                  activeOpacity={0.8}
                  className={loading || code.length < 6 ? 'opacity-50' : 'opacity-100'}
                >
                  <LinearGradient
                    colors={['#22D3EE', '#0891B2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl py-4.5 items-center justify-center shadow-lg shadow-cyan-400/30"
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text className="text-white text-lg font-bold">Acessar Treinos</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
