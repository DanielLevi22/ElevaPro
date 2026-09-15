import { TextInput } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores } from '@/shared/design';

/**
 * O campo de observações do feedback, em vidro. Serve a musculação e o cardio;
 * o exemplo do placeholder é de cada um.
 *
 * @example <NotesField notes={notas} onChange={setNotas} placeholder="Ex.: a subida do km 4 pesou." />
 */
interface NotesFieldProps {
  notes: string;
  onChange: (notes: string) => void;
  placeholder: string;
}

export function NotesField({ notes, onChange, placeholder }: NotesFieldProps) {
  const cores = useCores();

  return (
    <Vidro className="min-h-[5.5rem] p-3.5">
      <TextInput
        value={notes}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
        placeholder={placeholder}
        placeholderTextColor={cores.placeholder}
        accessibilityLabel="Observações da sessão"
        className="min-h-[3.75rem] text-[0.84375rem] leading-snug text-foreground"
      />
    </Vidro>
  );
}
