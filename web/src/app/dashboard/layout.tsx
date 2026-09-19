"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hasCurrentMfaAssurance, useAuth, useAuthStore } from "@/modules/auth";
import { DashboardSidebar } from "@/shared/components/layout/DashboardSidebar";
import { useSidebarCollapsed } from "@/shared/hooks/useSidebarCollapsed";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, abilities, services, isLoading } = useAuth();
  const accountType = useAuthStore((s) => s.accountType);
  const { isCollapsed, toggle: toggleCollapse } = useSidebarCollapsed();
  const [isMfaCheckPending, setIsMfaCheckPending] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (isLoading || !user) return;

    if (accountType === "specialist" || accountType === "admin") {
      setIsMfaCheckPending(true);
      void hasCurrentMfaAssurance()
        .then((hasMfa) => {
          if (!hasMfa) {
            router.replace("/auth/mfa");
            return;
          }
          setIsMfaCheckPending(false);
        })
        .catch(() => router.replace("/auth/mfa"));
      return;
    }

    setIsMfaCheckPending(false);

    // Students/members: only /dashboard/student/*, /dashboard/workouts/*, /dashboard/diets/* allowed
    const memberAllowed =
      pathname.startsWith("/dashboard/student") ||
      pathname.startsWith("/dashboard/workouts") ||
      pathname.startsWith("/dashboard/diets");
    if (
      !isLoading &&
      user &&
      (accountType === "student" || accountType === "member") &&
      !memberAllowed
    ) {
      router.replace("/dashboard/student");
    }
  }, [user, isLoading, router, accountType, pathname]);

  const handleLogout = async () => {
    const { signOut } = useAuthStore.getState();
    await signOut();
    router.push("/auth/login");
  };

  if (isLoading || isMfaCheckPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isStudentOrMember = accountType === "student" || accountType === "member";
  const canManageWorkouts = !isStudentOrMember && abilities?.can("manage", "Workout");
  const canManageDiet = !isStudentOrMember && abilities?.can("manage", "Diet");

  const studentNavItems = [
    {
      href: "/dashboard/student",
      label: "Início",
      icon: (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/workouts",
      label: "Treinos",
      icon: (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/student/nutrition",
      label: "Nutrição",
      icon: (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/student/progress",
      label: "Progresso",
      icon: (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/student/coach",
      label: "Assistente",
      icon: (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/student/anamnesis",
      label: "Anamnese",
      icon: (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/student/profile",
      label: "Perfil",
      icon: (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  const navItems = isStudentOrMember
    ? studentNavItems
    : [
        {
          // Primeiro item de propósito: é a tela que responde "quem precisa de
          // mim hoje", que é a pergunta com que o especialista abre o sistema.
          href: "/dashboard/briefing",
          label: "Briefing",
          icon: (
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          ),
        },
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: (
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          ),
        },
        ...(canManageWorkouts
          ? [
              {
                href: "/dashboard/students",
                label: "Alunos",
                icon: (
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ),
              },
              {
                href: "/dashboard/workouts",
                label: "Treinos",
                icon: (
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                ),
              },
            ]
          : []),
        ...(canManageDiet
          ? [
              {
                href: "/dashboard/diets",
                label: "Dietas",
                icon: (
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                ),
              },
            ]
          : []),
      ];

  return (
    <div className="min-h-screen bg-background text-muted-foreground font-sans selection:bg-primary/30 selection:text-foreground">
      {/* Visual background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -ml-64 -mt-64" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -mr-64 -mb-64" />
      </div>

      <DashboardSidebar
        navItems={navItems}
        userEmail={user.email ?? ""}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        onLogout={handleLogout}
        contextChips={
          <div className="px-6 pb-2 flex flex-wrap gap-1.5">
            {accountType === "student" && (
              <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[9px] font-black text-primary-text uppercase tracking-widest">
                Aluno
              </span>
            )}
            {accountType === "member" && (
              <span className="px-2.5 py-1 bg-secondary/10 border border-secondary/20 rounded-lg text-[9px] font-black text-secondary uppercase tracking-widest">
                Membro
              </span>
            )}
            {!isStudentOrMember &&
              services.map((service) => (
                <span
                  key={service}
                  className="px-2.5 py-1 bg-overlay-05 border border-overlay-08 rounded-lg text-[9px] font-black text-muted-foreground uppercase tracking-widest"
                >
                  {service === "nutrition"
                    ? "🍎 Nutri"
                    : service === "personal_training"
                      ? "⚡ PT"
                      : service}
                </span>
              ))}
          </div>
        }
      />

      {/* Main content area — acompanha a largura do sidebar */}
      <div
        className={`min-h-screen relative z-10 transition-[padding] duration-300 ${isCollapsed ? "lg:pl-22" : "lg:pl-70"}`}
      >
        {/* Sem max-width: com a largura travada, recolher o sidebar so aumentava
            a margem em vez de devolver o espaco ao conteudo. */}
        <main className="w-full min-h-screen p-6 lg:p-8">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">{children}</div>
        </main>
      </div>
    </div>
  );
}
