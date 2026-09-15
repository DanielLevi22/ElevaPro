import type { ReactNode } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';
import { useBrilho, useEscala } from '@/shared/design';

/**
 * A folha do kit de saúde (`.sheet` sobre `.scrim`): sobe do pé da tela com o
 * objeto-herói, o texto que rola e as duas ações empilhadas, com a nota embaixo.
 *
 * É a folha do aceite de dados de saúde e a de retirar uma autorização. As duas
 * pedem uma decisão sobre tratamento de dado: o texto rola, e as ações ficam
 * sempre visíveis, fora da rolagem.
 *
 * @example
 * <GlassSheet
 *   visible
 *   onClose={fechar}
 *   hero={<Pedestal size={104} lift={4}><LockHero scale={0.56} /></Pedestal>}
 *   primary={{ label: 'Aceitar e continuar', onPress: aceitar }}
 *   secondary={{ label: 'Agora não', onPress: fechar }}
 *   footnote="Sem o aceite o app continua funcionando."
 * >
 *   <Text>…</Text>
 * </GlassSheet>
 */
interface SheetAction {
  label: string;
  onPress: () => void;
  /** Rótulo lido pelo leitor de tela, quando o visível não basta. */
  accessibilityLabel?: string;
}

interface GlassSheetProps {
  visible: boolean;
  /** O voltar do Android e o toque no véu. */
  onClose: () => void;
  hero?: ReactNode;
  children: ReactNode;
  primary: SheetAction;
  secondary: SheetAction;
  /** `danger` é a ação que interrompe um tratamento: o botão rosa do kit. */
  tone?: 'primary' | 'danger';
  /** Enquanto grava, as duas ações ficam desligadas. */
  busy?: boolean;
  footnote?: string;
}

/** O `0 10px 26px -10px` do botão principal do kit. */
const PRIMARY_GLOW = { y: 10, blur: 26, espalhamento: -10 } as const;

export function GlassSheet({
  visible,
  onClose,
  hero,
  children,
  primary,
  secondary,
  tone = 'primary',
  busy = false,
  footnote,
}: GlassSheetProps) {
  const insets = useSafeAreaInsets();
  const brilho = useBrilho();
  const escalar = useEscala();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Fechar"
          className="absolute inset-0 bg-veu-da-folha"
        />
        <View className="max-h-[88%] rounded-t-[2rem] border-t border-glass-border bg-background">
          {/* `shrink` sem `grow`, e não `flex-1`: a folha só tem `max-h`, e com
              `flex-1` a rolagem dividia uma altura que não existe e colapsava a
              zero — as ações apareciam sem o texto que decidem. */}
          <ScrollView
            className="shrink grow-0"
            contentContainerClassName="px-[1.625rem] pt-[1.375rem] pb-2"
          >
            {hero}
            {children}
          </ScrollView>

          <View
            className="gap-[0.5625rem] px-[1.625rem] pt-3.5"
            style={{ paddingBottom: insets.bottom + escalar(26) }}
          >
            <TouchableOpacity
              onPress={primary.onPress}
              disabled={busy}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={primary.accessibilityLabel ?? primary.label}
              accessibilityState={{ disabled: busy }}
              className={cn(
                'h-[2.625rem] items-center justify-center rounded-[0.8125rem]',
                tone === 'danger' ? 'bg-perigo' : 'bg-primary'
              )}
              style={
                tone === 'primary' ? { boxShadow: brilho(PRIMARY_GLOW, { alfa: 0.8 }) } : undefined
              }
            >
              <Text
                className={cn(
                  'text-[0.71875rem] font-extrabold uppercase tracking-wide',
                  tone === 'danger' ? 'text-sobre-perigo' : 'text-primary-foreground'
                )}
              >
                {primary.label}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={secondary.onPress}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={secondary.accessibilityLabel ?? secondary.label}
              accessibilityState={{ disabled: busy }}
              className="h-[2.625rem] items-center justify-center overflow-hidden rounded-[0.8125rem] border border-glass-border"
            >
              <View className="absolute inset-0 bg-glass-strong" />
              <Text className="text-[0.71875rem] font-extrabold uppercase tracking-wide text-foreground">
                {secondary.label}
              </Text>
            </TouchableOpacity>

            {footnote ? (
              <Text className="mt-[0.1875rem] text-center text-[0.75rem] leading-[1.125rem] text-muted-foreground">
                {footnote}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export type { GlassSheetProps, SheetAction };
