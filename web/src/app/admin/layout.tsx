"use client";

import { supabase } from "@elevapro/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isAdminSessionAllowed } from "@/lib/mfa/admin-access";
import { hasCurrentPrivilegedProof, isPasskeyEnabled } from "@/modules/auth";
import { DashboardSidebar } from "@/shared/components/layout/DashboardSidebar";
import { useSidebarCollapsed } from "@/shared/hooks/useSidebarCollapsed";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { isCollapsed, toggle: toggleCollapse } = useSidebarCollapsed();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  const checkAdminAccess = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // `is_super_admin` não existe em `profiles`, e pedi-la fazia o PostgREST
      // recusar a consulta inteira com 42703. Como o `error` era descartado,
      // `profile` vinha null, a comparação abaixo dava verdadeira e **todo
      // usuário era mandado para /dashboard** — inclusive um admin legítimo.
      // A coluna também não decidia nada: só passava um adorno para o badge.
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("account_type, email")
        .eq("id", user.id)
        .single();

      // Falha de consulta não é "não é admin". Somar as duas foi o que deixou
      // o painel inacessível sem ninguém entender por quê.
      if (error) throw error;

      if (profile?.account_type !== "admin") {
        router.push("/dashboard");
        return;
      }

      if (!isAdminSessionAllowed(profile.account_type, await hasCurrentPrivilegedProof())) {
        router.replace("/auth/mfa");
        return;
      }

      setUserEmail(profile.email || user.email || "");
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: <span aria-hidden="true">📊</span> },
    { href: "/admin/users", label: "Usuários", icon: <span aria-hidden="true">👥</span> },
    { href: "/admin/analytics", label: "Analytics", icon: <span aria-hidden="true">📈</span> },
    {
      href: "/admin/content/exercises",
      label: "Exercícios",
      icon: <span aria-hidden="true">💪</span>,
    },
    { href: "/admin/content/foods", label: "Alimentos", icon: <span aria-hidden="true">🍎</span> },
    {
      href: "/admin/content/meal-media",
      label: "Imagens do cardápio",
      icon: <span aria-hidden="true">🖼️</span>,
    },
    {
      href: "/admin/tecnica",
      label: "Análise de Técnica",
      icon: <span aria-hidden="true">🏋️</span>,
    },
    ...(isPasskeyEnabled()
      ? [
          {
            href: "/admin/security",
            label: "Aparelhos de acesso",
            icon: <span aria-hidden="true">🔑</span>,
          },
        ]
      : []),
  ];

  if (isLoading) {
    return (
      <div className="material-glass flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="material-glass min-h-screen">
      <DashboardSidebar
        navItems={navItems}
        userEmail={userEmail}
        accountLabel="Admin"
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        onLogout={handleLogout}
        contextChips={null}
      />
      <div
        className={`min-h-screen transition-[padding] duration-300 ${isCollapsed ? "lg:pl-22" : "lg:pl-70"}`}
      >
        <main className="w-full min-w-0">{children}</main>
      </div>
    </div>
  );
}
