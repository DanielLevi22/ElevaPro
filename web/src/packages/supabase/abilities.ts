import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import { supabase } from "./client";
import type { AccountStatus, AccountType, ServiceType } from "./types";

export type Action = "create" | "read" | "update" | "delete" | "manage" | "impersonate" | "ban";

export type Subject =
  | "User"
  | "AdminPanel"
  | "SystemSettings"
  | "AuditLogs"
  | "Client"
  | "Workout"
  | "Diet"
  | "Exercise"
  | "Food"
  | "Profile"
  | "Analytics"
  | "Periodization"
  | "HealthMetric"
  | "all";

export type AppAbility = MongoAbility<[Action, Subject]>;

export interface UserContext {
  accountType: AccountType;
  accountStatus?: AccountStatus;
  isSuperAdmin?: boolean;
  services?: ServiceType[];
}

export function defineAbilitiesFor(context: UserContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (context.accountType === "admin") {
    can("manage", "all");
    return build();
  }

  if (context.accountType === "specialist") {
    can("manage", "Client");
    can("read", "Analytics");
    can("read", "Profile");
    can("update", "Profile");
    // Somente leitura: o specialist acompanha a atividade, nunca a edita. O
    // vínculo ativo é conferido pela RLS de health_daily_metrics.
    can("read", "HealthMetric");

    if (context.services?.includes("personal_training")) {
      can("manage", "Workout");
      can("manage", "Exercise");
      can("manage", "Periodization");
      can("read", "Diet");
    }

    if (context.services?.includes("nutrition_consulting")) {
      can("manage", "Diet");
      can("manage", "Food");
      can("read", "Workout");
      can("read", "Periodization");
    }
  }

  if (context.accountType === "student") {
    can("read", "Workout");
    can("read", "Diet");
    can("read", "Exercise");
    can("read", "Profile");
    can("update", "Profile");
    can("manage", "HealthMetric");
  }

  // member: usuário independente — cria e gerencia os próprios planos (sem specialist)
  if (context.accountType === "member") {
    can("read", "Profile");
    can("update", "Profile");
    can("manage", ["Workout", "Diet", "Exercise", "Food", "HealthMetric"]);
  }

  return build();
}

export async function getUserContext(userId: string): Promise<UserContext> {
  const { data: user, error } = await supabase
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", userId)
    .single();

  if (error || !user) throw new Error("User not found");

  const context: UserContext = {
    accountType: user.account_type as AccountType,
    accountStatus: user.account_status as AccountStatus,
  };

  if (user.account_type === "specialist") {
    const { data: services } = await supabase
      .from("specialist_services")
      .select("service_type")
      .eq("specialist_id", userId);

    context.services = (services?.map((s) => s.service_type) || []) as ServiceType[];
  }

  return context;
}
