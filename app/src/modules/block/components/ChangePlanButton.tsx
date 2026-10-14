import { blockWeek } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/auth';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { useEscala } from '@/shared/design';
import { type ChangeFocus, useReviewStore } from '../store/reviewStore';

const BOTTOM_GAP = 40;

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
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function ChangePlanSheet({
  visible,
  sub,
  onChoose,
  onClose,
}: {
  visible: boolean;
  sub: string;
  onChoose: (focus: ChangeFocus) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const escalar = useEscala();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-veu-da-folha"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar sem mudar"
        />
        <View
          className="rounded-t-[1.75rem] border-t border-glass-border bg-background px-[1.125rem] pt-2.5"
          style={{ paddingBottom: insets.bottom + escalar(BOTTOM_GAP) }}
        >
          <View className="mx-auto mb-3.5 h-[0.3125rem] w-[2.375rem] rounded-full bg-placeholder" />
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-display-black text-[1.3125rem] tracking-tight text-foreground">
              Mudar meu plano
            </Text>
            <BotaoRedondo icone="x" rotulo="Fechar sem mudar" onPress={onClose} />
          </View>
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
          <InfoNote icon="information-circle-outline">
            Só um exercício incomodando? Troque pelo "…" no treino, sem mudar o plano.
          </InfoNote>
        </View>
      </View>
    </Modal>
  );
}
