// Antes de tudo: registra os componentes de terceiros no NativeWind. Sem isto,
// todo `className` em LinearGradient e Image é descartado sem aviso.
import '@/lib/nativewind-interop';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { AppAlertHost } from '@/components/ui/appAlert';
import { useColorScheme } from '@/components/useColorScheme';
import { queryClient } from '@/lib/query-client';
import { registerHealthSyncAsync } from '@/services/backgroundHealthTask';
import { registerBackgroundFetchAsync } from '@/services/backgroundTask';
import { requestNotificationPermissions } from '@/services/notificationService';

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

  useEffect(() => {
    // Fonte e acabamento. Lancar aqui trocava um icone sem forma por um app
    // que nao abre -- e era o que acontecia: o erro subia como excecao nao
    // tratada e derrubava a arvore inteira.
    if (error) console.error('[fontes] falha ao carregar', error);
  }, [error]);

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
  const { session, initializeSession, isLoading, accountType, accountStatus } = useAuthStore();

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
      // Redirect based on role and status
      if (accountType === 'specialist' && accountStatus === 'invited') {
        router.replace('/(auth)/pending-approval');
      } else if (accountType === 'specialist') {
        router.replace('/(tabs)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, segments, isLoading, accountType, accountStatus, router]);

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
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
