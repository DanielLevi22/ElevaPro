"use client";

import { supabase } from "@elevapro/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AccountTypeBadge } from "@/shared";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  account_type: string;
  account_status: string | null;
  created_at: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);

      const query = supabase
        .from("profiles")
        .select("id, email, full_name, account_type, account_status, created_at")
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function updateStatus(userId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: newStatus })
        .eq("id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, account_status: newStatus } : u)),
      );
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erro ao atualizar status do usuário");
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || user.account_type === filterType;

    // Handle null status as 'active' for backward compatibility if needed, or strict check
    const userStatus = user.account_status || "active";
    const matchesStatus = filterStatus === "all" || userStatus === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string | null) => {
    const s = status || "active";
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
      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
          Gerenciamento de Usuários
        </h1>
        <p className="text-muted-foreground">Gerencie todos os usuários do sistema</p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search-users" className="sr-only">
              Buscar por nome ou email
            </label>
            <input
              id="search-users"
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="sr-only">
              Filtrar por status
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="pending">Pendente</option>
              <option value="rejected">Rejeitado</option>
              <option value="suspended">Suspenso</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label htmlFor="type-filter" className="sr-only">
              Filtrar por tipo
            </label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os Tipos</option>
              <option value="admin">Admin</option>
              <option value="specialist">Personal Trainer</option>
              <option value="student">Aluno</option>
              <option value="member">Membro</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Mostrando {filteredUsers.length} de {users.length} usuários
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Tabela de usuários cadastrados">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Usuário
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Criado em
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      router.push(`/admin/users/${user.id}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`Ver detalhes de ${user.full_name || user.email}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {user.full_name || "Sem nome"}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <AccountTypeBadge accountType={user.account_type} />
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(user.account_status)}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(user.account_status === "invited" ||
                        (user.account_type === "specialist" && !user.account_status)) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(user.id, "active");
                          }}
                          className="text-green-500 hover:text-green-400 font-medium text-sm px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-md transition-colors"
                          title="Aprovar Acesso"
                        >
                          Aprovar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/users/${user.id}`);
                        }}
                        className="text-primary hover:text-primary/80 font-medium text-sm"
                      >
                        Ver →
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
