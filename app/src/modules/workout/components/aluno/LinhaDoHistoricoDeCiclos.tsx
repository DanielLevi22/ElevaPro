import { type CicloDoAluno, contagem, periodoDoCiclo, progressoDoCiclo } from '@elevapro/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * Um ciclo que não está em andamento, na lista "Histórico": concluído, com
 * check verde, ou planejado, com calendário e esmaecido.
 *
 * @example
 * <LinhaDoHistoricoDeCiclos ciclo={ciclo} onPress={() => abrir(ciclo)} />
 */
interface LinhaDoHistoricoDeCiclosProps {
  ciclo: CicloDoAluno;
  onPress: () => void;
}

const TAMANHO_DO_ICONE = 18;

export function LinhaDoHistoricoDeCiclos({ ciclo, onPress }: LinhaDoHistoricoDeCiclosProps) {
  const cores = useCores();
  const escalar = useEscala();
  const { periodizacao } = ciclo;
  const concluido = periodizacao.status === 'completed';
  const hoje = new Date();
  const semanas = progressoDoCiclo(
    periodizacao.start_date,
    periodizacao.end_date,
    hoje
  ).totalSemanas;
  const detalhe = [
    periodoDoCiclo(periodizacao.start_date, periodizacao.end_date, hoje),
    contagem(semanas, 'semana', 'semanas'),
    contagem(ciclo.fases, 'fase', 'fases'),
  ].join(' · ');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${periodizacao.name}, ${concluido ? 'concluída' : 'planejada'}`}
      className={cn('mb-[0.5625rem]', concluido ? null : 'opacity-70')}
    >
      <Vidro className="flex-row items-center gap-3 p-[0.8125rem]">
        <View className="h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-md bg-glass-strong">
          <MaterialCommunityIcons
            name={concluido ? 'check-circle-outline' : 'calendar-clock'}
            size={escalar(TAMANHO_DO_ICONE)}
            color={concluido ? cores.metricaPassos : cores.placeholder}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[0.90625rem] font-bold tracking-tight text-foreground"
          >
            {periodizacao.name}
          </Text>
          <Text numberOfLines={1} className="mt-px text-[0.71875rem] text-muted-foreground">
            {detalhe}
          </Text>
        </View>
        <Text
          className={cn(
            'text-[0.59375rem] font-extrabold uppercase tracking-wider',
            concluido ? 'text-metrica-passos' : 'text-placeholder'
          )}
        >
          {concluido ? 'Concluída' : 'Planejada'}
        </Text>
      </Vidro>
    </TouchableOpacity>
  );
}
