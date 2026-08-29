import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors as brandColors } from '@/constants/colors';
import { mensagemDeErroBff } from '@/shared/bff';
import { useNutritionStore } from '../routes';
import { type ChatMessage, NutriBotService } from '../services/NutriBotService';

export default function NutriBotScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { currentDietPlan } = useNutritionStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Olá! Sou seu assistente nutricional pessoal. Estou aqui para otimizar sua estratégia na dieta "${currentDietPlan?.name || 'Atual'}". Como posso ajudar hoje?`,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await NutriBotService.sendMessage(
        messages,
        userMsg.content,
        session?.access_token ?? ''
      );

      // Prepare placeholder message
      const responseId = (Date.now() + 1).toString();

      setMessages((prev) => [
        ...prev,
        {
          id: responseId,
          role: 'assistant',
          content: '', // Start empty
          createdAt: Date.now(),
        },
      ]);
      setLoading(false); // Stop loading indicator, start streaming

      // Simulate Streaming (Typewriter Effect)
      let currentText = '';
      const chunkSize = 5; // Characters per tick

      for (let i = 0; i < responseText.length; i += chunkSize) {
        const chunk = responseText.slice(i, i + chunkSize);
        currentText += chunk;

        setMessages((prev) =>
          prev.map((msg) => (msg.id === responseId ? { ...msg, content: currentText } : msg))
        );

        // Auto-scroll logic
        flatListRef.current?.scrollToEnd({ animated: false });

        // Wait a slightly random bit for realism (10ms - 30ms)
        await new Promise((r) => setTimeout(r, 15));
      }
    } catch (erro) {
      // O `catch` vazio que morava aqui só parava o spinner: a tela ficava com
      // a pergunta do aluno e nenhuma resposta, e a causa — que o `client.ts`
      // já sabia nomear — morria aqui. Agora ela vira uma mensagem no chat.
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: mensagemDeErroBff(erro),
          createdAt: Date.now(),
        },
      ]);
    }
  };

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
            <Ionicons name="arrow-back" size={20} color={brandColors.primary.start} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-black text-white font-display tracking-tight italic">
              NUTRIBOT
            </Text>
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              Inteligência Nutricional
            </Text>
          </View>
        </View>

        {/* Chat List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View className={`max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
                {isUser ? (
                  <LinearGradient
                    colors={brandColors.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl rounded-tr-sm p-4 shadow-lg"
                    style={{
                      shadowColor: brandColors.primary.start,
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                    }}
                  >
                    <Text className="text-white text-base font-medium leading-6">
                      {item.content}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    className="rounded-2xl rounded-tl-sm p-5 border"
                    style={{
                      backgroundColor: brandColors.background.secondary,
                      borderColor: brandColors.border.dark,
                    }}
                  >
                    <Text className="text-zinc-300 text-base leading-7 font-sans">
                      {item.content}
                    </Text>
                  </View>
                )}
                <Text
                  className={`text-[9px] text-zinc-600 mt-1 uppercase font-black tracking-widest ${isUser ? 'text-right mr-1' : 'ml-1'}`}
                >
                  {isUser ? 'Você' : 'NutriBot'}
                </Text>
              </View>
            );
          }}
        />

        {/* Input Area */}
        <View
          className="p-5 pb-32 border-t flex-row items-center"
          style={{
            backgroundColor: brandColors.background.secondary,
            borderColor: brandColors.border.dark,
          }}
        >
          <View
            className="flex-1 rounded-2xl border px-4 py-3 mr-3 flex-row items-center"
            style={{
              backgroundColor: brandColors.background.primary,
              borderColor: brandColors.border.dark,
            }}
          >
            <TextInput
              className="flex-1 text-white text-base font-medium"
              placeholder="Pergunte sobre sua dieta..."
              placeholderTextColor="#52525B"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={loading || !input.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                !input.trim()
                  ? [brandColors.background.elevated, brandColors.background.elevated]
                  : brandColors.gradients.primary
              }
              className="w-12 h-12 rounded-xl items-center justify-center border"
              style={{ borderColor: !input.trim() ? brandColors.border.dark : 'transparent' }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="send" size={20} color={!input.trim() ? '#52525B' : 'white'} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}
