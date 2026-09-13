import { contagem, dataCurta, type Periodization, progressoDoCiclo } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { DadoComIcone } from '@/components/ui/DadoComIcone';
import { Vidro } from '@/components/ui/Vidro';

/**
 * Em que semana do ciclo o aluno está, e do que o ciclo é feito.
 *
 * Antes do início não há "Semana 0 de 16" — o cartão diz quando começa. É a
 * única diferença do kit, que só desenha o ciclo em andamento.
 *
 * @example
 * <CartaoDoCiclo periodizacao={p} fases={3} treinos={12} especialista="Daniel L." />
 */
interface CartaoDoCicloProps {
  periodizacao: Periodization;
  fases: number;
  treinos: number;
  especialista: string | null;
}

export function CartaoDoCiclo({ periodizacao, fases, treinos, especialista }: CartaoDoCicloProps) {
  const progresso = progressoDoCiclo(periodizacao.start_date, periodizacao.end_date, new Date());

  return (
    <Vidro classeExterna="mt-[1.125rem]" className="p-4">
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-[0.84375rem] font-bold text-foreground">
          {progresso.semanaAtual === 0
            ? `Começa em ${dataCurta(periodizacao.start_date)}`
            : `Semana ${progresso.semanaAtual} de ${progresso.totalSemanas}`}
        </Text>
        <Text className="text-micro text-muted-foreground">{progresso.percentual}%</Text>
      </View>
      <BarraDeProgresso percentual={progresso.percentual} />
      <View className="mt-3 flex-row flex-wrap gap-x-[1.125rem] gap-y-1">
        <DadoComIcone icone="layers-outline" texto={contagem(fases, 'fase', 'fases')} />
        <DadoComIcone icone="barbell-outline" texto={contagem(treinos, 'treino', 'treinos')} />
        {especialista ? <DadoComIcone icone="person-outline" texto={especialista} /> : null}
      </View>
    </Vidro>
  );
}
