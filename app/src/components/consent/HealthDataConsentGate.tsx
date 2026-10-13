import { type ConsentState, createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { LockHero } from '@/components/ui/LockHero';
import { Pedestal } from '@/components/ui/Pedestal';
import { useConsentPromptStore } from './consentPromptStore';
import { CONSENT_REFUSAL_NOTE, HealthConsentDetails } from './HealthConsentDetails';

/**
 * Pede o consentimento de dados de saúde na versão vigente da política, e
 * repete o pedido quando a versão sobe.
 *
 * Existe porque até 2026-08-28 o único registro de consentimento do mobile era
 * efeito colateral de conectar o HealthKit no onboarding
 * (`onboarding/health-connect.tsx`): quem pulava aquela tela nunca consentia, e
 * quem consentia não tinha como ser perguntado de novo. Um `policy_version`
 * novo no banco não alcançava ninguém — não havia superfície que perguntasse.
 *
 * **Gate na porta, não por chamada.** A alternativa era checar `student_consents`
 * dentro de cada gravação de dado de saúde. Isso cobre as chamadas que alguém
 * lembrou de instrumentar e deixa passar as que ainda não existem — foi
 * exatamente o que aconteceu com `toggleMealCompletion`, pendente na seção 10
 * do `LGPD_COMPLIANCE.md` desde que o módulo foi revisado.
 *
 * **Recusar é possível, e é o que torna o consentimento livre (Art. 5°, XII).**
 * "Agora não" fecha o modal e o app segue utilizável; o que não acontece é a
 * gravação de dado de saúde, porque `hasCollectionConsent` continua falso e é
 * ele que os caminhos de escrita consultam. O pedido volta na próxima abertura.
 */
interface HealthDataConsentGateProps {
  /** Id do aluno logado. `null` desliga o gate — sessão ausente ou ainda carregando. */
  studentId: string | null;
  /** Só alunos consentem coleta de saúde. O especialista não é titular deste dado. */
  isStudent: boolean;
  /** O Aluno tem especialista que lê; o Praticante não. Muda o "Quem lê". */
  hasSpecialist: boolean;
}

export function HealthDataConsentGate({
  studentId,
  isStudent,
  hasSpecialist,
}: HealthDataConsentGateProps) {
  // O estado do aceite que falta; `null` quando não falta, e a folha fica fechada.
  const [missing, setMissing] = useState<Exclude<ConsentState, 'granted'> | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  // Uma tela que pede o aceite (o health check, Minhas autorizações) muda este número
  // e a consulta roda de novo: a folha aparece só se o aceite de fato faltar.
  const requests = useConsentPromptStore((state) => state.requests);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `requests` não é lido no efeito; mudar é o próprio pedido para conferir o aceite de novo.
  useEffect(() => {
    if (!studentId || !isStudent) {
      setMissing(null);
      return;
    }

    let active = true;
    // O estado, e não só "consentiu": quem está numa versão antiga lê que o texto
    // mudou; quem retirou ou nunca aceitou, não — para ele não houve texto anterior.
    // A regra de "aceito" é a mesma de `hasCollectionConsent`.
    createHealthService(supabase)
      .getConsentStatus(studentId)
      .then(({ state }) => {
        if (active) setMissing(state === 'granted' ? null : state);
      })
      // Falha de rede não é recusa: pedir consentimento porque a consulta caiu
      // treina o aluno a aceitar sem ler. Os caminhos de escrita já barram
      // sozinhos enquanto o consentimento não for confirmado.
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [studentId, isStudent, requests]);

  const accept = useCallback(async () => {
    if (!studentId) return;
    setSaving(true);
    try {
      await createHealthService(supabase).grantCollectionConsent(studentId);
      setMissing(null);
      // O health check e as autorizações mostram o aceite: sem invalidar, seguiriam
      // dizendo "pendente" até a próxima abertura.
      await queryClient.invalidateQueries({ queryKey: ['consentStatus'] });
    } catch (error: unknown) {
      // Sem corpo: o erro do PostgREST pode trazer o payload da linha.
      console.log('[HealthDataConsentGate] falha ao gravar consentimento:', String(error));
    } finally {
      setSaving(false);
    }
  }, [studentId, queryClient]);

  const close = () => setMissing(null);

  return (
    <GlassSheet
      visible={missing !== null}
      onClose={close}
      busy={saving}
      hero={
        <Pedestal size={104} lift={4}>
          <LockHero scale={0.56} />
        </Pedestal>
      }
      primary={{
        label: saving ? 'Registrando...' : 'Aceitar e continuar',
        accessibilityLabel: 'Aceitar e continuar',
        onPress: accept,
      }}
      secondary={{
        label: 'Agora não',
        accessibilityLabel: 'Agora não, seguir sem registrar dados de saúde',
        onPress: close,
      }}
      footnote={CONSENT_REFUSAL_NOTE}
    >
      <Text className="mt-2 text-center font-display-black text-[1.4375rem] tracking-tight text-foreground">
        Seus dados de saúde
      </Text>
      <Text className="mt-[0.4375rem] text-center text-[0.8125rem] leading-[1.2rem] text-muted-foreground">
        {missing === 'outdated'
          ? 'Atualizamos o texto que explica o que guardamos e quem lê. Precisamos do seu aceite outra vez.'
          : 'Antes de guardar qualquer dado de saúde, leia o que guardamos, o que sai do aparelho e quem lê.'}
      </Text>

      <HealthConsentDetails hasSpecialist={hasSpecialist} />
    </GlassSheet>
  );
}
