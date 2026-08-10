"use client";

import { supabase } from "@elevapro/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/modules/auth";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const updateSession = useAuthStore((state) => state.updateSession);

  useEffect(() => {
    // Initialize auth on mount
    initialize();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateSession(session);
    });

    return () => subscription.unsubscribe();
  }, [initialize, updateSession]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    // enableSystem desligado de propósito: as telas nunca foram exercitadas no
    // tema claro, então seguir o SO jogaria usuário em tela não validada sem ele
    // pedir. O claro é opt-in pelo ThemeToggle até a fase 4 do PRD
    // design-system-unification zerar os hex cravados.
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
