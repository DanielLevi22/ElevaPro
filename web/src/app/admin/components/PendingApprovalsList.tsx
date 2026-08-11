"use client";

import { supabase } from "@elevapro/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/Button";

interface PendingProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  account_status: "pending";
}

export function PendingApprovalsList() {
  const queryClient = useQueryClient();

  const { data: pendingProfiles = [], isLoading } = useQuery({
    queryKey: ["pending_approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_status", "pending")
        .eq("account_type", "specialist")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingProfile[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "rejected" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_approvals"] });
      alert("Status atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      alert("Erro ao atualizar status.");
    },
  });

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-surface rounded-xl border border-white/5" />;
  }

  if (pendingProfiles.length === 0) {
    return (
      <div className="bg-surface border border-white/10 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Tudo em dia!</h3>
        <p className="text-muted-foreground">
          Não há solicitações de aprovação pendentes no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Aprovações Pendentes</h2>

      <div className="grid gap-4">
        {pendingProfiles.map((profile) => (
          <div
            key={profile.id}
            className="bg-surface border border-yellow-500/20 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 font-bold text-lg">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{profile.full_name}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-yellow-500/80 mt-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Solicitado em {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateStatus.mutate({ id: profile.id, status: "rejected" })}
                disabled={updateStatus.isPending}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                Rejeitar
              </button>
              <Button
                onClick={() => updateStatus.mutate({ id: profile.id, status: "active" })}
                isLoading={updateStatus.isPending}
              >
                {updateStatus.isPending ? "Processando..." : "Aprovar Acesso"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
