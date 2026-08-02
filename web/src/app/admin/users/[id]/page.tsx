"use client";

import { supabase } from "@elevapro/supabase";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { AccountTypeBadge } from "@/shared";

interface UserDetails {
  id: string;
  email: string;
  full_name: string | null;
  account_type: string;
  account_status: string | null;
  created_at: string;
  last_login_at: string | null;
  is_super_admin: boolean;
  admin_notes: string | null;
}

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    variant: "info" as "info" | "danger" | "success" | "warning",
    action: async () => {},
  });
  const [actionLoading, setActionLoading] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

      if (error) throw error;

      setUser(data);
      setEditedNotes(data.admin_notes || "");
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId, loadUser]);

  async function saveNotes() {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ admin_notes: editedNotes })
        .eq("id", userId);

      if (error) throw error;

      setUser((prev) => (prev ? { ...prev, admin_notes: editedNotes } : null));
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  }

  const openConfirmation = (
    title: string,
    message: string,
    variant: "info" | "danger" | "success" | "warning",
    action: () => Promise<void>,
  ) => {
    setModalConfig({ title, message, variant, action });
    setModalOpen(true);
  };

  const handleConfirmAction = async () => {
    setActionLoading(true);
    try {
      await modalConfig.action();
      setModalOpen(false);
    } catch (error) {
      console.error("Action failed:", error);
      alert("Ocorreu um erro ao executar a ação. Verifique o console para mais detalhes.");
    } finally {
      setActionLoading(false);
    }
  };

  async function changeAccountType(newType: string) {
    openConfirmation(
      "Mudar Tipo de Conta",
      `Tem certeza que deseja mudar o tipo de conta para "${newType}"?`,
      "warning",
      async () => {
        const { error } = await supabase
          .from("profiles")
          .update({ account_type: newType })
          .eq("id", userId);

        if (error) throw error;

        setUser((prev) => (prev ? { ...prev, account_type: newType } : null));
      },
    );
  }

  async function updateStatus(newStatus: "active" | "rejected" | "suspended" | "pending") {
    const actionMap: Record<
      string,
      { label: string; variant: "success" | "danger" | "warning" | "info" }
    > = {
      active: { label: "Aprovar", variant: "success" },
      rejected: { label: "Rejeitar", variant: "danger" },
      suspended: { label: "Suspender", variant: "warning" },
      pending: { label: "Marcar como Pendente", variant: "info" },
    };

    const config = actionMap[newStatus];

    openConfirmation(
      `${config.label} Usuário`,
      `Tem certeza que deseja ${config.label.toLowerCase()} este usuário?`,
      config.variant,
      async () => {
        const { error } = await supabase
          .from("profiles")
          .update({ account_status: newStatus })
          .eq("id", userId);

        if (error) throw error;

        setUser((prev) => (prev ? { ...prev, account_status: newStatus } : null));
      },
    );
  }

  const getStatusBadge = (status: string | null) => {
    // Treat null status as 'pending' for professionals, 'active' for others (legacy)
    let s = status;
    if (!s) {
      s = user?.account_type === "specialist" ? "pending" : "active";
    }

    const badges = {
      active: { label: "Ativo", color: "bg-green-500/10 text-green-400 border-green-500/20" },
      pending: {
        label: "Pendente",
        color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      },
      rejected: { label: "Rejeitado", color: "bg-red-500/10 text-red-400 border-red-500/20" },
      suspended: { label: "Suspenso", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    };

    const badge = badges[s as keyof typeof badges] || badges.active;

    return (
      <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando usuário...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground mb-2">Usuário não encontrado</p>
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className="text-primary hover:text-primary/80"
          >
            ← Voltar para usuários
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <ConfirmationModal
        isOpen={modalOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
        onConfirm={handleConfirmAction}
        onCancel={() => setModalOpen(false)}
        isLoading={actionLoading}
      />

      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2"
        >
          ← Voltar para usuários
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {user.full_name || "Sem nome"}
            </h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <AccountTypeBadge
              accountType={user.account_type}
              isSuperAdmin={user.is_super_admin}
              size="md"
            />
            {getStatusBadge(user.account_status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Approval Action Banner */}
          {(user.account_status === "invited" ||
            (user.account_type === "specialist" && !user.account_status)) && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-yellow-400">Aprovação Pendente</h3>
                <p className="text-yellow-200/80 text-sm">
                  Este usuário solicitou acesso como profissional e aguarda aprovação.
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => updateStatus("rejected")}
                  className="flex-1 md:flex-none px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 font-medium transition-colors"
                >
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus("active")}
                  className="flex-1 md:flex-none px-6 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20"
                >
                  Aprovar Acesso
                </button>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Informações Básicas</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID do Usuário</label>
                <p className="text-foreground font-mono text-sm mt-1">{user.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground mt-1">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-foreground mt-1">{user.full_name || "Não definido"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de Conta</label>
                <div className="mt-2">
                  <AccountTypeBadge
                    accountType={user.account_type}
                    isSuperAdmin={user.is_super_admin}
                    size="md"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status da Conta</label>
                <div className="mt-2">{getStatusBadge(user.account_status)}</div>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Atividade</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Criado em</label>
                <p className="text-foreground mt-1">{new Date(user.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Último Login</label>
                <p className="text-foreground mt-1">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Nunca"}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Notas do Admin</h2>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Editar
                </button>
              )}
            </div>
            {isEditing ? (
              <div>
                <label htmlFor="admin-notes-textarea" className="sr-only">
                  Editar Notas do Admin
                </label>
                <textarea
                  id="admin-notes-textarea"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Adicionar notas internas sobre este usuário..."
                />
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={saveNotes}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedNotes(user.admin_notes || "");
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {user.admin_notes || "Nenhuma nota ainda"}
              </p>
            )}
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Account Status Actions */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Gerenciar Status</h3>
            <div className="space-y-2">
              {user.account_status !== "active" && (
                <button
                  type="button"
                  onClick={() => updateStatus("active")}
                  className="w-full px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 font-medium transition-colors"
                >
                  Ativar Conta
                </button>
              )}
              {user.account_status !== "suspended" && (
                <button
                  type="button"
                  onClick={() => updateStatus("suspended")}
                  className="w-full px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded-lg hover:bg-orange-500/30 font-medium transition-colors"
                >
                  Suspender Conta
                </button>
              )}
              {user.account_status !== "rejected" && (
                <button
                  type="button"
                  onClick={() => updateStatus("rejected")}
                  className="w-full px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 font-medium transition-colors"
                >
                  Rejeitar Conta
                </button>
              )}
            </div>
          </div>

          {/* Change Account Type */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Mudar Tipo de Conta</h3>
            <div className="space-y-2">
              {["admin", "specialist", "student", "member"].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => changeAccountType(type)}
                  disabled={user.account_type === type}
                  className={`w-full px-4 py-2 rounded-lg font-medium text-left transition-colors ${
                    user.account_type === type
                      ? "bg-primary/20 text-primary cursor-not-allowed"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          {!user.is_super_admin && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-400 mb-4">Zona de Perigo</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    openConfirmation(
                      "Deletar Usuário",
                      "Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.",
                      "danger",
                      async () => {
                        // TODO: Implement delete
                        console.log("Delete user functionality pending");
                      },
                    );
                  }}
                  className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 font-medium"
                >
                  Deletar Usuário
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
