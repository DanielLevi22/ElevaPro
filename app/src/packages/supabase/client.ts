import type { Database } from '@elevapro/shared';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

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

const isWeb = Platform.OS === 'web';

/**
 * Sessão em MMKV, não em SecureStore.
 *
 * O `SecureStore` do Android recusa valores acima de 2048 bytes, e uma sessão
 * do Supabase — dois JWT mais metadados — passa disso com folga. O gravar
 * falhava em silêncio e o login "sumia" no restart sem nenhum erro visível.
 *
 * MMKV não tem esse teto e já é o storage do resto do app.
 */
const sessionStorage = createMMKV({ id: 'supabase-auth' });

const mmkvStorageAdapter = {
  getItem: (key: string) => sessionStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => {
    sessionStorage.set(key, value);
  },
  removeItem: (key: string) => {
    sessionStorage.remove(key);
  },
};

// O genérico `Database` é o que faz `.from().select()` ser verificado. Sem ele
// toda consulta do mobile devolvia `any`: coluna inexistente, tabela renomeada e
// nulabilidade errada não eram erro de compilação — só 42703 em runtime, quase
// sempre engolido por um `catch` que só logava.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Entregue na construção. Antes o adapter era atribuído depois, em
    // `supabase.auth.storage`, e o cliente já tinha inicializado com o storage
    // de memória — a sessão nunca chegava ao disco.
    storage: isWeb ? undefined : mmkvStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // Fora da web não existe URL de callback para inspecionar. Ligado, o
    // GoTrue tenta ler a sessão da URL durante o initialize e o login trava.
    // A detecção antiga era `navigator.product === 'ReactNative'`, que não é
    // garantido no Hermes — quando dava falso, isto virava `true` no Android.
    detectSessionInUrl: isWeb,
  },
});

/**
 * @deprecated O storage agora é entregue na construção do cliente. Mantida
 * porque `app/src/lib/supabase.ts` ainda a chama; remover junto com aquele
 * arquivo.
 */
export const setSupabaseStorage = (_storage: unknown) => {
  // Intencionalmente vazio: atribuir storage depois da construção não tinha
  // efeito e mascarava o defeito real.
};
