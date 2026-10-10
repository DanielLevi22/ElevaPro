import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { Campo } from '@/components/ui/Campo';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { InfoNote } from '@/components/ui/InfoNote';
import { Precisao } from '@/components/ui/Precisao';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { OnboardingFrame, OnboardingTitle } from '../components/OnboardingFrame';
import { loadOnboardingAnswers, saveOnboardingAnswers } from '../services/onboardingAnswers';
import { planPrecision } from '../services/planPrecision';
import { useOnboardingStore } from '../store/onboardingStore';
import {
  type AboutYouInput,
  type AboutYouResult,
  type BiologicalSexAnswer,
  INCOMPLETE_HINT,
  INVALID_HINT,
  MINOR_HINT,
  SEX_OPTIONS,
  validateAboutYou,
} from '../validation';

const EMPTY: AboutYouInput = { age: '', height: '', weight: '', sex: null };
const ICONE_DA_NOTA = 15;

/**
 * O4 · Sobre você (3 de 5): idade, altura, peso e sexo biológico, com a precisão
 * do plano subindo. É a primeira tela que grava dado de saúde, e só chega aqui
 * quem aceitou o consentimento.
 *
 * Menor de 18 para aqui, sem gravar nada (ADR-0044).
 *
 * @example <AboutYouScreen />
 */
export function AboutYouScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const goal = useOnboardingStore((state) => state.goal);
  const [input, setInput] = useState<AboutYouInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const result = validateAboutYou(input);

  useSavedAnswers(userId, setInput);

  async function continuar() {
    if (!userId || result.status !== 'ready') return;
    setSaving(true);
    try {
      // Sem objetivo na memória (outro aparelho), o já gravado fica: `undefined` apagaria.
      await saveOnboardingAnswers(
        userId,
        goal ? { ...result.answers, main_goal: goal } : result.answers
      );
      router.push(ROUTES.ONBOARDING.SCAN_OFFER);
    } catch {
      registrarFalha('onboarding.salvar_sobre_voce');
      showAlert({
        title: 'Não foi possível salvar',
        message: 'Suas respostas continuam aqui. Confira sua conexão e tente de novo.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  const set = (campo: keyof AboutYouInput) => (valor: string) =>
    setInput((atual) => ({ ...atual, [campo]: valor }));
  const errors = result.status === 'invalid' ? result.errors : {};
  const precision = planPrecision(answeredSoFar(input, result, goal));

  return (
    <OnboardingFrame
      step={3}
      primary={{
        label: saving ? 'Salvando…' : 'Continuar',
        onPress: () => void continuar(),
        disabled: result.status !== 'ready' || saving,
        hint: HINTS[result.status],
      }}
    >
      <OnboardingTitle sub="Só quatro respostas. É o que usamos para calcular sua meta.">
        Sobre você
      </OnboardingTitle>
      <View className="mt-[1.375rem] gap-3.5">
        <Campo
          rotulo="Idade"
          valor={input.age}
          onChange={set('age')}
          unidade="anos"
          numerico
          erro={errors.age}
        />
        <View className="flex-row items-start gap-2.5">
          <Campo
            rotulo="Altura"
            valor={input.height}
            onChange={set('height')}
            unidade="cm"
            numerico
            erro={errors.height}
          />
          <Campo
            rotulo="Peso"
            valor={input.weight}
            onChange={set('weight')}
            unidade="kg"
            numerico
            erro={errors.weight}
          />
        </View>
      </View>
      <SexPicker value={input.sex} onChange={(sex) => setInput((atual) => ({ ...atual, sex }))} />
      {result.status === 'minor' ? (
        <InfoNote icon="people-outline" className="mt-5">
          O plano automático do app é para maiores de 18 anos. Com um especialista você usa o app
          normalmente: ele monta o seu treino e a sua dieta.
        </InfoNote>
      ) : (
        <View className="mt-5">
          <Precisao percentual={precision.percent} nivel={precision.level} />
        </View>
      )}
    </OnboardingFrame>
  );
}

const HINTS: Record<AboutYouResult['status'], string | undefined> = {
  ready: undefined,
  incomplete: INCOMPLETE_HINT,
  invalid: INVALID_HINT,
  minor: MINOR_HINT,
};

/** Retomada: quem fechou o app depois de O4 volta com os números que já deu. */
function useSavedAnswers(userId: string | null, setInput: (input: AboutYouInput) => void) {
  useEffect(() => {
    if (!userId) return;
    loadOnboardingAnswers(userId)
      .then((saved) => {
        if (saved.height === undefined) return;
        setInput({
          age: textOf(saved.age),
          height: textOf(saved.height),
          weight: textOf(saved.weight),
          sex: saved.gender === 'Feminino' || saved.gender === 'Masculino' ? saved.gender : null,
        });
      })
      // Sem as respostas antigas a tela começa vazia: a pessoa digita de novo.
      .catch(() => registrarFalha('onboarding.carregar_respostas'));
  }, [userId, setInput]);
}

function textOf(value: unknown): string {
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '';
}

/** O que já conta para a precisão: o objetivo de O2 e os campos sem erro. */
function answeredSoFar(
  input: AboutYouInput,
  result: AboutYouResult,
  goal: string | null
): Record<string, unknown> {
  const errors = result.status === 'invalid' ? result.errors : {};
  return {
    main_goal: goal ?? undefined,
    age: input.age && !errors.age ? input.age : undefined,
    height: input.height && !errors.height ? input.height : undefined,
    weight: input.weight && !errors.weight ? input.weight : undefined,
    gender: input.sex ?? undefined,
  };
}

function SexPicker({
  value,
  onChange,
}: {
  value: BiologicalSexAnswer | null;
  onChange: (sex: BiologicalSexAnswer) => void;
}) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <>
      <Text className="mx-0.5 mb-[0.5625rem] mt-5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
        Sexo biológico
      </Text>
      {/* Sem escolha prévia: o kit desenha uma marcada, mas presumir o sexo de
          alguém para preencher a fórmula seria inventar o dado. */}
      <GlassSegmented<BiologicalSexAnswer | ''>
        options={SEX_OPTIONS}
        value={value ?? ''}
        onChange={(sex) => {
          if (sex) onChange(sex);
        }}
      />
      <View className="mt-[0.5625rem] flex-row items-start gap-2">
        <Ionicons
          name="information-circle-outline"
          size={escalar(ICONE_DA_NOTA)}
          color={cores.placeholder}
        />
        <Text className="flex-1 text-[0.71875rem] leading-[1rem] text-hero-secondary">
          Usado só para calcular seu gasto de energia.
        </Text>
      </View>
    </>
  );
}
