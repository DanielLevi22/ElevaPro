import { type ConsentState, createHealthService, POLICY_VERSION } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Bullet } from '@/components/ui/Bullet';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { LockHero } from '@/components/ui/LockHero';
import { Pedestal } from '@/components/ui/Pedestal';
import { useConsentPromptStore } from './consentPromptStore';

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

const ITENS_ARMAZENADOS = [
  'Passos e calorias do dia',
  // A 1.7 existe por esta linha: a prontidão é inferência gravada (ADR-0029). O
  // sono e a FC de repouso, da 1.3, faltavam na lista e entram junto.
  'Duração do sono e frequência cardíaca de repouso, e a prontidão do dia calculada deles contra a sua própria média',
  'Treinos executados, com séries e cargas',
  // A 1.6 existe por esta linha: as zonas passaram a ser guardadas, e a idade da
  // anamnese passou a calculá-las.
  'Das suas corridas, a frequência cardíaca média e o tempo em cada zona de esforço, calculadas com a idade da sua anamnese',
  'Refeições registradas do seu plano',
  'A água que você registra no dia',
  'O que você escreve no feedback de fim de treino',
];

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
      // Dizia que sem o aceite o app "para de registrar treinos, refeições e
      // medidas", e não para: treino e refeição não consultam o aceite. O que
      // consulta é a leitura do relógio, a anotação e a FC da sessão, a água (a RLS
      // da 0052) e as rotas de inteligência artificial
      // (`authorizeStudentWithHealthConsent`). Quem
      // recusa decide pelo que perde, e o texto precisa dizer o que é (#308).
      footnote="Sem o aceite o app continua funcionando e seus treinos e refeições seguem registrados. Ficam de fora os dados do relógio, a água do dia, as anotações e a frequência cardíaca dos treinos, e as funções de inteligência artificial."
    >
      <Text className="mt-2 text-center font-display-black text-[1.4375rem] tracking-tight text-foreground">
        Seus dados de saúde
      </Text>
      <Text className="mt-[0.4375rem] text-center text-[0.8125rem] leading-[1.2rem] text-muted-foreground">
        {missing === 'outdated'
          ? 'Atualizamos o texto que explica o que guardamos e quem lê. Precisamos do seu aceite outra vez.'
          : 'Antes de guardar qualquer dado de saúde, leia o que guardamos, o que sai do aparelho e quem lê.'}
      </Text>

      <SheetHeading>O que é armazenado</SheetHeading>
      {ITENS_ARMAZENADOS.map((item) => (
        <Bullet key={item}>{item}</Bullet>
      ))}

      {/* A 1.5 existe por este parágrafo: o scan e o assistente mandavam foto
          e contexto do dia para fora do aparelho, e o texto não dizia. */}
      <SheetHeading>O que sai do aparelho</SheetHeading>
      <Paragraph>
        Quando você fotografa um prato ou pergunta ao assistente de nutrição, a foto, a pergunta,
        seu plano alimentar e o que falta de calorias e macros do dia vão a um serviço de
        inteligência artificial externo, só para gerar a resposta. A foto não é guardada, e seu nome
        não vai junto.
      </Paragraph>

      <SheetHeading>Quem lê</SheetHeading>
      <Paragraph>{hasSpecialist ? QUEM_LE_COM_ESPECIALISTA : QUEM_LE_SEM_ESPECIALISTA}</Paragraph>

      {/* Opacidade cheia: com `/70` este parágrafo ficava em 4.04:1 sobre a
          superfície, abaixo do mínimo de 4.5:1 — e é justamente o texto que
          declara a base legal do tratamento. */}
      <Text className="mt-3.5 text-[0.71875rem] leading-[1.08rem] text-muted-foreground">
        Base legal: Tutela da saúde (Art. 11, II, f) e Consentimento (Art. 11, I) da LGPD. Você pode
        revogar quando quiser no seu perfil, em Minhas autorizações — a revogação vale daqui para
        frente e não apaga o que já foi registrado. Versão {POLICY_VERSION} da política.
      </Text>
    </GlassSheet>
  );
}

/**
 * O Praticante não tem especialista: dizer a ele que "o especialista vinculado"
 * lê seria descrever um tratamento que não acontece. O texto diz o de hoje e o que
 * muda se ele se vincular, porque o aceite de agora vale para esse dia (#308).
 */
const QUEM_LE_COM_ESPECIALISTA =
  'O especialista vinculado a você — inclusive o que você escrever no feedback de fim de treino. É para esse acompanhamento que o feedback existe: é ele que permite ajustar a sua prescrição quando algo dói ou some.';
const QUEM_LE_SEM_ESPECIALISTA =
  'Hoje, só você. Se você se vincular a um especialista, ele passa a ler estes dados — inclusive o que você escrever no feedback de fim de treino, que é para esse acompanhamento que ele existe.';

function SheetHeading({ children }: { children: string }) {
  return (
    <Text className="mb-[0.5625rem] mt-5 text-[0.84375rem] font-bold text-foreground">
      {children}
    </Text>
  );
}

function Paragraph({ children }: { children: string }) {
  return (
    <Text className="text-[0.8125rem] leading-[1.2rem] text-muted-foreground">{children}</Text>
  );
}
