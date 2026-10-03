import type { PersonaTrack, UnlockCard } from '@elevapro/shared/data/anamnesisAdaptive';
import { PERSONA_OPTIONS } from '@elevapro/shared/data/anamnesisAdaptive';
import type { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Anel } from '@/components/ui/Anel';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Chip } from '@/components/ui/Chip';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { type Cores, useCores } from '@/shared/design';

/**
 * As telas em volta das perguntas da anamnese do Praticante, no kit de vidro
 * (#361): o nível de partida, o desbloqueio entre blocos e a conclusão com a
 * precisão do plano. Saíram de `AdaptiveAnamnesisScreen` para ela caber no
 * limite de tamanho com o desenho novo.
 */

export const TRACK_ICONS: Record<PersonaTrack, keyof typeof Ionicons.glyphMap> = {
  beginner: 'leaf-outline',
  returning: 'refresh-outline',
  intermediate: 'barbell-outline',
  advanced: 'trophy-outline',
};

const UNLOCK_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  height: 'flame-outline',
  gym_type: 'barbell-outline',
  injuries: 'shield-outline',
  commitment: 'flash-outline',
};

/**
 * O nome do nível em português. A tela mostrava o identificador ("beginner").
 *
 * @example trackLabel('beginner') // 'Iniciante…'
 */
export function trackLabel(track: PersonaTrack): string {
  return PERSONA_OPTIONS.find((option) => option.track === track)?.label ?? '';
}

/** A cor da precisão do perfil: sucesso a partir de 80, aviso a partir de 60. */
export function precisionColor(cores: Cores, precision: number, below: string): string {
  if (precision >= 80) return cores.metricaPassos;
  return precision >= 60 ? cores.metricaGordura : below;
}

/** O mesmo corte de `precisionColor`, no tom da barra do kit. */
export function precisionTone(precision: number): 'concluida' | 'gordura' | 'apagada' {
  if (precision >= 80) return 'concluida';
  return precision >= 60 ? 'gordura' : 'apagada';
}

function Titulo({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <View className="mb-5">
      <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
        {eyebrow}
      </Text>
      <Text
        accessibilityRole="header"
        className="mt-1 font-display-black text-[1.625rem] leading-[1.875rem] tracking-tight text-hero"
      >
        {title}
      </Text>
      {sub ? (
        <Text className="mt-1.5 text-[0.8125rem] leading-[1.22rem] text-hero-secondary">{sub}</Text>
      ) : null}
    </View>
  );
}

/**
 * O nível de partida: o plano começa do nível real de quem responde.
 *
 * @example <PersonaStep onSelect={escolherNivel} />
 */
export function PersonaStep({ onSelect }: { onSelect: (track: PersonaTrack) => void }) {
  return (
    <>
      <Titulo
        eyebrow="Passo inicial"
        title="Como você se descreveria?"
        sub="Vamos montar seu plano a partir do seu nível real."
      />
      <View className="gap-2.5">
        {PERSONA_OPTIONS.map((option) => (
          <GlassChoice
            key={option.track}
            icon={TRACK_ICONS[option.track]}
            title={option.label}
            sub={option.detail}
            active={false}
            onPress={() => onSelect(option.track)}
          />
        ))}
      </View>
    </>
  );
}

/**
 * O desbloqueio entre blocos de perguntas: o que a resposta acabou de liberar.
 *
 * @example <UnlockStep card={desbloqueio} onContinue={seguir} />
 */
export function UnlockStep({ card, onContinue }: { card: UnlockCard; onContinue: () => void }) {
  return (
    <View className="mt-16 items-center">
      <CaixaDeIcone
        icon={UNLOCK_ICONS[card.afterQuestionId] ?? 'flash-outline'}
        tom="marca"
        tamanho="bloco"
      />
      <View className="mt-5">
        <Chip tom="evolucao" icone="checkmark">
          Desbloqueado
        </Chip>
      </View>
      <Text className="mt-3 text-center font-display-black text-[1.375rem] leading-[1.75rem] tracking-tight text-hero">
        {card.title}
      </Text>
      <Text className="mb-8 mt-2 text-center text-[0.8125rem] leading-[1.22rem] text-hero-secondary">
        {card.detail}
      </Text>
      <View className="w-full">
        <BotaoDeDestaque rotulo="Continuar" icone="arrow-forward" onPress={onContinue} />
      </View>
    </View>
  );
}

interface CompletionStepProps {
  score: number;
  /** A anamnese gravou a primeira medida declarada, e a tela diz onde achá-la. */
  startedMeasures: boolean;
  onStartCoach: () => void;
  onRetake: () => void;
}

/**
 * A conclusão: a precisão do plano no anel e o próximo passo.
 *
 * @example <CompletionStep score={86} startedMeasures onStartCoach={gerar} onRetake={refazer} />
 */
export function CompletionStep({
  score,
  startedMeasures,
  onStartCoach,
  onRetake,
}: CompletionStepProps) {
  const cores = useCores();
  const label = score >= 80 ? 'Perfil completo' : score >= 60 ? 'Bom começo' : 'Dados iniciais';
  const detail =
    score >= 80
      ? 'Seu coach tem tudo que precisa para montar um plano personalizado.'
      : score >= 60
        ? 'Dados suficientes para começar. O coach pode pedir mais detalhes.'
        : 'Você pode continuar e responder mais no chat com o coach.';

  return (
    <View className="mt-10 items-center">
      <Anel
        valor={score}
        meta={100}
        rotulo={`${score}%`}
        sub="precisão"
        cor={precisionColor(cores, score, cores.placeholder)}
      />
      <Text className="mt-6 text-center font-display-black text-[1.375rem] tracking-tight text-hero">
        {label}
      </Text>
      <Text className="mt-2 text-center text-[0.8125rem] leading-[1.22rem] text-hero-secondary">
        {detail}
      </Text>
      {/* O aluno precisa saber que a anamnese registrou uma medida de saúde por
          ele (Art. 6°, VI): a tela diz, e aponta onde ela vive. */}
      {startedMeasures ? (
        <Text className="mt-3 text-center text-micro leading-relaxed text-muted-foreground">
          Suas medidas viraram o primeiro registro em Progresso → Composição corporal, e você pode
          corrigir ou apagar quando quiser.
        </Text>
      ) : null}
      <View className="mt-8 w-full">
        <BotaoDeDestaque rotulo="Gerar meu plano agora" icone="flash" onPress={onStartCoach} />
        <TouchableOpacity className="mt-1 py-4" onPress={onRetake} accessibilityRole="button">
          <Text className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Refazer anamnese
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
