import { Text, View } from 'react-native';

export type StatusType = 'active' | 'draft' | 'completed' | 'pending' | 'canceled';

interface StatusBadgeProps {
  status: StatusType | string;
  showDot?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  active: {
    label: 'Ativo',
    color: '#00C9A7',
    dotColor: '#00C9A7',
  },
  draft: {
    label: 'Rascunho',
    color: '#FFB800',
    dotColor: '#FFB800',
  },
  completed: {
    label: 'Concluído',
    color: '#71717A',
    dotColor: '#71717A',
  },
  pending: {
    label: 'Pendente',
    color: '#FFB800',
    dotColor: '#FFB800',
  },
  canceled: {
    label: 'Cancelado',
    color: '#FF3B30',
    dotColor: '#FF3B30',
  },
};

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status.toUpperCase(),
    color: '#71717A',
    dotColor: '#71717A',
  };

  const isAtivo = status === 'active';

  return (
    <View className="flex-row items-center">
      {showDot && (
        <View
          // `shadow-lg` na base, e so a COR muda com o estado. Classe
          // `shadow-*` declara variavel CSS, e o css-interop exige que ela
          // exista ja no render inicial -- surgindo depois, ele emite um aviso
          // cuja serializacao de props estoura no getter do
          // NavigationStateContext e derruba a tela com um erro que fala de
          // navegacao. Mesmo defeito que quebrava a anamnese ao responder.
          className={`w-2 h-2 rounded-full mr-2 shadow-lg ${
            isAtivo ? 'shadow-green-500/50' : 'shadow-transparent'
          }`}
          style={{ backgroundColor: config.dotColor }}
        />
      )}
      <Text
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: config.color }}
      >
        {config.label}
      </Text>
    </View>
  );
}
