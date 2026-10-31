import {
  knownPeriodizationObjective,
  PERIODIZATION_OBJECTIVES,
  type Periodization,
  type PeriodizationObjective,
} from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { StudentPickerModal } from '@/components/StudentPickerModal';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { Row } from '@/components/ui/Row';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useStudentStore } from '@/students';
import { EstadoDaTela } from '../components/aluno/EstadoDaTela';
import { DatePickerField } from '../components/DatePickerField';
import { useWorkoutStore } from '../store/workoutStore';

interface FormValues {
  name: string;
  objective: PeriodizationObjective;
  startDate: string;
  endDate: string;
}

/** O aluno escolhido no formulário: só o que o seletor e o insert precisam. */
interface SelectedStudent {
  id: string;
  name: string;
}

type PeriodizationColumns = Pick<Periodization, 'name' | 'start_date' | 'end_date'> & {
  objective: PeriodizationObjective;
};

/**
 * A periodização, criada ou editada — o mesmo formulário do modal do web.
 *
 * Grava só a periodização, `planned`. A fase, a ficha e os exercícios nascem
 * cada um na sua tela, como no web (#387). Sem `periodizationId` cria; com,
 * edita — e espera a periodização carregar em vez de cair na criação, que
 * gravaria uma nova no lugar de editar a que o especialista abriu.
 *
 * Com `studentId`, a folha está na pilha de Alunos e abre a periodização criada
 * ali mesmo: a rota da aba Treinos deixaria o Voltar no que aquela aba guardava,
 * o treino de outro aluno (#437).
 *
 * @example router.push(ROUTES.WORKOUTS.PERIODIZATION_NEW(student.id, student.full_name))
 * @example router.push(ROUTES.STUDENTS.PERIODIZATION_NEW(student.id, student.full_name))
 * @example router.push(ROUTES.WORKOUTS.PERIODIZATION_EDIT(periodization.id))
 */
export default function PeriodizationFormScreen({ studentId }: { studentId?: string } = {}) {
  const params = useLocalSearchParams<{
    studentId?: string;
    studentName?: string;
    periodizationId?: string;
  }>();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { periodizations, fetchPeriodizations } = useWorkoutStore();
  const editing = periodizations.find((p) => p.id === params.periodizationId) ?? null;
  const [lookedUp, setLookedUp] = useState(false);

  useEffect(() => {
    if (!params.periodizationId || editing || !userId) return;
    fetchPeriodizations(userId).finally(() => setLookedUp(true));
  }, [params.periodizationId, editing, userId, fetchPeriodizations]);

  if (params.periodizationId && !editing) {
    return <EstadoDaTela naoEncontrado={lookedUp} mensagem="Periodização não encontrada." />;
  }
  return (
    <PeriodizationForm
      editing={editing}
      initialStudent={initialStudent(studentId ?? params.studentId, params.studentName, editing)}
      inStudentStack={Boolean(studentId)}
    />
  );
}

function PeriodizationForm({
  editing,
  initialStudent: startingStudent,
  inStudentStack,
}: {
  editing: Periodization | null;
  initialStudent: SelectedStudent | null;
  inStudentStack: boolean;
}) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { createPeriodization, updatePeriodization } = useWorkoutStore();
  const [student, setStudent] = useState(startingStudent);
  const [values, setValues] = useState<FormValues>(() => initialValues(editing));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<FormValues>) => setValues((current) => ({ ...current, ...patch }));

  async function persist(owner: SelectedStudent, specialistId: string) {
    if (editing) {
      await updatePeriodization(editing.id, toColumns(values));
      router.back();
      return;
    }
    const created = await createPeriodization({
      specialist_id: specialistId,
      student_id: owner.id,
      status: 'planned',
      ...toColumns(values),
    });
    router.replace(
      inStudentStack
        ? ROUTES.STUDENTS.PERIODIZATION(owner.id, created.id)
        : ROUTES.WORKOUTS.PERIODIZATION(created.id)
    );
  }

  async function save() {
    const missing = missingField(values, student);
    if (missing) return showAlert({ title: 'Falta preencher', message: missing, type: 'error' });
    if (!student || !userId) return;
    setSaving(true);
    try {
      await persist(student, userId);
    } catch {
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar a periodização.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        <BotaoFixoNoRodape
          rotulo={saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar periodização'}
          icone="checkmark"
          onPress={save}
        />
      }
    >
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>
      <ProgressHeader
        size="page"
        eyebrow={student?.name ?? 'Novo plano'}
        title={editing ? 'Editar periodização' : 'Nova periodização'}
      />

      <TituloDeSecao estilo="rotulo">Nome</TituloDeSecao>
      <Group>
        <Input
          icon="clipboard-outline"
          placeholder="Ex.: Hipertrofia - Ciclo 1"
          value={values.name}
          onChangeText={(name) => set({ name })}
        />
      </Group>

      <StudentField student={student} locked={!!editing} onChange={setStudent} />
      <ObjectivePicker value={values.objective} onChange={(objective) => set({ objective })} />
      <PeriodFields values={values} onChange={set} />
    </GlassScreen>
  );
}

function PeriodFields({
  values,
  onChange,
}: {
  values: FormValues;
  onChange: (patch: Partial<FormValues>) => void;
}) {
  return (
    <>
      <TituloDeSecao estilo="rotulo">Período</TituloDeSecao>
      <View className="flex-row gap-3">
        <DatePickerField
          label="Início"
          value={values.startDate || null}
          onChange={(startDate) => onChange({ startDate })}
        />
        <DatePickerField
          label="Fim"
          value={values.endDate || null}
          minimumDate={values.startDate || null}
          onChange={(endDate) => onChange({ endDate })}
        />
      </View>
    </>
  );
}

/** As 6 opções do web, gravadas pelo valor — nunca o texto digitado. */
function ObjectivePicker({
  value,
  onChange,
}: {
  value: PeriodizationObjective;
  onChange: (objective: PeriodizationObjective) => void;
}) {
  return (
    <>
      <TituloDeSecao estilo="rotulo">Objetivo</TituloDeSecao>
      <View className="flex-row flex-wrap gap-2">
        {PERIODIZATION_OBJECTIVES.map((objective) => (
          <TouchableOpacity
            key={objective.value}
            onPress={() => onChange(objective.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === objective.value }}
          >
            <Chip tom={value === objective.value ? 'destaque' : 'neutro'}>{objective.label}</Chip>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

/**
 * O aluno da periodização. O especialista escolhe; quem treina sozinho já é o
 * aluno, e na edição ele não muda — como no web.
 */
function StudentField({
  student,
  locked,
  onChange,
}: {
  student: SelectedStudent | null;
  locked: boolean;
  onChange: (student: SelectedStudent) => void;
}) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isSpecialist = useAuthStore((s) => s.accountType === 'specialist');
  const { students, fetchStudents } = useStudentStore();
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (isSpecialist && userId && !locked) fetchStudents(userId);
  }, [isSpecialist, userId, locked, fetchStudents]);

  if (!isSpecialist) return null;
  return (
    <>
      <TituloDeSecao estilo="rotulo">Aluno</TituloDeSecao>
      <Group>
        <Row
          icon="person-outline"
          title={student?.name ?? 'Selecionar aluno'}
          chevron={!locked}
          onPress={locked ? undefined : () => setPicking(true)}
        />
      </Group>
      <StudentPickerModal
        visible={picking}
        onClose={() => setPicking(false)}
        students={students.map((s) => ({
          id: s.id,
          full_name: s.full_name,
          avatar_url: s.avatar_url ?? undefined,
        }))}
        onSelect={(picked) => {
          setPicking(false);
          onChange({ id: picked.id, name: picked.full_name ?? 'Aluno' });
        }}
      />
    </>
  );
}

function initialStudent(
  studentId: string | undefined,
  studentName: string | undefined,
  editing: Periodization | null
): SelectedStudent | null {
  if (editing) return { id: editing.student_id, name: editing.student?.full_name ?? 'Aluno' };
  return studentId ? { id: studentId, name: studentName ?? 'Aluno' } : null;
}

/** Texto livre antigo no objetivo volta ao padrão: o formulário só oferece os 6. */
function initialValues(editing: Periodization | null): FormValues {
  return {
    name: editing?.name ?? '',
    objective: knownPeriodizationObjective(editing?.objective ?? null) ?? 'hypertrophy',
    startDate: editing?.start_date?.slice(0, 10) ?? '',
    endDate: editing?.end_date?.slice(0, 10) ?? '',
  };
}

/** O que falta, em texto para a pessoa — ou `null` quando dá para salvar. */
function missingField(values: FormValues, student: SelectedStudent | null): string | null {
  if (!values.name.trim()) return 'Dê um nome à periodização.';
  if (!student) return 'Escolha o aluno da periodização.';
  if (!values.startDate || !values.endDate) return 'Escolha as datas de início e fim.';
  if (values.endDate < values.startDate)
    return `O fim (${values.endDate}) não pode ser antes do início (${values.startDate}).`;
  return null;
}

function toColumns(values: FormValues): PeriodizationColumns {
  return {
    name: values.name.trim(),
    objective: values.objective,
    start_date: values.startDate,
    end_date: values.endDate,
  };
}
