// Antes de tudo: registra os componentes de terceiros no NativeWind. Sem isto,
// todo `className` em LinearGradient e Image é descartado sem aviso.
import '@/lib/nativewind-interop';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import { Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { supabase } from '@elevapro/supabase';
import { useAuthStore } from '@/auth';
import { HealthDataConsentGate } from '@/components/consent/HealthDataConsentGate';
import { AppAlertHost } from '@/components/ui/appAlert';
import { useColorScheme } from '@/components/useColorScheme';
import { queryClient } from '@/lib/query-client';
import { registerHealthSyncAsync } from '@/services/backgroundHealthTask';
import { registerBackgroundFetchAsync } from '@/services/backgroundTask';
import { requestNotificationPermissions } from '@/services/notificationService';
import { assertBffConfigured } from '@/shared/bff';
import { ajustarEscalaDeTexto } from '@/shared/design';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // As duas famílias do design. O corpo da interface fica com a fonte do
    // sistema, como o desenho pede — é o que faz o app parecer nativo —, então
    // só estas duas precisam vir junto: Outfit para título e wordmark,
    // JetBrains Mono para conteúdo de natureza numérica.
    //
    // Sem elas, `font-display` era uma classe que 350 lugares pediam e o
    // Tailwind ignorava em silêncio, por não haver família declarada.
    Outfit_700Bold,
    Outfit_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
    // Os icones vinham por conta do `@expo/vector-icons`, que so carrega a
    // fonte quando o primeiro icone renderiza. Com 101 telas usando Ionicons,
    // sao dezenas de `loadAsync` disparados juntos disputando o mesmo arquivo
    // de cache no aparelho -- e o que sobrava era um .ttf de zero byte, com o
    // erro "Font file for ionicons is empty".
    //
    // Aqui carrega uma vez, antes de qualquer tela existir.
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  // O kit foi desenhado num telefone de 390pt; num aparelho de 448dp o mesmo
  // tamanho ocuparia 15% menos da tela. Isto move a base de `rem`, e com ela
  // todo o texto, sem nenhuma tela precisar saber.
  useEffect(() => ajustarEscalaDeTexto(), []);

  useEffect(() => {
    // Fonte e acabamento. Lancar aqui trocava um icone sem forma por um app
    // que nao abre -- e era o que acontecia: o erro subia como excecao nao
    // tratada e derrubava a arvore inteira.
    if (error) console.error('[fontes] falha ao carregar', error);
  }, [error]);

  useEffect(() => {
    // Loga, nao lanca: sem EXPO_PUBLIC_API_URL so a IA para, e derrubar o app
    // inteiro por isso seria pior que o defeito. O que importa e o nome da
    // variavel aparecer UMA vez no boot -- antes, a ausencia dela so se
    // manifestava como "erro de rede" dentro de cinco telas diferentes, e a
    // string `"undefined/api/ai/body-scan"` nunca chegava a lugar nenhum.
    // Quem chamar o BFF recebe `BffConfigError`, com o mesmo texto.
    try {
      assertBffConfigured();
    } catch (erro) {
      console.error('[boot]', (erro as Error).message);
    }
  }, []);

  // Move splash hiding to Nav component which knows about Auth state
  // useEffect(() => {
  //   if (loaded) {
  //     SplashScreen.hideAsync();
  //   }
  // }, [loaded]);

  // Sem o `|| error`, uma falha de fonte deixaria o app parado no nada para
  // sempre: `loaded` nunca vira true e a tela fica em branco.
  if (!loaded && !error) {
    return null;
  }

  return <RootLayoutNav loaded={loaded} />;
}

function RootLayoutNav({ loaded }: { loaded: boolean }) {
  const colorScheme = useColorScheme();
  const { session, initializeSession, isLoading, accountType } = useAuthStore();

  const segments = useSegments();
  const router = useRouter();

  // Auth State Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializeSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      initializeSession(session);
    });

    // Request notification permissions
    requestNotificationPermissions();

    // Register background fetch for diet sync
    registerBackgroundFetchAsync();

    // Register background fetch for step/calorie sync
    registerHealthSyncAsync();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [initializeSession]);

  // Hide Splash Screen only when fonts AND auth are ready
  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  // Auth Guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Todo papel entra pelo mesmo lugar. Os três ramos anteriores mandavam
      // para `(tabs)` em dois deles, e o terceiro era a fila de aprovação do
      // especialista, removida na 0050.
      router.replace('/(tabs)');
    }
  }, [session, segments, isLoading, router]);

  // Removed manual loading view to use Native Splash

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(professional)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
          </Stack>
          {/* Fora do Stack: o aviso sobrevive à troca de tela que o disparou. */}
          <AppAlertHost />
          {/*
            Também fora do Stack, e pelo mesmo motivo: o pedido de consentimento
            é sobre a conta, não sobre a tela em que o aluno estava quando o app
            abriu. Aqui ele é feito uma vez por sessão, na porta — e não em cada
            caminho que grava dado de saúde, que é o desenho que já deixou
            passar `toggleMealCompletion`.
          */}
          <HealthDataConsentGate
            studentId={session?.user?.id ?? null}
            isStudent={accountType === 'student' || accountType === 'member'}
            hasSpecialist={accountType === 'student'}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
