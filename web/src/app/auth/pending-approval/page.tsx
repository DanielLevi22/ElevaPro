"use client";

import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Poll account status every 30 seconds
  const { data: profile } = useQuery({
    queryKey: ["profile_status"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("account_status, full_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth/login");
  }, [router]);

  // Redirect if approved or rejected
  useEffect(() => {
    if (profile?.account_status === "active") {
      router.push("/dashboard");
      // "rejected" não existe no enum `account_status`: o ramo nunca executava
      // e conta recusada ficava presa nesta tela sem ser deslogada. Recusa e
      // desativação são o mesmo estado no banco: "inactive".
    } else if (profile?.account_status === "inactive") {
      handleLogout();
    }
  }, [profile, router, handleLogout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Glow Effects */}
      <div className="absolute top-1/4 -right-48 w-96 h-96 bg-yellow-500/10 rounded-full blur-[128px] animate-pulse" />
      <div
        className="absolute bottom-1/4 -left-48 w-96 h-96 bg-orange-500/10 rounded-full blur-[128px] animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative max-w-md w-full mx-4 text-center">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              aria-hidden="true"
              className="w-10 h-10 text-yellow-500 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-foreground">Aguardando Aprovação</h1>

          {/* Greeting */}
          {profile?.full_name && (
            <p className="text-muted-foreground">
              Olá, <span className="text-foreground font-medium">{profile.full_name}</span>
            </p>
          )}

          <div className="space-y-4 text-muted-foreground">
            <p>Sua conta de profissional foi criada com sucesso e está em análise.</p>
            <p>
              Para garantir a qualidade da nossa plataforma, todos os cadastros de profissionais
              passam por uma verificação manual.
            </p>
            <p className="text-sm bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg">
              ⏱️ Tempo estimado: até 24 horas
            </p>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <p className="text-sm text-muted-foreground">Verificando status automaticamente...</p>
          </div>

          {/* Info Box */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-left">
            <h3 className="text-sm font-medium text-foreground mb-2">O que acontece agora?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Nossa equipe irá revisar suas informações</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Você receberá uma notificação quando for aprovado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Esta página atualizará automaticamente</span>
              </li>
            </ul>
          </div>

          {/* Logout Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>

          {/* Support */}
          <p className="text-xs text-muted-foreground">
            Dúvidas? Entre em contato:{" "}
            <a href="mailto:suporte@elevapro.app" className="text-primary hover:underline">
              suporte@elevapro.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
