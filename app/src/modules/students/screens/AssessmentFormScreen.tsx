import {
  type AssessmentDraft,
  type AssessmentNumberField,
  assessmentDraft,
  bodyMassIndex,
  CIRCUMFERENCE_FIELDS,
  formatarDecimal,
  type PhysicalAssessment,
  parseAssessmentDraft,
  SKINFOLD_FIELDS,
} from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { Field } from '@/components/ui/Field';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { InfoNote } from '@/components/ui/InfoNote';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ActionPill } from '../components/ActionPill';
import { useAssessmentsStore } from '../store/assessmentsStore';

type Tab = 'composition' | 'circumferences' | 'skinfolds';

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'composition', label: 'Composição' },
  { value: 'circumferences', label: 'Circunferências' },
  { value: 'skinfolds', label: 'Dobras' },
];

/**
 * A ficha da avaliação física: nova, ou a correção de uma que o especialista mediu.
 *
 * A correção abre com a avaliação que a lista já carregou. Se ela não estiver lá
 * (o app foi reaberto nesta tela), a ficha não abre vazia: corrigir a partir do
 * nada gravaria medida em branco por cima da verdadeira.
 */
export default function AssessmentFormScreen() {
  const { id, assessmentId } = useLocalSearchParams<{ id: string; assessmentId?: string }>();
  const editing = useAssessmentsStore(
    (state) => state.assessments.find((a) => a.id === assessmentId) ?? null
  );
  if (assessmentId && !editing) return <EditingLost />;
  return <AssessmentForm studentId={id} editing={editing} />;
}

function AssessmentForm({
  studentId,
  editing,
}: {
  studentId: string;
  editing: PhysicalAssessment | null;
}) {
  const router = useRouter();
  const save = useAssessmentsStore((state) => state.save);
  const [tab, setTab] = useState<Tab>('composition');
  const [draft, setDraft] = useState(() => assessmentDraft(editing));
  const [saving, setSaving] = useState(false);
  const setField = (key: keyof AssessmentDraft) => (text: string) =>
    setDraft((current) => ({ ...current, [key]: text }));

  const submit = async () => {
    const parsed = parseAssessmentDraft(draft);
    if (!parsed.ok) {
      setTab('composition');
      return showAlert({ title: 'Confira a ficha', message: parsed.message, type: 'warning' });
    }
    setSaving(true);
    try {
      await save(studentId, parsed.values, editing);
      router.back();
    } catch (error) {
      showAlert({ title: 'Não foi possível salvar', message: messageOf(error), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('arms')}
      bottomSpace="fixedButton"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Cancelar', icone: 'close', onPress: router.back }}
          principal={{
            rotulo: saving ? 'Salvando' : editing ? 'Salvar correção' : 'Salvar',
            icone: 'checkmark',
            desabilitada: saving,
            onPress: submit,
          }}
        />
      }
    >
      <CabecalhoSobreFoto
        sobrelinha="Avaliação física"
        titulo={editing ? 'Corrigir avaliação' : 'Nova avaliação'}
        onVoltar={router.back}
      />
      {editing ? (
        <InfoNote icon="information-circle-outline" className="mt-4">
          A correção atualiza esta avaliação nos gráficos. A versão anterior fica no histórico de
          correções.
        </InfoNote>
      ) : null}
      <View className="mt-4">
        <GlassSegmented options={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === 'composition' ? <CompositionFields draft={draft} setField={setField} /> : null}
      {tab === 'circumferences' ? (
        <NumberFields fields={CIRCUMFERENCE_FIELDS} unit="cm" draft={draft} setField={setField} />
      ) : null}
      {tab === 'skinfolds' ? (
        <NumberFields fields={SKINFOLD_FIELDS} unit="mm" draft={draft} setField={setField} />
      ) : null}
    </TelaDeVidroComFoto>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível salvar a avaliação';
}

interface FieldsProps {
  draft: AssessmentDraft;
  setField: (key: keyof AssessmentDraft) => (text: string) => void;
}

function CompositionFields({ draft, setField }: FieldsProps) {
  const bmi = bodyMassIndex({
    weight_kg: toNumber(draft.weight_kg),
    height_cm: toNumber(draft.height_cm),
  });
  return (
    <>
      <TituloDeSecao estilo="rotulo" acao="obrigatórios">
        Escala
      </TituloDeSecao>
      <View className="flex-row gap-2.5">
        <Field
          label="Peso"
          unit="kg"
          numeric
          value={draft.weight_kg}
          onChange={setField('weight_kg')}
        />
        <Field
          label="Altura"
          unit="cm"
          numeric
          value={draft.height_cm}
          onChange={setField('height_cm')}
        />
      </View>
      {bmi !== null ? (
        <Text className="mt-2.5 px-0.5 text-legenda text-muted-foreground">
          {'IMC calculado: '}
          <Text className="font-semibold text-foreground">{formatarDecimal(bmi)}</Text>
        </Text>
      ) : null}
      <TituloDeSecao estilo="rotulo">Observações</TituloDeSecao>
      <NotesInput value={draft.notes} onChange={setField('notes')} />
    </>
  );
}

function NotesInput({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const cores = useCores();
  return (
    <Vidro className="p-3.5">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Observações, contexto da avaliação..."
        placeholderTextColor={cores.placeholder}
        multiline
        accessibilityLabel="Observações"
        className="min-h-[4.5rem] text-rotulo text-foreground"
        textAlignVertical="top"
      />
    </Vidro>
  );
}

interface NumberFieldsProps extends FieldsProps {
  fields: ReadonlyArray<{ readonly key: AssessmentNumberField; readonly label: string }>;
  unit: 'cm' | 'mm';
}

/** Os campos dois a dois: nas bilaterais, direito e esquerdo ficam lado a lado. */
function NumberFields({ fields, unit, draft, setField }: NumberFieldsProps) {
  const rows = Array.from({ length: Math.ceil(fields.length / 2) }, (_, i) =>
    fields.slice(i * 2, i * 2 + 2)
  );
  return (
    <>
      <TituloDeSecao estilo="rotulo" acao={`opcionais · ${unit}`}>
        {unit === 'cm' ? 'Circunferências' : 'Dobras cutâneas'}
      </TituloDeSecao>
      {rows.map((row) => (
        <View key={row[0].key} className="mb-3 flex-row gap-2.5">
          {row.map(({ key, label }) => (
            <Field
              key={key}
              label={label}
              unit={unit}
              numeric
              value={draft[key]}
              onChange={setField(key)}
            />
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </>
  );
}

function toNumber(text: string): number | null {
  const number = Number(text.replace(',', '.'));
  return text.trim() && Number.isFinite(number) ? number : null;
}

function EditingLost() {
  const router = useRouter();
  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('arms')} centered>
      <View className="items-center px-2">
        <Text className="mb-6 text-center text-legenda text-muted-foreground">
          Esta avaliação não está mais carregada. Volte à lista e abra a correção de novo.
        </Text>
        <ActionPill icon="arrow-back-outline" label="Voltar" onPress={router.back} />
      </View>
    </TelaDeVidroComFoto>
  );
}
