import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { EscalaDePse } from './EscalaDePse';

/**
 * "Como foi o treino?" — a PSE, a sensação e as observações, em tela cheia.
 *
 * Serve três lugares: o fim da sessão de musculação, o fim do cardio e a
 * correção no histórico. O modo `correcao` existe porque o Art. 18, III dá ao
 * titular o direito de corrigir o que ele mesmo declarou; ele traz os valores
 * gravados, troca os textos e oferece apagar a observação.
 *
 * @example
 * <TelaDeFeedback imagem={foto} onFechar={voltar} onSalvar={(pse, notas) => salvar(pse, notas)} />
 */
interface TelaDeFeedbackProps {
  imagem: ImageSourcePropType;
  onFechar: () => void;
  onSalvar: (pse: number, notas: string) => void;
  modo?: 'registro' | 'correcao';
  pseInicial?: number | null;
  notasIniciais?: string | null;
  /** Só na correção: apaga a observação e mantém a sessão. */
  onApagarObservacao?: () => void;
  /** Enquanto grava, o botão não aceita um segundo toque. */
  salvando?: boolean;
}

/** O meio da escala: nem leve nem puxado, até o aluno dizer. */
const PSE_PADRAO = 5;

export function TelaDeFeedback({
  imagem,
  onFechar,
  onSalvar,
  modo = 'registro',
  pseInicial,
  notasIniciais,
  onApagarObservacao,
  salvando = false,
}: TelaDeFeedbackProps) {
  const [pse, setPse] = useState(pseInicial ?? PSE_PADRAO);
  const [notas, setNotas] = useState(notasIniciais ?? '');
  const corrigindo = modo === 'correcao';

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TelaDeVidroComFoto
        imagem={imagem}
        folgaNoFim="botaoFixo"
        sobreposicao={
          <BotaoFixoNoRodape
            icone="checkmark"
            rotulo={corrigindo ? 'Salvar correção' : 'Salvar e finalizar'}
            onPress={() => {
              if (!salvando) onSalvar(pse, notas);
            }}
          />
        }
      >
        <View className="flex-row justify-end">
          <BotaoRedondo icone="close" rotulo="Fechar sem salvar" onPress={onFechar} />
        </View>
        <Cabecalho corrigindo={corrigindo} />
        <EscalaDePse pse={pse} onMudar={setPse} />

        <TituloDeSecao estilo="rotulo">Observações</TituloDeSecao>
        <Observacoes notas={notas} onMudar={setNotas} />
        {corrigindo && onApagarObservacao && notas.trim().length > 0 ? (
          <TouchableOpacity
            onPress={onApagarObservacao}
            accessibilityRole="button"
            className="mt-3 items-center py-2"
          >
            <Text className="text-legenda font-semibold text-destructive">Apagar observação</Text>
          </TouchableOpacity>
        ) : null}
      </TelaDeVidroComFoto>
    </KeyboardAvoidingView>
  );
}

const TAMANHO_DO_CHECK = 36;
/** `0 0 34px -4px` da primária, como no kit. */
const BRILHO_DO_CHECK = { blur: 34, espalhamento: -4 } as const;

/**
 * O subtítulo diz quem lê, toda vez, e não uma vez só no consentimento: o que
 * muda o que a pessoa escreve é saber, na hora de escrever, que o personal vai
 * ler (Art. 6°, VI). Na correção o tempo verbal muda, e a mudança é o ponto —
 * o feedback JÁ FOI LIDO, e a correção aparece marcada.
 */
function Cabecalho({ corrigindo }: { corrigindo: boolean }) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();

  return (
    <View className="items-center pt-6">
      <View
        className="h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border-2 border-primary bg-primary/20"
        style={{ boxShadow: brilho(BRILHO_DO_CHECK) }}
      >
        <Ionicons name="checkmark" size={escalar(TAMANHO_DO_CHECK)} color={cores.primary} />
      </View>
      <Text className="mt-4 text-[1.625rem] font-bold tracking-tight text-hero">
        {corrigindo ? 'Corrigir feedback' : 'Como foi o treino?'}
      </Text>
      <Text className="mt-1.5 text-center text-[0.84375rem] text-hero-secondary">
        {corrigindo
          ? 'Seu personal já leu este feedback. A correção aparece marcada para ele.'
          : 'Seu personal vê este feedback.'}
      </Text>
    </View>
  );
}

function Observacoes({ notas, onMudar }: { notas: string; onMudar: (notas: string) => void }) {
  const cores = useCores();

  return (
    <Vidro className="min-h-[5.5rem] p-3.5">
      <TextInput
        value={notas}
        onChangeText={onMudar}
        multiline
        textAlignVertical="top"
        placeholder="Ex.: o ombro direito incomodou na última série. Reduzi a carga."
        placeholderTextColor={cores.placeholder}
        accessibilityLabel="Observações para o seu personal"
        className="min-h-[3.75rem] text-[0.84375rem] leading-snug text-foreground"
      />
    </Vidro>
  );
}
