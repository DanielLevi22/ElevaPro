import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import type { StudentRowState } from '../services/studentListState';
import type { Student } from '../store/studentStore';

/**
 * A linha da lista de alunos do kit: iniciais com a cor do estado, nome, linha de
 * apoio e a aderência à direita — e o "…" que abre as ações do aluno.
 *
 * O estado sai do que o app sabe de verdade: convite pendente ou expirado, sinal de
 * risco do briefing, e a aderência da semana. O kit ainda escreve o plano do aluno
 * ("Hipertrofia · Sem 7"), que a lista não carrega.
 *
 * @example <StudentRow student={aluno} state="ok" adherence={94} onPress={abrir} onActions={menu} />
 */

interface StudentRowProps {
  student: Student;
  state: StudentRowState;
  /** `undefined` enquanto a aderência não chegou; `null` sem plano para medir. */
  adherence: number | null | undefined;
  onPress: () => void;
  onActions: () => void;
}

const TAG: Record<StudentRowState, string> = {
  ok: 'Aderência',
  atRisk: 'Em risco',
  pending: 'Pendente',
  expired: 'Expirado',
};

/** Classe literal por estado: o Tailwind só gera o que aparece escrito no fonte. */
const TONE_TEXT: Record<StudentRowState, string> = {
  ok: 'text-texto-saude-passos',
  atRisk: 'text-texto-perigo',
  pending: 'text-texto-macro-gordura',
  expired: 'text-placeholder',
};
const TONE_BORDER: Record<StudentRowState, string> = {
  ok: 'border-metrica-passos/35',
  atRisk: 'border-metrica-batimento/35',
  pending: 'border-metrica-gordura/35',
  expired: 'border-glass-border',
};
const TONE_DOT: Record<StudentRowState, string> = {
  ok: 'bg-metrica-passos',
  atRisk: 'bg-metrica-batimento',
  pending: 'bg-metrica-gordura',
  expired: 'bg-placeholder',
};

const ACTIONS_ICON = 18;

/** Duas iniciais, do primeiro e do último nome. */
function initials(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${parts[0][0]}${last}`.toUpperCase();
}

function subtitle(student: Student, state: StudentRowState): string {
  if (state === 'expired') return 'Convite expirado';
  if (state === 'pending') return 'Convite enviado';
  return student.email || 'Sem contato';
}

export function StudentRow({ student, state, adherence, onPress, onActions }: StudentRowProps) {
  const cores = useCores();
  const escalar = useEscala();
  const invite = state === 'pending' || state === 'expired';
  const value = invite || adherence === undefined || adherence === null ? '—' : `${adherence}%`;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={state === 'expired'}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <Vidro
        classeExterna={cn('mb-[0.5625rem]', state === 'expired' ? 'opacity-60' : null)}
        className="flex-row items-center gap-3 p-[0.8125rem]"
      >
        <View>
          <View
            className={cn(
              'h-10 w-10 items-center justify-center rounded-full border bg-glass-strong',
              TONE_BORDER[state]
            )}
          >
            <Text className={cn('text-[0.8125rem] font-extrabold', TONE_TEXT[state])}>
              {initials(student.full_name)}
            </Text>
          </View>
          <View
            className={cn(
              'absolute -bottom-px -right-px h-[0.6875rem] w-[0.6875rem] rounded-full border-2 border-background',
              TONE_DOT[state]
            )}
          />
        </View>

        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[0.90625rem] font-bold tracking-tight text-foreground"
          >
            {student.full_name || 'Aluno sem nome'}
          </Text>
          <Text numberOfLines={1} className="mt-px text-[0.71875rem] text-muted-foreground">
            {subtitle(student, state)}
          </Text>
        </View>

        <View className="items-end">
          <Text
            className={cn('font-display-black text-[0.9375rem] tracking-tight', TONE_TEXT[state])}
          >
            {value}
          </Text>
          <Text className="text-[0.5625rem] font-extrabold uppercase tracking-wider text-placeholder">
            {TAG[state]}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onActions}
          accessibilityRole="button"
          accessibilityLabel={`Ações de ${student.full_name || 'aluno'}`}
          hitSlop={8}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={escalar(ACTIONS_ICON)}
            color={cores.placeholder}
          />
        </TouchableOpacity>
      </Vidro>
    </TouchableOpacity>
  );
}
