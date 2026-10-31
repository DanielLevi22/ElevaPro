import { Ionicons } from '@expo/vector-icons';
import { deactivateKeepAwake, useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { RecipeFeedback } from '../components/recipes/RecipeFeedback';
import { RecipeHeader } from '../components/recipes/RecipeHeader';
import { RecipeImage } from '../components/recipes/RecipeImage';
import { RecipeIngredients } from '../components/recipes/RecipeIngredients';
import { useCookingSteps } from '../hooks/useCookingSteps';
import { useMealRecipes } from '../hooks/useMealRecipes';
import type { MealPreparation } from '../services/mealRecipes';

/** Preparo independente do cardápio, sem registrar consumo. @example <CookingScreen mealId={id} date={date} /> */
export default function CookingScreen({
  mealId,
  date,
  recipeId,
}: {
  mealId: string;
  date: string;
  recipeId?: string;
}) {
  const router = useRouter();
  const recipes = useMealRecipes(mealId, date, !!recipeId);
  const preparation = recipes.prepare(recipeId);
  if (recipes.context.status !== 'ready')
    return (
      <GlassScreen>
        <RecipeHeader title="Modo de preparo" onBack={router.back} />
        <RecipeFeedback
          status={recipes.context.status}
          onRetry={
            ['error', 'consent_required'].includes(recipes.context.status)
              ? recipes.retry
              : undefined
          }
        />
      </GlassScreen>
    );
  if (!preparation)
    return (
      <GlassScreen>
        <RecipeHeader title="Modo de preparo" onBack={router.back} />
        <RecipeFeedback
          status="empty"
          message="Ainda não temos um guia compatível com essa refeição. Confira as unidades e a indicação de cru/cozido; nenhuma porção foi alterada."
        />
      </GlassScreen>
    );
  return (
    <CookingSession
      key={`${mealId}:${date}:${recipeId ?? 'current'}`}
      preparation={preparation}
      recipeId={recipeId}
      onBack={router.back}
    />
  );
}

function CookingSession({
  preparation,
  recipeId,
  onBack,
}: {
  preparation: MealPreparation;
  recipeId?: string;
  onBack: () => void;
}) {
  useKeepAwake('meal-preparation');
  const progress = useCookingSteps(preparation.steps);
  const [finished, setFinished] = useState(false);
  const finish = () => {
    progress.stopVoice();
    progress.resetTimer();
    void deactivateKeepAwake('meal-preparation');
    setFinished(true);
  };
  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        !finished ? (
          <BarraDeDuasAcoes
            secundaria={{
              rotulo: 'Anterior',
              icone: 'chevron-back',
              onPress: progress.previous,
              desabilitada: progress.index === 0,
            }}
            principal={{
              rotulo: progress.last ? 'Concluir preparo' : 'Próximo',
              icone: progress.last ? 'checkmark' : 'chevron-forward',
              onPress: progress.last ? finish : progress.next,
            }}
          />
        ) : undefined
      }
    >
      <RecipeHeader title="Modo de preparo" subtitle={preparation.title} onBack={onBack} />
      {recipeId ? (
        <View className="mb-4 overflow-hidden rounded-xl">
          <RecipeImage image={preparation.image} title={preparation.title} />
          <Text className="mt-1 px-3 pb-2 text-legenda text-muted-foreground">
            Imagem ilustrativa · receita experimental
          </Text>
        </View>
      ) : null}
      {finished ? (
        <PreparationFinished onBack={onBack} />
      ) : (
        <>
          <Chip>{`Passo ${progress.index + 1} de ${preparation.steps.length}`}</Chip>
          <Vidro className="mt-4 p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-legenda font-bold uppercase tracking-wide text-primary">
                Agora
              </Text>
              <BotaoRedondo
                icone={progress.speaking ? 'volume-x' : 'volume-2'}
                rotulo={progress.speaking ? 'Parar leitura' : 'Ouvir passo'}
                onPress={progress.speak}
              />
            </View>
            <Text className="text-[1.25rem] font-semibold leading-8 text-foreground">
              {progress.step.instruction}
            </Text>
            {progress.step.timerSeconds ? (
              <CookingTimer
                seconds={progress.secondsLeft}
                running={progress.running}
                onToggle={progress.toggleTimer}
                onReset={progress.resetTimer}
              />
            ) : null}
          </Vidro>
          <RecipeIngredients ingredients={preparation.ingredients} />
        </>
      )}
    </GlassScreen>
  );
}

function CookingTimer({
  seconds,
  running,
  onToggle,
  onReset,
}: {
  seconds: number;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
}) {
  const colors = useCores();
  const scale = useEscala();
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <View className="mt-5">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={running ? 'Pausar temporizador' : 'Iniciar temporizador'}
        disabled={seconds === 0}
        onPress={onToggle}
        className="flex-row items-center justify-center gap-3 rounded-xl bg-primary/15 px-4 py-4"
      >
        <Ionicons name={running ? 'pause' : 'play'} size={scale(24)} color={colors.primary} />
        <Text className="text-[2rem] font-bold tabular-nums text-foreground">{clock}</Text>
      </TouchableOpacity>
      <Text
        accessibilityLiveRegion="polite"
        className="mt-2 text-center text-legenda text-muted-foreground"
      >
        {seconds === 0
          ? 'Tempo encerrado. Confira o preparo antes de avançar.'
          : 'O timer é um lembrete; confira o ponto do alimento.'}
      </Text>
      <TouchableOpacity accessibilityRole="button" onPress={onReset} className="mt-2 p-2">
        <Text className="text-center text-legenda font-bold text-primary">Reiniciar timer</Text>
      </TouchableOpacity>
    </View>
  );
}

function PreparationFinished({ onBack }: { onBack: () => void }) {
  return (
    <Vidro className="p-5">
      <Text className="text-[1.25rem] font-bold text-foreground">Preparo concluído</Text>
      <Text className="mb-4 mt-2 text-corpo text-muted-foreground">
        Bom apetite! Depois de comer, confirme o consumo no detalhe da refeição.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onBack}
        className="rounded-xl bg-primary p-3"
      >
        <Text className="text-center font-bold text-primary-foreground">Voltar</Text>
      </TouchableOpacity>
    </Vidro>
  );
}
