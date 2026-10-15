import { blockWeek } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useAuthStore, useCan } from '@/auth';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { type ChangeFocus, useReviewStore } from '../store/reviewStore';

const OPTIONS: {
  focus: ChangeFocus;
  icon: 'flag-outline' | 'calendar-outline' | 'location-outline' | 'bandage-outline';
  title: string;
  sub: string;
}[] = [
  {
    focus: 'main_goal',
    icon: 'flag-outline',
    title: 'Mudei de objetivo',
    sub: 'Ex.: de perder gordura para ganhar massa',
  },
  {
    focus: 'training_days',
    icon: 'calendar-outline',
    title: 'Mudaram meus dias',
    sub: 'Mais ou menos dias por semana',
  },
  {
    focus: 'gym_type',
    icon: 'location-outline',
    title: 'Vou treinar em outro lugar',
    sub: 'Casa, academia ou ao ar livre',
  },
  {
    focus: 'injuries',
    icon: 'bandage-outline',
    title: 'Tenho uma dor ou lesão',
    sub: 'O plano evita a região',
  },
];

/**
 * C1 · O "…" da aba Treinos: mudar o plano antes do fim do bloco. Só para o
 * Praticante com bloco próprio; para um exercício só, a troca é pelo "…" do
 * treino, sem mudar o plano.
 *
 * @example <CabecalhoSobreFoto direita={<ChangePlanButton />} … />
 */
export function ChangePlanButton() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const block = useActiveBlock(userId);
  const startEarly = useReviewStore((state) => state.startEarly);
  const [open, setOpen] = useState(false);
  const canRest = useCan('create', 'RestPeriod');
  if (!block) return null;
  const week = blockWeek(block, localDateKey());

  function choose(focus: ChangeFocus) {
    setOpen(false);
    startEarly(focus);
    router.push(ROUTES.BLOCK.CHANGES);
  }

  return (
    <>
      <BotaoRedondo icone="ellipsis" rotulo="Mudar meu plano" onPress={() => setOpen(true)} />
      <ChangePlanSheet
        visible={open}
        sub={`Você está na semana ${Math.max(1, week.week)} de ${week.total} do ${block.name.split(' · ')[0]}.`}
        onChoose={choose}
        onRest={
          canRest
            ? () => {
                setOpen(false);
                router.push(ROUTES.BLOCK.REST);
              }
            : null
        }
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function ChangePlanSheet({
  visible,
  sub,
  onChoose,
  onRest,
  onClose,
}: {
  visible: boolean;
  sub: string;
  onChoose: (focus: ChangeFocus) => void;
  /** Nulo sem permissão de pausar: a opção some. */
  onRest: (() => void) | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Mudar meu plano"
      closeLabel="Fechar sem mudar"
    >
      <Text className="mb-3 mt-1 text-[0.78125rem] text-muted-foreground">{sub}</Text>
      {OPTIONS.map((option) => (
        <LinhaDeVidro
          key={option.focus}
          icon={option.icon}
          tom="marca"
          titulo={option.title}
          sub={option.sub}
          onPress={() => onChoose(option.focus)}
        />
      ))}
      {onRest ? (
        <LinhaDeVidro
          icon="pause-circle-outline"
          tom="marca"
          titulo="Preciso de uma pausa"
          sub="Modo Descanso: doença, lesão ou viagem"
          onPress={onRest}
        />
      ) : null}
      <InfoNote icon="information-circle-outline">
        Só um exercício incomodando? Troque pelo "…" no treino, sem mudar o plano.
      </InfoNote>
    </BottomSheet>
  );
}
