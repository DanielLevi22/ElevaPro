import { formatarDecimal } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { Field } from '@/components/ui/Field';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { useDeclareMeasure, useLatestDeclaredMeasure } from '../hooks/useBlockReview';
import { validateMeasures } from '../validation';

/**
 * B1 · Peso e cintura de hoje, preenchidos com a última medida declarada. A
 * medida é gravada como as outras declaradas: corrigível e apagável no
 * histórico de medidas (Art. 18, III).
 *
 * @example <MeasuresScreen />
 */
export function MeasuresScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const { data: latest } = useLatestDeclaredMeasure(userId);
  const declare = useDeclareMeasure(userId);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');

  useEffect(() => {
    if (!latest) return;
    setWeight((value) => value || (latest.weight_kg ? formatarDecimal(latest.weight_kg) : ''));
    setWaist((value) => value || (latest.circ_waist ? formatarDecimal(latest.circ_waist) : ''));
  }, [latest]);

  const result = validateMeasures({ weight, waist });
  const errors = result.status === 'invalid' ? result.errors : {};

  async function save() {
    if (result.status !== 'ready') return;
    try {
      // A medida pede a altura, que não muda de um bloco para outro: vai a
      // da última medida, que o onboarding sempre deixa.
      await declare.mutateAsync({
        weight_kg: result.weightKg,
        circ_waist: result.waistCm,
        height_cm: latest?.height_cm ?? null,
      });
      router.push(ROUTES.BLOCK.CHANGES);
    } catch {
      registrarFalha('block.declare_measure');
      showAlert({
        title: 'Medida não salva',
        message: 'Confira sua conexão e tente de novo.',
        type: 'error',
      });
    }
  }

  return (
    <FlowFrame
      header={{}}
      primary={{
        label: 'Continuar',
        icon: 'arrow-forward',
        onPress: () => void save(),
        disabled: result.status !== 'ready' || declare.isPending,
        hint: result.status === 'ready' ? undefined : result.hint,
      }}
    >
      <FlowTitle sub="De manhã, em jejum, depois do banheiro. A cintura é opcional.">
        Peso e cintura de hoje
      </FlowTitle>
      <View className="mt-5 gap-3">
        <Field
          label="Peso"
          value={weight}
          onChange={setWeight}
          unit="kg"
          numeric
          error={errors.weight}
        />
        <Field
          label="Cintura"
          value={waist}
          onChange={setWaist}
          unit="cm"
          numeric
          error={errors.waist}
        />
      </View>
    </FlowFrame>
  );
}
