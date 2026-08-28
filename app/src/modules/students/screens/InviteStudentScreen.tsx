import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

export default function InviteStudentScreen() {
  const router = useRouter();
  const { code, name } = useLocalSearchParams();
  const [isLoading, _setIsLoading] = useState(false);

  const handleShare = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `Olá ${name}! 💪\n\nJá cadastrei seu perfil no Eleva Pro.\nUse o código *${code}* para acessar seus treinos!\n\nEste código expira em 7 dias.\n\nBaixe o app agora!`,
      });
    } catch (_error) {
      showAlert({ title: 'Erro', message: 'Não foi possível compartilhar.', type: 'error' });
    }
  };

  return (
    <ScreenLayout>
      <View className="flex-1 px-6 justify-center items-center">
        <View className="w-24 h-24 rounded-full bg-orange-500/15 items-center justify-center mb-6 border-2 border-orange-500/20">
          <Ionicons name="checkmark" size={48} color="#FF6B35" />
        </View>

        <Text className="text-3xl font-extrabold text-white mb-2 text-center font-display">
          Aluno Cadastrado!
        </Text>
        <Text className="text-base text-zinc-400 text-center mb-6 font-sans px-4">
          Envie o código abaixo para <Text className="text-white font-bold">{name}</Text> acessar o
          app.
        </Text>

        <View className="bg-zinc-900 px-10 py-8 rounded-3xl mb-6 border-2 border-dashed border-orange-500/50 w-full items-center shadow-lg shadow-orange-500/10">
          <Text className="text-5xl font-bold text-orange-500 tracking-widest font-mono">
            {code}
          </Text>
          <Text className="text-zinc-500 text-xs mt-2 font-sans uppercase tracking-wider">
            Código de Acesso
          </Text>
        </View>

        <View className="flex-row items-center bg-orange-500/10 px-4 py-2 rounded-lg mb-8 border border-orange-500/20">
          <Ionicons name="time-outline" size={16} color="#FF6B35" />
          <Text className="text-orange-500 text-xs font-bold ml-2">O código expira em 7 dias</Text>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          disabled={isLoading}
          activeOpacity={0.8}
          className="w-full mb-4"
        >
          <LinearGradient
            colors={['#FF6B35', '#FF2E63']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl py-4 flex-row items-center justify-center shadow-lg shadow-orange-500/20"
          >
            <Ionicons name="share-social" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
            <Text className="text-white text-lg font-bold font-display">Compartilhar Código</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)/students')} className="p-4">
          <Text className="text-zinc-500 text-base font-sans font-medium">Voltar para Lista</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}
