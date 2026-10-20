import { createTotpProtocol, type TotpPort } from '@elevapro/shared';
import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';

/**
 * O autenticador confirmado sozinho no ambiente local (#355).
 *
 * No local a Passkey não funciona (o Android exige `assetlinks.json` num domínio
 * público), e digitar o código a cada login só atrasa quem desenvolve. Aqui o
 * app cadastra o fator, guarda o segredo no aparelho e gera o código — a sessão
 * sai `aal2` de verdade, e RLS e BFF continuam exigindo o segundo fator como em
 * qualquer ambiente. Nada disto roda fora do Supabase da máquina.
 */

export interface BackendEnv {
  isDev: boolean;
  appEnv: string | undefined;
  supabaseUrl: string | undefined;
}

/** O Supabase da máquina, visto do emulador Android (`10.0.2.2`) ou do host. */
const LOCAL_HOSTS = new Set(['10.0.2.2', 'localhost', '127.0.0.1']);

/**
 * Verdadeiro só com as três condições: build de desenvolvimento, ambiente
 * declarado `development` e Supabase num host da máquina.
 *
 * @example isLocalBackend({ isDev: __DEV__, appEnv: 'development', supabaseUrl: 'http://10.0.2.2:47321' })
 */
export function isLocalBackend({ isDev, appEnv, supabaseUrl }: BackendEnv): boolean {
  if (!isDev || appEnv !== 'development' || !supabaseUrl) return false;
  try {
    return LOCAL_HOSTS.has(new URL(supabaseUrl).hostname);
  } catch {
    return false;
  }
}

/** O ambiente deste build, lido das variáveis que o Expo embute. */
export function currentBackendEnv(): BackendEnv {
  return {
    isDev: __DEV__,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  };
}

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_MS = 30_000;
const DIGITS = 6;

function base32Decode(secret: string): Uint8Array {
  const bits = [...secret.replace(/=+$/, '').toUpperCase()]
    .map((char) => {
      const value = BASE32.indexOf(char);
      if (value < 0)
        throw new Error(`Segredo TOTP fora da base32: "${char}" em ${secret.length} caracteres`);
      return value.toString(2).padStart(5, '0');
    })
    .join('');
  const bytes = bits.match(/.{8}/g) ?? [];
  return Uint8Array.from(bytes.map((byte) => Number.parseInt(byte, 2)));
}

/**
 * O código de 6 dígitos do RFC 6238 (HMAC-SHA1, passo de 30s) no instante dado.
 *
 * @example totpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59_000) // '287082'
 */
export function totpCode(secret: string, nowMs: number): string {
  const counter = new Uint8Array(8);
  new DataView(counter.buffer).setBigUint64(0, BigInt(Math.floor(nowMs / STEP_MS)));
  const digest = hmac(sha1, base32Decode(secret), counter);
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = new DataView(digest.buffer, digest.byteOffset).getUint32(offset) & 0x7fffffff;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

export interface SecretStore {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
}

/**
 * Confirma o segundo fator sem a pessoa digitar: cadastra o TOTP se não houver,
 * ou usa o segredo guardado do cadastro anterior. Devolve `false` quando não
 * consegue — fator cadastrado num celular, por exemplo —, e a tela manual segue.
 *
 * @example
 * const confirmed = await createLocalMfaConfirmer(supabase.auth.mfa, store).confirm(userId);
 */
export function createLocalMfaConfirmer(
  port: TotpPort,
  store: SecretStore,
  now: () => number = Date.now
) {
  const protocol = createTotpProtocol(port);
  return {
    async confirm(userId: string): Promise<boolean> {
      const key = `totp:${userId}`;
      const challenge = await protocol.beginTotpChallenge();
      if (challenge.secret) store.set(key, challenge.secret);
      const secret = challenge.secret ?? store.get(key);
      if (!secret) return false;
      try {
        await protocol.verifyTotp(challenge.factorId, totpCode(secret, now()));
        return true;
      } catch {
        return false;
      }
    },
  };
}
