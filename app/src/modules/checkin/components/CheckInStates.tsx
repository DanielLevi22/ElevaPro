import { View } from 'react-native';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { Vidro } from '@/components/ui/Vidro';
import { WaitStep } from '@/components/ui/WaitStep';

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
 * até ele revisar (ADR-0030, #376).
 *
 * @example <SpecialistReviewState onDone={irParaInicio} />
 */
export function SpecialistReviewState({ onDone }: { onDone: () => void }) {
  return (
    <FlowFrame header={{}} primary={{ label: 'Entendi', icon: 'checkmark', onPress: onDone }}>
      <FlowTitle eyebrow="Check-in enviado">Seu especialista vai revisar sua semana</FlowTitle>
      <Vidro classeExterna="mt-4" className="flex-row items-center gap-3 p-3.5">
        <CaixaDeIcone icon="person-outline" tom="marca" />
        <View className="flex-1">
          <InfoNote icon="chatbubble-ellipses-outline">
            Ele recebe seu check-in e decide se o plano muda. Você será avisado quando ele
            atualizar.
          </InfoNote>
        </View>
      </Vidro>
      <InfoNote icon="information-circle-outline" className="mt-3">
        Nada muda no seu plano até o especialista revisar.
      </InfoNote>
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
