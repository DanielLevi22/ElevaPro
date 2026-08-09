import { createClient } from '@supabase/supabase-js';

// Platform detection
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// Storage adapter factory
const createStorageAdapter = () => {
  if (isReactNative) {
    // For React Native, storage will be injected from the mobile app
    // This allows us to use expo-secure-store
    return undefined; // Will be set by mobile app
  } else {
    // For web, use localStorage
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  }
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// O Expo escolhe o arquivo .env pelo NODE_ENV, não pelo perfil de build: um APK de
// release lê .env.production, não .env.development. Quando esse arquivo falta, as
// duas variáveis chegam vazias aqui e o app morre logo depois da splash, sem log —
// daí a mensagem dizer qual variável faltou e de onde ela deveria ter vindo.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean);
  throw new Error(
    `Supabase sem configuração: ${missing.join(' e ')} vazia(s). ` +
      `Build de desenvolvimento lê app/.env.development; build de release lê ` +
      `app/.env.production; build no EAS lê as variáveis do environment do perfil ` +
      `(eas.json). Esperado: URL https://<ref>.supabase.co e chave publishable.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !isReactNative,
  },
});

// Helper to set storage for React Native
export const setSupabaseStorage = (storage: unknown) => {
  // This will be called from the mobile app to inject expo-secure-store
  if (isReactNative && storage) {
    (supabase.auth as unknown as { storage: unknown }).storage = storage;
  }
};

// Types export (will be populated later)
export type Database = Record<string, unknown>;
