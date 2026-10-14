import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { Avatar } from '@/components/ui/Avatar';
import { showConfirm } from '@/components/ui/appAlert';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useProfileOverview } from '../hooks/useProfileOverview';

/**
 * O menu no kit de vidro: o destino da ação "Menu" do "+" e da engrenagem do
 * perfil. Atalhos para o que não está na barra, a aparência e sair.
 *
 * @example <MenuScreen />
 */
export function MenuScreen() {
  const router = useRouter();
  const { user, signOut, accountType } = useAuthStore();
  const isStudent = accountType === 'student' || accountType === 'member';
  const { data: overview } = useProfileOverview(user?.id ?? null);
  const name = overview?.fullName ?? user?.email?.split('@')[0] ?? '';

  const confirmSignOut = () =>
    showConfirm({
      title: 'Sair',
      message: 'Tem certeza que deseja sair?',
      type: 'danger',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      onConfirm: signOut,
    });

  return (
    <GlassScreen bottomSpace="tab">
      <Text
        accessibilityRole="header"
        className="mt-3.5 font-display-black text-[1.75rem] tracking-tight text-hero"
      >
        Menu
      </Text>
      <Vidro classeExterna="mt-4" className="flex-row items-center gap-3.5 p-3.5">
        <Avatar name={name} size="lg" />
        <View className="min-w-0 flex-1">
          <Text className="text-[1.0625rem] font-bold tracking-tight text-hero">{name}</Text>
          <Text className="text-[0.78125rem] text-hero-secondary">{user?.email}</Text>
        </View>
      </Vidro>

      <TituloDeSecao estilo="rotulo">Atalhos</TituloDeSecao>
      <LinhaDeVidro
        icon="person-outline"
        tom="marca"
        titulo="Perfil"
        sub="Seus números, acompanhamento e conta"
        onPress={() => router.push(ROUTES.TABS.PROFILE)}
      />
      <LinhaDeVidro
        icon="trophy-outline"
        tom="gordura"
        titulo="Ranking"
        sub="A competição da semana"
        onPress={() => router.push(ROUTES.TABS.RANKING)}
      />
      <LinhaDeVidro
        icon="mic-outline"
        tom="cadencia"
        titulo="Comandos de voz"
        sub="O que dizer durante o treino"
        onPress={() => router.push(ROUTES.HELP.VOICE_COMMANDS)}
      />

      <TituloDeSecao estilo="rotulo">Ajustes</TituloDeSecao>
      <ThemePicker />
      {isStudent ? (
        <LinhaDeVidro
          icon="notifications-outline"
          tom="marca"
          titulo="Avisos"
          sub="O que avisar, quando e o que aparece na tela bloqueada"
          onPress={() => router.push(ROUTES.SETTINGS.NOTICES)}
        />
      ) : null}
      <LinhaDeVidro
        icon="log-out-outline"
        tom="batimento"
        titulo="Sair da conta"
        direita={<View />}
        onPress={confirmSignOut}
      />
    </GlassScreen>
  );
}
