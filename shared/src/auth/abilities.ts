import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import type { AccountStatus, AccountType, ServiceType } from "../types/auth.types";

/**
 * Tabela de permissões do CASL — fonte única das duas plataformas.
 *
 * Viveu duplicada em `app/src/packages/supabase/abilities.ts` e
 * `web/src/packages/supabase/abilities.ts` até divergir: o mobile concedia
 * `manage Periodization` ao papel `member` e o web não, então a mesma conta via
 * botões diferentes em plataformas diferentes. Divergência de controle de
 * acesso não se resolve sincronizando os dois arquivos — se resolve tendo um.
 *
 * `defineAbilitiesFor` é pura de propósito: não fala com o Supabase. Quem lê o
 * perfil é `getUserContext`/`getUserContextJWT`, que ficam em cada plataforma
 * porque o comportamento ali é genuinamente diferente (o web se autoconserta
 * chamando `/api/auth/ensure-profile`; o mobile repete a leitura com backoff
 * para a corrida do signup recém-criado).
 *
 * **O CASL é a UI, a RLS é a barreira.** Conceder aqui o que o banco recusa
 * produz botão que falha em silêncio — ver a nota sobre `Periodization` abaixo.
 */

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
  | "Hydration"
  | "all";

export type AppAbility = MongoAbility<[Action, Subject]>;

export interface UserContext {
  accountType: AccountType;
  accountStatus?: AccountStatus;
  isSuperAdmin?: boolean;
  services?: ServiceType[];
}

/**
 * Monta as permissões de UI de uma conta.
 *
 * @example
 * const ability = defineAbilitiesFor({ accountType: "specialist", services: ["personal_training"] });
 * if (ability.can("manage", "Workout")) { ... }
 */
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
    // Só o próprio aluno, e nenhum especialista: a RLS de `hydration_daily`
    // (0052) não tem política para ele, porque nenhuma tela dele usa o dado.
    can("manage", "Hydration");
  }

  // member: usuário independente — cria e gerencia os próprios planos (sem specialist).
  //
  // `Periodization` fica de fora, embora o mobile a concedesse. A RLS de
  // `training_periodizations` (migration `0018`) dá ao aluno/member apenas
  // SELECT: escrever é privilégio de quem tem `specialist_id = auth.uid()`.
  // Conceder aqui significaria mostrar botões cuja gravação o banco recusa —
  // sem erro visível, porque RLS não recusa, apenas devolve zero linha.
  // Para o member gerenciar a própria periodização de verdade, primeiro precisa
  // existir política que permita: é migration, não linha de CASL.
  if (context.accountType === "member") {
    can("read", "Profile");
    can("update", "Profile");
    can("manage", ["Workout", "Diet", "Exercise", "Food", "HealthMetric", "Hydration"]);
  }

  return build();
}
