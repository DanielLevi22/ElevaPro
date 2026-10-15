import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEscala } from '@/shared/design';
import { BotaoRedondo } from './BotaoRedondo';

interface BottomSheetProps {
  visible: boolean;
  /** O voltar do Android, o toque no véu e o "x". */
  onClose: () => void;
  title: string;
  /** O que o leitor de tela diz no "x" e no véu: "Fechar sem mudar". */
  closeLabel: string;
  children: ReactNode;
}

/** O respiro abaixo do conteúdo, por cima da área segura. */
const BOTTOM_GAP = 24;

/**
 * A folha de baixo do kit: sobe do pé da tela com a alça, o título e o "x", e o
 * conteúdo embaixo. O teclado empurra a folha no iOS, para campo nenhum ficar
 * escondido. Para a decisão sobre dado de saúde, com o texto que rola e as duas
 * ações fixas, é a `GlassSheet`.
 *
 * @example
 * <BottomSheet visible={aberta} onClose={fechar} title="Mudar meu plano" closeLabel="Fechar sem mudar">
 *   <LinhaDeVidro … />
 * </BottomSheet>
 */
export function BottomSheet({ visible, onClose, title, closeLabel, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const escalar = useEscala();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          className="absolute inset-0 bg-veu-da-folha"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View
          className="rounded-t-[1.75rem] border-t border-glass-border bg-background px-[1.125rem] pt-2.5"
          style={{ paddingBottom: insets.bottom + escalar(BOTTOM_GAP) }}
        >
          <View className="mx-auto mb-3.5 h-[0.3125rem] w-[2.375rem] rounded-full bg-placeholder" />
          <View className="flex-row items-center justify-between gap-3">
            <Text
              numberOfLines={1}
              className="flex-1 font-display-black text-[1.3125rem] tracking-tight text-foreground"
            >
              {title}
            </Text>
            <BotaoRedondo icone="x" rotulo={closeLabel} onPress={onClose} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
