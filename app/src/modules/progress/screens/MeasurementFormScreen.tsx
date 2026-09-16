import {
  type MeasurementFormField,
  type PhysicalAssessment,
  parseMeasurementForm,
} from '@elevapro/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { localDateKey } from '@/services/healthSync';
import { EmptyCard } from '../components/ChartCard';
import { MeasureField } from '../components/MeasureField';
import { chipDate } from '../components/measurementLabels';
import { ProgressHeader } from '../components/ProgressHeader';
import { useMeasurementMutations, useMeasurements } from '../hooks/useMeasurements';

/**
 * O formulário da medida declarada (#312): registrar uma nova, ou corrigir e apagar
 * uma que o próprio aluno declarou (Art. 18, III e VI).
 *
 * Sem desenho no kit: é montado com as primitivas de vidro. Sem dobra cutânea, que é
 * medida de especialista, e com os dois lados em braço, coxa e panturrilha, opcionais.
 *
 * @example <MeasurementFormScreen studentId={user.id} editingId={params.id} />
 */
interface MeasurementFormScreenProps {
  studentId: string;
  /** Com um id, corrige a medida declarada; sem, registra uma nova. */
  editingId?: string;
  /** Sem isto só se corrige o que já foi declarado: com especialista, quem mede é ele. */
  canDeclare: boolean;
}

type FormValues = Partial<Record<MeasurementFormField, string>>;

/**
 * O aviso sai em modal, e não em texto no fim do formulário: o botão Salvar é fixo,
 * e quem toca nele do topo não via a mensagem que nascia 14 campos abaixo.
 */
const ERROR_TEXT = {
  required: 'Peso e altura são obrigatórios.',
  range: 'Um valor está fora do esperado. Confira o campo marcado.',
  refused:
    'A medida precisa da autorização de dados de saúde ativa, em Perfil → Minhas autorizações.',
} as const;

const showRefused = () =>
  showAlert({ title: 'Não foi possível salvar', message: ERROR_TEXT.refused, type: 'error' });

export function MeasurementFormScreen({
  studentId,
  editingId,
  canDeclare,
}: MeasurementFormScreenProps) {
  const { all, loading } = useMeasurements(studentId);
  // O formulário nasce com a medida: montado antes da consulta, abriria vazio e o
  // estado inicial não voltaria a ler.
  if (loading) return null;
  const editing = all.find((record) => record.id === editingId && record.measured_by === 'self');
  if (!editing && !canDeclare) return <DeclarationClosed />;
  return <MeasurementForm studentId={studentId} editing={editing} all={all} />;
}

/** Com especialista ativo o banco recusa a declaração, e a tela diz por quê antes de tentar. */
function DeclarationClosed() {
  const router = useRouter();
  return (
    <GlassScreen glow={PROGRESS_GLOW}>
      <ProgressHeader
        size="page"
        eyebrow="Medida"
        title="Quem mede é o seu especialista"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
      />
      <EmptyCard>
        Enquanto você acompanha com um especialista, a medida vem da avaliação dele. O que você
        declarou antes continua seu, e você pode corrigir ou apagar pelo histórico.
      </EmptyCard>
    </GlassScreen>
  );
}

interface MeasurementFormProps {
  studentId: string;
  editing: PhysicalAssessment | undefined;
  all: readonly PhysicalAssessment[];
}

function MeasurementForm({ studentId, editing, all }: MeasurementFormProps) {
  const router = useRouter();
  const { declare, correct, remove } = useMeasurementMutations(studentId);
  const [values, setValues] = useState<FormValues>(() => initialValues(editing, all));
  const [date, setDate] = useState(editing?.assessed_at.slice(0, 10) ?? localDateKey());
  const [invalidField, setInvalidField] = useState<MeasurementFormField | null>(null);
  const saving = declare.isPending || correct.isPending;
  const set = (field: MeasurementFormField) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    // Quem corrige o campo marcado não deve seguir vendo o vermelho até salvar de novo.
    setInvalidField((current) => (current === field ? null : current));
  };

  const save = async () => {
    const parsed = parseMeasurementForm(values);
    if (!parsed.ok) {
      setInvalidField(parsed.field);
      return showAlert({
        title: 'Confira a medida',
        message: ERROR_TEXT[parsed.reason],
        type: 'warning',
      });
    }
    const input = { ...parsed.input, assessed_at: `${date}T12:00:00Z` };
    setInvalidField(null);
    try {
      if (editing) await correct.mutateAsync({ id: editing.id, input });
      else await declare.mutateAsync(input);
      router.back();
    } catch {
      // O banco recusa sem o aceite de dados de saúde, e com especialista ativo (0056).
      showRefused();
    }
  };

  const confirmDelete = (record: PhysicalAssessment) =>
    showConfirm({
      title: 'Apagar a medida?',
      message: `A medida de ${chipDate(record.assessed_at)} sai do seu histórico. Isso não se desfaz.`,
      confirmText: 'Apagar',
      type: 'danger',
      onConfirm: () => remove.mutateAsync(record.id).then(() => router.back(), showRefused),
    });

  return (
    <GlassScreen
      glow={PROGRESS_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Cancelar', icone: 'close', onPress: router.back }}
          principal={{
            rotulo: saving ? 'Salvando' : 'Salvar',
            icone: 'checkmark',
            desabilitada: saving,
            onPress: save,
          }}
        />
      }
    >
      <ProgressHeader
        size="page"
        eyebrow="Declarada por você"
        title={editing ? 'Corrigir medida' : 'Nova medida'}
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
      />
      <DateRow date={date} onChange={setDate} />
      <TituloDeSecao estilo="rotulo">Corpo</TituloDeSecao>
      <FieldRow>
        <MeasureField
          label="Peso"
          unit="kg"
          value={values.weight_kg ?? ''}
          onChange={set('weight_kg')}
          invalid={invalidField === 'weight_kg'}
        />
        <MeasureField
          label="Altura"
          unit="cm"
          value={values.height_cm ?? ''}
          onChange={set('height_cm')}
          invalid={invalidField === 'height_cm'}
        />
      </FieldRow>
      <FieldRow>
        <MeasureField
          label="Gordura (se souber)"
          unit="%"
          value={values.body_fat_pct ?? ''}
          onChange={set('body_fat_pct')}
          invalid={invalidField === 'body_fat_pct'}
        />
      </FieldRow>
      <CircumferenceFields values={values} set={set} invalid={invalidField ?? undefined} />
      {editing ? (
        <View className="mt-5">
          <LinhaDeVidro
            icon="trash-outline"
            tom="batimento"
            titulo="Apagar esta medida"
            sub="Some das telas e do que o especialista vê"
            onPress={() => confirmDelete(editing)}
          />
        </View>
      ) : null}
    </GlassScreen>
  );
}

function FieldRow({ children }: { children: ReactNode }) {
  return <View className="mb-3 flex-row gap-2.5">{children}</View>;
}

interface CircumferenceFieldsProps {
  values: FormValues;
  set: (field: MeasurementFormField) => (text: string) => void;
  invalid?: MeasurementFormField;
}

/** As 8 medidas da tela de circunferências; nas bilaterais, os dois lados lado a lado. */
function CircumferenceFields({ values, set, invalid }: CircumferenceFieldsProps) {
  const field = (name: MeasurementFormField, label: string) => (
    <MeasureField
      label={label}
      unit="cm"
      value={values[name] ?? ''}
      onChange={set(name)}
      invalid={invalid === name}
    />
  );
  return (
    <>
      <TituloDeSecao estilo="rotulo" acao="opcionais">
        Medidas
      </TituloDeSecao>
      <FieldRow>
        {field('circ_chest', 'Peito')}
        {field('circ_waist', 'Cintura')}
      </FieldRow>
      <FieldRow>
        {field('circ_hip', 'Quadril')}
        {field('circ_shoulder', 'Ombros')}
      </FieldRow>
      <FieldRow>{field('circ_neck', 'Pescoço')}</FieldRow>
      <FieldRow>
        {field('circ_right_arm', 'Braço direito')}
        {field('circ_left_arm', 'Braço esquerdo')}
      </FieldRow>
      <FieldRow>
        {field('circ_right_thigh', 'Coxa direita')}
        {field('circ_left_thigh', 'Coxa esquerda')}
      </FieldRow>
      <FieldRow>
        {field('circ_right_calf', 'Panturrilha direita')}
        {field('circ_left_calf', 'Panturrilha esquerda')}
      </FieldRow>
    </>
  );
}

/** A data da medida: hoje por padrão, e nunca no futuro. */
function DateRow({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Data da medida: ${chipDate(date)}`}
        className="mt-3.5"
      >
        <Vidro className="flex-row items-center justify-between p-3.5">
          <Text className="text-[0.84375rem] font-semibold text-foreground">Data</Text>
          <Text className="text-[0.84375rem] text-muted-foreground">{chipDate(date)}</Text>
        </Vidro>
      </TouchableOpacity>
      {open ? (
        <DateTimePicker
          value={new Date(`${date}T12:00:00`)}
          mode="date"
          maximumDate={new Date()}
          onChange={(_, picked) => {
            setOpen(false);
            if (picked) onChange(localDateKey(picked));
          }}
        />
      ) : null}
    </>
  );
}

/** Corrigir abre com a medida; registrar abre com a altura da última, que muda pouco. */
function initialValues(
  editing: PhysicalAssessment | undefined,
  all: readonly PhysicalAssessment[]
): FormValues {
  const text = (value: number | string | null | undefined) =>
    value === null || value === undefined ? '' : String(value).replace('.', ',');
  if (!editing) {
    const lastHeight = [...all].reverse().find((record) => record.height_cm !== null)?.height_cm;
    return { height_cm: text(lastHeight) };
  }
  const fields: MeasurementFormField[] = [
    'weight_kg',
    'height_cm',
    'body_fat_pct',
    'circ_chest',
    'circ_waist',
    'circ_hip',
    'circ_shoulder',
    'circ_neck',
    'circ_right_arm',
    'circ_left_arm',
    'circ_right_thigh',
    'circ_left_thigh',
    'circ_right_calf',
    'circ_left_calf',
  ];
  return Object.fromEntries(fields.map((field) => [field, text(editing[field])]));
}
