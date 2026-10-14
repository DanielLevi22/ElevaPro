import { createSpecialistNoteService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useState } from 'react';
import { Text } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { Input } from '@/components/ui/Input';
import { registrarFalha } from '@/lib/registro';

const notes = createSpecialistNoteService(supabase);

/**
 * A mensagem do especialista a partir do sinal (#376, F8): vira uma nota, que
 * o aluno lê no relatório da semana. Já vem com um começo leve, nunca bronca.
 *
 * @example <NoteSheet student={{ id, name }} onClose={fechar} />
 */
export function NoteSheet({
  student,
  onClose,
}: {
  student: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const firstName = student?.name.split(' ')[0] ?? '';

  async function send() {
    if (!student || !body.trim()) return;
    setSending(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('sem sessão');
      await notes.writeNote({ studentId: student.id, specialistId: data.user.id, body });
      setBody('');
      onClose();
      showAlert({
        title: 'Mensagem enviada',
        message: `${firstName} vê no relatório da semana.`,
        type: 'success',
      });
    } catch {
      registrarFalha('briefing.note');
      showAlert({
        title: 'Não foi possível enviar',
        message: 'Confira a conexão e tente de novo.',
        type: 'error',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <GlassSheet
      visible={student !== null}
      onClose={onClose}
      busy={sending}
      primary={{ label: 'Enviar', onPress: () => void send() }}
      secondary={{ label: 'Cancelar', onPress: onClose }}
    >
      <Text className="text-center font-display-black text-[1.375rem] tracking-tight text-hero">
        {`Mensagem para ${firstName}`}
      </Text>
      <Text className="mb-3 mt-2 text-center text-[0.875rem] text-hero-secondary">
        Um recado curto ajuda mais que uma cobrança.
      </Text>
      <Input
        value={body}
        onChangeText={setBody}
        placeholder={`Oi, ${firstName}! Como foi a semana?`}
        multiline
        accessibilityLabel="Mensagem"
      />
    </GlassSheet>
  );
}
