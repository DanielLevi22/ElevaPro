import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { showConfirm } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { CARDIO_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Orb } from '@/components/ui/Orb';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import type { CardioModality } from '../../cardioModalities';
import { EscalaDePse } from '../../components/sessao/EscalaDePse';
import { NotesField } from '../../components/sessao/NotesField';

interface FeedbackViewProps {
  modality: CardioModality;
  /** "30:12 · 268 kcal · 11,8 km": o que a sessão mediu, sob o título. */
  summaryLine: string;
  /** Aluno com especialista: quem lê o feedback é dito na hora de escrever. */
  hasSpecialist: boolean;
  saving: boolean;
  onSave: (perceivedExertion: number, notes: string) => void;
  onDiscard: () => void;
}

/** O meio da escala: nem leve nem puxado, até o aluno dizer. */
const DEFAULT_EXERTION = 5;

/**
 * Tela 7 do kit: "Como foi o cardio?", a PSE, a sensação e as observações.
 *
 * Descartar pergunta antes: a sessão acabou de ser feita, e o toque errado não
 * pode apagá-la. Descartada, nada é gravado — nem a sessão, nem o percurso.
 *
 * O subtítulo diz quem lê as observações só quando há quem leia (Art. 6°, VI):
 * o Praticante não tem especialista, e dizer "seu personal vê" seria falso.
 *
 * @example <FeedbackView modality={run} summaryLine="30:12 · 268 kcal" onSave={salvar} … />
 */
export function FeedbackView({
  modality,
  summaryLine,
  hasSpecialist,
  saving,
  onSave,
  onDiscard,
}: FeedbackViewProps) {
  const [exertion, setExertion] = useState(DEFAULT_EXERTION);
  const [notes, setNotes] = useState('');

  const confirmDiscard = () =>
    showConfirm({
      title: 'Descartar a sessão?',
      message: 'O tempo, as calorias e o percurso desta sessão não serão salvos.',
      type: 'danger',
      confirmText: 'Descartar',
      cancelText: 'Voltar',
      onConfirm: onDiscard,
    });

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <GlassScreen
        glow={CARDIO_GLOW}
        bottomSpace="actionBar"
        overlay={
          <BarraDeDuasAcoes
            secundaria={{ rotulo: 'Descartar', icone: 'trash-outline', onPress: confirmDiscard }}
            principal={{
              rotulo: 'Salvar sessão',
              icone: 'checkmark',
              desabilitada: saving,
              onPress: () => onSave(exertion, notes),
            }}
          />
        }
      >
        <View className="items-center pt-[1.375rem]">
          <Orb icon={modality.icon} scale={0.56} glyph={24} />
          <Text className="mt-4 text-[1.5625rem] font-bold tracking-tight text-hero">
            Como foi o cardio?
          </Text>
          <Text className="mt-1.5 text-[0.84375rem] text-hero-secondary">{summaryLine}</Text>
          {hasSpecialist ? (
            <Text className="mt-1 text-[0.75rem] text-placeholder">
              Seu personal vê este feedback.
            </Text>
          ) : null}
        </View>

        <EscalaDePse pse={exertion} onMudar={setExertion} />

        <TituloDeSecao estilo="rotulo">Observações</TituloDeSecao>
        <NotesField
          notes={notes}
          onChange={setNotes}
          placeholder="Ex.: a subida do km 4 pesou, mas recuperei bem no final."
        />
      </GlassScreen>
    </KeyboardAvoidingView>
  );
}
