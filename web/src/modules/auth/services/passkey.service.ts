import { hasPrivilegedSessionProof } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";

export interface RegisteredPasskey {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

/** Ativação separada por ambiente depois da prova do JWT em preview. */
export function isPasskeyEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PASSKEY_ENABLED === "true";
}

/** Valida a prova da sessão atual; a autorização final permanece no BFF/RLS. */
export async function hasCurrentPrivilegedProof(): Promise<boolean> {
  const { data, error } = await supabase.auth.getClaims();
  if (error) throw error;
  return hasPrivilegedSessionProof(data?.claims ?? null);
}

/** Cadastra a credencial no Supabase após a confirmação do aparelho. */
export async function registerPasskey(): Promise<void> {
  const { error } = await supabase.auth.registerPasskey();
  if (error) throw error;
}

/** Lista apenas as credenciais da conta autenticada. */
export async function listPasskeys(): Promise<RegisteredPasskey[]> {
  const { data, error } = await supabase.auth.passkey.list();
  if (error) throw error;
  return data;
}

/** Dá um nome reconhecível ao aparelho para facilitar a revogação futura. */
export async function renamePasskey(passkeyId: string, friendlyName: string): Promise<void> {
  const name = friendlyName.trim();
  if (!name || name.length > 120) throw new Error("O nome deve ter entre 1 e 120 caracteres.");
  const { error } = await supabase.auth.passkey.update({ passkeyId, friendlyName: name });
  if (error) throw error;
}

/** Remove uma credencial sem permitir que o usuário perca o único aparelho. */
export async function removePasskey(passkeyId: string): Promise<void> {
  const passkeys = await listPasskeys();
  if (passkeys.length < 2) throw new Error("Cadastre outro aparelho antes de remover este.");
  if (!passkeys.some((passkey) => passkey.id === passkeyId))
    throw new Error("A Passkey selecionada não pertence a esta conta.");
  const { error } = await supabase.auth.passkey.delete({ passkeyId });
  if (error) throw error;
}

/** Entra após a assinatura WebAuthn ser verificada pelo Supabase. */
export async function signInWithPasskey(): Promise<void> {
  const { error } = await supabase.auth.signInWithPasskey();
  if (error) throw error;
}

/** Mostra o caminho de transição TOTP apenas para quem já tem fator verificado. */
export async function hasLegacyTotpFactor(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.all.some((factor) => factor.factor_type === "totp" && factor.status === "verified");
}
