import { supabase } from '@elevapro/supabase';
import { createMMKV } from 'react-native-mmkv';
import { createLocalMfaConfirmer, currentBackendEnv, isLocalBackend } from './localMfa';
import { isPasskeyEnabled } from './passkey.service';

/** Segredos das contas de teste locais; só é escrito quando o backend é a máquina. */
const localSecrets = createMMKV({ id: 'local-dev-mfa' });

const confirmer = createLocalMfaConfirmer(supabase.auth.mfa, {
  get: (key) => localSecrets.getString(key),
  set: (key, value) => localSecrets.set(key, value),
});

/**
 * No Supabase local, confirma o segundo fator sem a tela do autenticador.
 *
 * Com Passkey ligada, `aal2` não basta para a prova da sessão, e confirmar o
 * TOTP de novo a cada volta do guarda viraria laço: aí a tela segue normal.
 *
 * @example
 * if (await confirmLocalMfa(session.user.id)) return; // o guarda roda de novo com a sessão nova
 */
export async function confirmLocalMfa(userId: string): Promise<boolean> {
  if (!isLocalBackend(currentBackendEnv()) || isPasskeyEnabled()) return false;
  try {
    return await confirmer.confirm(userId);
  } catch {
    return false;
  }
}
