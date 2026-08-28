"use client";

import { CONSENT_HEALTH_COLLECTION, POLICY_VERSION } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "./useAuthUser";

/**
 * Consentimento de dados de saúde do usuário logado, já resolvido contra a
 * versão vigente da política.
 *
 * `POLICY_VERSION` vem de `@elevapro/shared`, não de uma cópia local: a
 * constante existia nos dois lugares até 2026-08-28, e manter paridade à mão
 * não sobrevive à primeira versão nova.
 */
export function useHealthDataConsent() {
  const { data: authUser } = useAuthUser();

  return useQuery({
    queryKey: ["health_data_consent", authUser?.id, POLICY_VERSION],
    queryFn: async () => {
      if (!authUser) return null;
      const { data, error } = await supabase
        .from("student_consents")
        .select("id, given_at, revoked_at, policy_version")
        .eq("student_id", authUser.id)
        .eq("consent_type", CONSENT_HEALTH_COLLECTION)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Consentimento numa versão anterior não vale para a política atual: é o
      // que faz o reconsentimento acontecer em vez de ser só uma constante nova.
      // Devolve a linha mesmo assim, para a tela distinguir "nunca consentiu" de
      // "consentiu num texto antigo" — são pedidos diferentes.
      return { ...data, isCurrent: data.policy_version === POLICY_VERSION && !data.revoked_at };
    },
    enabled: !!authUser,
    staleTime: 1000 * 60 * 10,
  });
}

export function useGrantHealthDataConsent() {
  const queryClient = useQueryClient();
  const { data: authUser } = useAuthUser();

  return useMutation({
    mutationFn: async () => {
      if (!authUser) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("student_consents").upsert(
        {
          student_id: authUser.id,
          consent_type: CONSENT_HEALTH_COLLECTION,
          given_at: new Date().toISOString(),
          revoked_at: null,
          policy_version: POLICY_VERSION,
        },
        { onConflict: "student_id,consent_type" },
      );
      if (error) throw error;
    },
    onSuccess: (_, __, _ctx) =>
      queryClient.invalidateQueries({ queryKey: ["health_data_consent", authUser?.id] }),
  });
}
