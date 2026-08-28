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
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { useStudentStore } from '@/students';

export default function JoinPersonalScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { linkStudent } = useStudentStore();
  const { user } = useAuthStore();
  const router = useRouter();

  const handleJoin = async () => {
    if (!code.trim()) {
      showAlert({ title: 'Erro', message: 'Por favor, digite o código.', type: 'error' });
      return;
    }

    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await linkStudent(user.id, code.trim());

      if (result.success) {
        showAlert({
          title: 'Sucesso',
          message: 'Você foi vinculado ao seu personal!',
          type: 'success',
          buttonText: 'OK',
          onDismiss: () => router.replace('/(tabs)'),
        });
      } else {
        showAlert({
          title: 'Erro',
          message: result.error || 'Não foi possível vincular.',
          type: 'error',
        });
      }
    } catch (_error) {
      showAlert({ title: 'Erro', message: 'Ocorreu um erro inesperado.', type: 'error' });
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
                className="self-start bg-background-elevated p-2.5 rounded-xl mb-8"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <View className="flex-1 justify-center">
                <View className="items-center mb-10">
                  <LinearGradient
                    colors={['rgba(255, 107, 53, 0.2)', 'rgba(255, 107, 53, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="p-6 rounded-full mb-6"
                  >
                    <Ionicons name="link" size={64} color="#FF6B35" />
                  </LinearGradient>

                  <Text className="text-3xl font-bold text-white mb-3 text-center">
                    Vincular Personal
                  </Text>
                  <Text className="text-base text-gray-400 text-center leading-6">
                    Insira o código de convite fornecido pelo seu Personal Trainer para acessar seus
                    treinos.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-gray-400 text-sm mb-2 font-semibold ml-1">
                    CÓDIGO DE CONVITE
                  </Text>
                  <TextInput
                    value={code}
                    onChangeText={(text) => setCode(text.toUpperCase())}
                    placeholder="EX: AB12CD"
                    placeholderTextColor="#52525B"
                    autoCapitalize="characters"
                    maxLength={6}
                    className="bg-background-elevated border-2 border-border rounded-2xl p-5 text-white text-2xl font-bold text-center tracking-[4px]"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleJoin}
                  disabled={loading || code.length < 6}
                  activeOpacity={0.8}
                  className={loading || code.length < 6 ? 'opacity-50' : 'opacity-100'}
                >
                  <LinearGradient
                    colors={['#FF6B35', '#E85A2A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl py-4 items-center justify-center"
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text className="text-white text-lg font-bold">Vincular Agora</Text>
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
