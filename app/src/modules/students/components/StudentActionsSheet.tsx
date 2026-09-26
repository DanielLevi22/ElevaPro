import { Modal, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import type { Student } from '../store/studentStore';

/**
 * As ações de um aluno da lista, numa folha que sobe do pé da tela: avaliação
 * física, reenviar o convite e remover.
 *
 * A linha do kit não desenha botões, e a lista antiga tinha três por aluno. A folha
 * guarda as três sem pôr ícone solto em cada linha. Não é a `GlassSheet`: aquela é
 * uma decisão com duas saídas, e aqui é um menu.
 *
 * @example <StudentActionsSheet student={aluno} onClose={fechar} onAssess={avaliar} … />
 */
interface StudentActionsSheetProps {
  student: Student | null;
  onClose: () => void;
  /**
   * Medidas e dobras vão pela Avaliação, que grava. O modal "Editar aluno" que
   * ficava aqui descartava tudo o que era digitado (#334).
   */
  onAssess: (student: Student) => void;
  onResendInvite: (student: Student) => void;
  onRemove: (student: Student) => void;
}

export function StudentActionsSheet({
  student,
  onClose,
  onAssess,
  onResendInvite,
  onRemove,
}: StudentActionsSheetProps) {
  const invited = student?.account_status === 'invited';

  // Fecha antes de agir: a ação abre modal ou confirmação, e duas folhas
  // empilhadas no Android perdem o toque na de cima.
  const run = (action: (student: Student) => void) => () => {
    if (!student) return;
    onClose();
    action(student);
  };

  return (
    <Modal transparent visible={student !== null} animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Fechar" />
      {/* O `SafeAreaView` soma a área do indicador de início ao `pb-4`, como o `ScreenLayout`. */}
      <SafeAreaView
        edges={['bottom']}
        className="rounded-t-[1.75rem] border-t border-glass-border bg-background px-4 pb-4 pt-4"
      >
        <Text numberOfLines={1} className="mb-3 px-1 text-rotulo font-bold text-foreground">
          {student?.full_name || 'Aluno'}
        </Text>
        <LinhaDeVidro
          icon="body-outline"
          tom="marca"
          titulo="Avaliação física"
          sub="Medidas e dobras"
          onPress={run(onAssess)}
        />
        {invited ? (
          <LinhaDeVidro
            icon="mail-unread-outline"
            tom="ritmo"
            titulo="Reenviar convite"
            sub={student?.email || undefined}
            onPress={run(onResendInvite)}
          />
        ) : null}
        <LinhaDeVidro
          icon="trash-outline"
          tom="batimento"
          titulo={invited ? 'Cancelar convite' : 'Remover aluno'}
          sub={invited ? 'O link deixa de valer' : 'Ele perde o acesso aos treinos'}
          onPress={run(onRemove)}
        />
      </SafeAreaView>
    </Modal>
  );
}
