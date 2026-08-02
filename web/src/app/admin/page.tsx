"use client";

import { supabase } from "@elevapro/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PendingApprovalsList } from "./components/PendingApprovalsList";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSpecialists: number;
  totalStudents: number;
  recentUsers: Array<{
    id: string;
    email: string;
    full_name: string | null;
    account_type: string;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const _router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get active users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_login_at", sevenDaysAgo.toISOString());

      // Get specialists count
      const { count: totalSpecialists } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("account_type", "specialist");

      // Get students count (both types)
      const { count: totalStudents } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("account_type", ["student", "member"]);

      // Get recent users
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, email, full_name, account_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalSpecialists: totalSpecialists || 0,
        totalStudents: totalStudents || 0,
        recentUsers: (recentUsers as DashboardStats["recentUsers"]) || [],
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
          Dashboard Administrativo
        </h1>
        <p className="text-muted-foreground">Visão geral do sistema e aprovações pendentes</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface border border-border p-6 rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total de Usuários</h3>
          <p className="text-3xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-surface border border-border p-6 rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Usuários Ativos (7d)</h3>
          <p className="text-3xl font-bold text-green-400">{stats?.activeUsers || 0}</p>
        </div>
        <div className="bg-surface border border-border p-6 rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Personal Trainers</h3>
          <p className="text-3xl font-bold text-orange-400">{stats?.totalSpecialists || 0}</p>
        </div>
        <div className="bg-surface border border-border p-6 rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Alunos</h3>
          <p className="text-3xl font-bold text-blue-400">{stats?.totalStudents || 0}</p>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div className="mb-8">
        <PendingApprovalsList />
      </div>
    </div>
  );
}
