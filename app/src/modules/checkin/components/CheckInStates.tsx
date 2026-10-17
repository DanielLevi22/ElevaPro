import { dataCurtaDoInstante, type RecordedAdjustment, type WeightPoint } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { Vidro } from '@/components/ui/Vidro';
import { WaitStep } from '@/components/ui/WaitStep';
import { TargetChange } from './TargetChange';

/**
 * A5 · Calculando, e o mesmo passo a passo parado quando a rede falha: as
 * respostas já estão salvas, e "Tentar de novo" só refaz a conta.
 *
 * @example <CalculatingState failed={proposta.isError} onRetry={proposta.refetch} />
 */
export function CalculatingState({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <FlowFrame
      header={{}}
      primary={failed ? { label: 'Tentar de novo', icon: 'refresh', onPress: onRetry } : undefined}
    >
      {failed ? (
        <View className="mt-4">
          <CaixaDeIcone icon="cloud-offline-outline" tom="batimento" tamanho="destaque" />
        </View>
      ) : null}
      <FlowTitle
        eyebrow={failed ? 'Sem conexão' : 'Leva uns segundos'}
        sub={
          failed ? 'Suas respostas estão salvas.' : 'Comparando sua semana com o ritmo da sua meta.'
        }
      >
        {failed ? 'Não conseguimos calcular agora' : 'Calculando seu ajuste'}
      </FlowTitle>
      <Vidro classeExterna="mt-[1.125rem]" className="px-3.5 py-0.5">
        <WaitStep label="Lendo seus registros" state="done" />
        <WaitStep label="Calculando sua tendência" state={failed ? 'stopped' : 'current'} />
        <WaitStep label="Revendo sua meta" state="next" />
      </Vidro>
    </FlowFrame>
  );
}

/**
 * A5 · Variante Aluno: o check-in vai para o especialista, e nada muda no plano
 * até ele revisar (ADR-0030, #376). No lugar da tendência declarada, a última
 * medida que ele registrou.
 *
 * @example <SpecialistReviewState specialistName="Daniel L." lastMeasurement={null} onDone={irParaInicio} />
 */
export function SpecialistReviewState({
  specialistName,
  lastMeasurement,
  onDone,
}: {
  specialistName: string | null;
  lastMeasurement: WeightPoint | null;
  onDone: () => void;
}) {
  const who = specialistName ?? 'Seu especialista';
  return (
    <FlowFrame header={{}} primary={{ label: 'Entendi', icon: 'checkmark', onPress: onDone }}>
      <FlowTitle eyebrow="Check-in enviado">{`${who} vai revisar sua semana`}</FlowTitle>
      {lastMeasurement ? (
        <Vidro classeExterna="mt-4" className="flex-row items-center gap-3 p-3.5">
          <CaixaDeIcone icon="scale-outline" tom="marca" />
          <View className="flex-1">
            <Text className="font-mono text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
              Última medida do especialista
            </Text>
            <Text className="mt-1 font-display-black text-[1.375rem] text-hero">
              {`${lastMeasurement.weightKg.toLocaleString('pt-BR')} kg`}
            </Text>
            <Text className="text-[0.71875rem] text-hero-secondary">
              {`Medida em ${dataCurtaDoInstante(lastMeasurement.assessedAt)}`}
            </Text>
          </View>
        </Vidro>
      ) : null}
      <Vidro classeExterna="mt-3.5" className="flex-row items-center gap-3 p-3.5">
        <Avatar name={who} size="md" />
        <Text className="flex-1 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">
          <Text className="font-bold text-hero">{`${who} recebe seu check-in`}</Text> e decide se o
          plano muda. Você será avisado quando o plano for atualizado.
        </Text>
      </Vidro>
      <InfoNote icon="information-circle-outline" className="mt-3">
        Nada muda no seu plano até o especialista revisar.
      </InfoNote>
    </FlowFrame>
  );
}

/**
 * O check-in já decidido: o ajuste que foi gravado, e não uma proposta nova
 * recalculada sobre a meta que ele mesmo mudou.
 *
 * @example <DecidedState status="approved" adjustment={ajuste} onDone={irParaInicio} />
 */
export function DecidedState({
  status,
  adjustment,
  onDone,
}: {
  status: 'approved' | 'kept';
  adjustment: RecordedAdjustment | null;
  onDone: () => void;
}) {
  const approved = status === 'approved' && adjustment;
  return (
    <FlowFrame
      header={{}}
      primary={{ label: 'Voltar ao início', icon: 'checkmark', onPress: onDone }}
    >
      <FlowTitle
        eyebrow="Ajuste da semana"
        sub={
          approved ? 'Cardápio refeito para a nova meta.' : 'Sua meta seguiu igual nesta semana.'
        }
      >
        {approved ? 'Plano atualizado' : 'Meta mantida'}
      </FlowTitle>
      {approved ? (
        <TargetChange
          label="Aprovado"
          before={adjustment.beforeCalories}
          after={adjustment.afterCalories}
        />
      ) : null}
    </FlowFrame>
  );
}

/**
 * Sem dieta própria com meta: o check-in fica registrado, e não há o que ajustar.
 *
 * @example <NoTargetState onDone={irParaInicio} />
 */
export function NoTargetState({ onDone }: { onDone: () => void }) {
  return (
    <FlowFrame header={{}} primary={{ label: 'Entendi', icon: 'checkmark', onPress: onDone }}>
      <FlowTitle
        eyebrow="Check-in registrado"
        sub="Sem uma dieta ativa com meta de calorias, não há meta para ajustar esta semana."
      >
        Sua semana ficou registrada
      </FlowTitle>
    </FlowFrame>
  );
}
