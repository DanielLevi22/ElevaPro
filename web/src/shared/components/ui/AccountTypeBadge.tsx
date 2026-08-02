import type { AccountType } from "@elevapro/shared";

interface BadgeStyle {
  label: string;
  color: string;
}

/**
 * Rótulos e cores por `account_type`.
 *
 * As chaves precisam bater exatamente com o enum do banco — antes eram
 * `professional`/`managed_student`/`autonomous_student`, que não existem mais,
 * e todo lookup caía no fallback cinza mostrando o valor cru.
 *
 * Termos canônicos em docs/GLOSSARY.md.
 */
const BADGE_BY_ACCOUNT_TYPE: Record<AccountType, BadgeStyle> = {
  admin: { label: "Admin", color: "bg-purple-500/20 text-purple-400 border-purple-500/50" },
  specialist: {
    label: "Personal Trainer",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  },
  student: { label: "Aluno", color: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
  member: { label: "Membro", color: "bg-green-500/20 text-green-400 border-green-500/50" },
};

const UNKNOWN_COLOR = "bg-gray-500/20 text-gray-400 border-gray-500/50";

/** `sm` nas listagens, `md` na tela de detalhe — mantém o visual que já existia. */
const SIZE_CLASSES = {
  sm: "px-2 py-1 rounded-md text-xs",
  md: "px-3 py-1 rounded-lg text-sm",
} as const;

interface AccountTypeBadgeProps {
  accountType: string;
  isSuperAdmin?: boolean;
  size?: keyof typeof SIZE_CLASSES;
}

/**
 * Badge de tipo de conta. Um valor fora do enum cai no estilo neutro exibindo
 * o valor cru — sinaliza divergência de schema em vez de escondê-la.
 *
 * @example
 * <AccountTypeBadge accountType={user.account_type} isSuperAdmin={user.is_super_admin} />
 */
export function AccountTypeBadge({
  accountType,
  isSuperAdmin = false,
  size = "sm",
}: AccountTypeBadgeProps) {
  const known = BADGE_BY_ACCOUNT_TYPE[accountType as AccountType];
  const badge = known ?? { label: accountType, color: UNKNOWN_COLOR };
  const label = accountType === "admin" && isSuperAdmin ? "Super Admin" : badge.label;

  return <span className={`${SIZE_CLASSES[size]} font-medium border ${badge.color}`}>{label}</span>;
}
