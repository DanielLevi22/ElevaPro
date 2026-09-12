import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { Row } from '@/components/ui/Row';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { SeletorDeTema } from '@/components/ui/SeletorDeTema';

/**
 * Menu e configurações, no desenho do app: lista grouped-inset em vez dos
 * cartões soltos de antes.
 *
 * É aqui que mora a escolha de tema, que o design system passou a suportar.
 */

// `as const` preserva cada rota como literal: sem isso `route` vira `string`
// largo e o `typedRoutes` recusa o push — que era exatamente o que o `as never`
// daqui escondia.
const DESTINOS = [
  { label: 'Perfil', icon: 'person-outline', route: '/(tabs)/profile' },
  { label: 'Ranking', icon: 'trophy-outline', route: '/(tabs)/ranking' },
  { label: 'Comandos de Voz', icon: 'mic-outline', route: '/help/voice-commands' },
] as const;

export default function MenuScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const nome = user?.email?.split('@')[0] ?? '';

  return (
    <ScreenLayout>
      <ScrollView contentContainerClassName="px-5 pb-10">
        <View className="mb-6 flex-row items-center gap-3.5 pt-2">
          <Avatar name={nome} size="lg" />
          <View className="min-w-0 flex-1">
            <Text className="text-h2 font-bold tracking-tight text-foreground">{nome}</Text>
            <Text className="text-legenda text-muted-foreground">{user?.email}</Text>
          </View>
        </View>

        <Group header="Conta">
          {DESTINOS.map((destino) => (
            <Row
              key={destino.label}
              icon={destino.icon}
              title={destino.label}
              chevron
              onPress={() => router.push(destino.route)}
            />
          ))}
        </Group>

        <SeletorDeTema />

        <Button label="Sair da conta" variant="tinted" fullWidth onPress={signOut} />
      </ScrollView>
    </ScreenLayout>
  );
}
