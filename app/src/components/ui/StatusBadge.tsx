import { Badge, type BadgeProps } from './Badge';

/**
 * Traduz estado do produto em selo: o que "rascunho" é, e de que cor.
 *
 * A tradução é o domínio, e mora aqui; pintar a pílula é o `Badge`. Antes as
 * duas coisas estavam no mesmo lugar, com os hexadecimais da paleta coral
 * escritos à mão na tabela.
 */
export type StatusType = 'active' | 'draft' | 'completed' | 'pending' | 'canceled';

interface StatusBadgeProps {
  status: StatusType | string;
  showDot?: boolean;
}

const ESTADO: Record<StatusType, { label: string; tone: BadgeProps['tone'] }> = {
  active: { label: 'Ativo', tone: 'success' },
  draft: { label: 'Rascunho', tone: 'warning' },
  completed: { label: 'Concluído', tone: 'neutral' },
  pending: { label: 'Pendente', tone: 'warning' },
  canceled: { label: 'Cancelado', tone: 'danger' },
};

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  // Estado desconhecido aparece cru em vez de sumir: dado de produção com valor
  // fora da lista é informação, não motivo para tela em branco.
  const estado = ESTADO[status as StatusType] ?? { label: status, tone: 'neutral' as const };

  return (
    <Badge tone={estado.tone} dot={showDot}>
      {estado.label}
    </Badge>
  );
}
