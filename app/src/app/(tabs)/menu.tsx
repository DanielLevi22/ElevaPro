import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { Row } from '@/components/ui/Row';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { type PreferenciaDeTema, useTemaStore } from '@/shared/design';

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

type OpcaoDeTema = {
  valor: PreferenciaDeTema;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TEMAS: OpcaoDeTema[] = [
  {
    valor: 'sistema',
    label: 'Seguir o sistema',
    sub: 'Acompanha o tema do aparelho',
    icon: 'phone-portrait-outline',
  },
  { valor: 'claro', label: 'Claro', sub: 'Fundo claro o tempo todo', icon: 'sunny-outline' },
  { valor: 'escuro', label: 'Escuro', sub: 'Fundo escuro o tempo todo', icon: 'moon-outline' },
];

export default function MenuScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { preferencia, escolher } = useTemaStore();

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

        <Group header="Aparência" footer="A escolha vale só neste aparelho.">
          {TEMAS.map((tema) => (
            <Row
              key={tema.valor}
              icon={tema.icon}
              title={tema.label}
              sub={tema.sub}
              selected={preferencia === tema.valor}
              onPress={() => escolher(tema.valor)}
            />
          ))}
        </Group>

        <Button label="Sair da conta" variant="tinted" fullWidth onPress={signOut} />
      </ScrollView>
    </ScreenLayout>
  );
}
