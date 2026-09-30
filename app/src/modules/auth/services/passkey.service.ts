import { hasPasskeySessionProof, hasPrivilegedSessionProof } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as passkeys from 'react-native-passkeys';
import { hasCurrentMfaAssurance } from './mfa.service';

export interface RegisteredPasskey {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

/** Ativação explícita por ambiente preserva TOTP até a prova em preview. */
export function isPasskeyEnabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_PASSKEY_ENABLED === 'true' &&
    Boolean(process.env.EXPO_PUBLIC_PASSKEY_RP_ID)
  );
}

function requireDeviceSupport(): void {
  if (!isPasskeyEnabled()) {
    throw new Error('Passkeys ainda não estão configuradas neste ambiente.');
  }
  if (!passkeys.isSupported()) {
    throw new Error('Este aparelho não oferece Passkeys. Use um aparelho compatível.');
  }
}

/** Confirma a inscrição pelo Supabase depois da cerimônia nativa do aparelho. */
export async function registerPasskey(): Promise<void> {
  requireDeviceSupport();
  if (!(await hasCurrentMfaAssurance()))
    throw new Error('Confirme o código do autenticador antes de cadastrar o aparelho.');
  const { data, error } = await supabase.auth.passkey.startRegistration();
  if (error || !data) throw error ?? new Error('Desafio de cadastro ausente.');

  const credential = await passkeys.create({ ...data.options, extensions: undefined });
  if (!credential) throw new Error('Cadastro cancelado no aparelho.');

  const result = await supabase.auth.passkey.verifyRegistration({
    challengeId: data.challenge_id,
    credential,
  });
  if (result.error) throw result.error;
}

/** Lista as credenciais do usuário autenticado. */
export async function listPasskeys(): Promise<RegisteredPasskey[]> {
  const { data, error } = await supabase.auth.passkey.list();
  if (error) throw error;
  return data;
}

/** Atualiza um nome curto para reconhecer o aparelho. */
export async function renamePasskey(passkeyId: string, friendlyName: string): Promise<void> {
  const name = friendlyName.trim();
  if (!name || name.length > 120) throw new Error('O nome deve ter entre 1 e 120 caracteres.');
  const { error } = await supabase.auth.passkey.update({ passkeyId, friendlyName: name });
  if (error) throw error;
}

/** Protege o último aparelho contra remoção acidental. */
export async function removePasskey(passkeyId: string): Promise<void> {
  if (!(await hasCurrentMfaAssurance()))
    throw new Error('Confirme o código do autenticador antes de remover o aparelho.');
  const passkeys = await listPasskeys();
  if (passkeys.length < 2) throw new Error('Cadastre outro aparelho antes de remover este.');
  if (!passkeys.some((passkey) => passkey.id === passkeyId))
    throw new Error('A Passkey selecionada não pertence a esta conta.');
  const { error } = await supabase.auth.passkey.delete({ passkeyId });
  if (error) throw error;
}

/** Faz login somente após o Supabase validar a assinatura WebAuthn nativa. */
export async function signInWithPasskey(): Promise<void> {
  requireDeviceSupport();
  const { data, error } = await supabase.auth.passkey.startAuthentication();
  if (error || !data) throw error ?? new Error('Desafio de login ausente.');

  const credential = await passkeys.get({ ...data.options, extensions: undefined });
  if (!credential) throw new Error('Verificação cancelada no aparelho.');

  const result = await supabase.auth.passkey.verifyAuthentication({
    challengeId: data.challenge_id,
    credential,
  });
  if (result.error || !result.data?.session) {
    throw result.error ?? new Error('Sessão do aparelho ausente.');
  }
}

/** UI consulta a sessão; BFF e RLS validam a mesma prova de modo independente. */
export async function hasCurrentPrivilegedProof(): Promise<boolean> {
  const { data, error } = await supabase.auth.getClaims();
  if (error) throw error;
  if (!hasPrivilegedSessionProof(data?.claims ?? null)) return false;
  if (isPasskeyEnabled() && !hasPasskeySessionProof(data?.claims ?? null)) return false;
  if (data?.claims?.aal === 'aal2') return true;
  return hasLegacyTotpFactor();
}

/** Verifica o fator TOTP que protege o cadastro e a troca de aparelhos. */
export async function hasLegacyTotpFactor(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.all.some((factor) => factor.factor_type === 'totp' && factor.status === 'verified');
}
