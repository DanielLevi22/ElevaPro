import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

export default function MenuScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  // `as const` preserva cada rota como literal: sem isso `route` vira `string`
  // largo e o `typedRoutes` recusa o push — que era exatamente o que o
  // `as never` daqui escondia.
  const menuItems = [
    {
      label: 'Perfil',
      icon: 'person-outline',
      route: '/(tabs)/profile',
      color: '#FFFFFF',
    },
    {
      label: 'Ranking',
      icon: 'trophy-outline',
      route: '/(tabs)/ranking',
      color: '#FFFFFF',
    },
    {
      label: 'Comandos de Voz',
      icon: 'mic-outline',
      route: '/help/voice-commands',
      color: '#FFFFFF',
    },
  ] as const;

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* User Header */}
        <View className="flex-row items-center mb-8 pb-8 border-b border-zinc-800">
          <View className="h-16 w-16 bg-zinc-800 rounded-full items-center justify-center mr-4 border border-zinc-700">
            <Text className="text-xl font-bold text-zinc-400">
              {user?.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-white text-lg font-bold">{user?.email?.split('@')[0]}</Text>
            <Text className="text-zinc-500 text-sm">{user?.email}</Text>
          </View>
        </View>

        {/* Menu Grid */}
        <View className="gap-3">
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => item.route && router.push(item.route)}
              className="flex-row items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800"
            >
              <View className="bg-zinc-800 p-2 rounded-lg mr-4">
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={item.color}
                />
              </View>
              <Text className="text-white font-semibold text-base flex-1">{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color="#52525B" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={signOut}
          className="mt-8 flex-row items-center justify-center p-4"
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text className="text-red-500 font-bold ml-2">Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}
