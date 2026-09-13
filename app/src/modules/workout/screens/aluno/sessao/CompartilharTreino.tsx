import {
  diaPorExtenso,
  formatarDuracao,
  formatarVolume,
  type ResumoDaSessao,
  type Workout,
} from '@elevapro/shared';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { Switch } from '@/components/ui/Switch';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { registrarAviso } from '@/lib/registro';
import { cn } from '@/lib/utils';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import {
  CardDeCompartilhar,
  type FormatoDoCard,
} from '../../../components/sessao/CardDeCompartilhar';
import { useContextoDoTreino } from '../../../hooks/useContextoDoTreino';
import { useNomeDoEspecialista } from '../../../hooks/useNomeDoEspecialista';

/**
 * O compartilhar do kit (tela 9): a prévia do card, o formato, o que entra nele
 * e o botão que o transforma em imagem.
 *
 * Duas diferenças do kit:
 *
 * - **sem "Enviar para"**: mandar direto ao Stories, ao WhatsApp ou salvar na
 *   galeria pede bibliotecas nativas que o app não tem, e o "Feed Eleva Pro"
 *   não existe. O botão abre o compartilhamento do sistema, que já oferece os
 *   três. Quatro botões que abrem a mesma folha diriam que fazem coisas
 *   diferentes;
 * - **sem o botão de ajustes** do topo: não há ajuste além dos que já estão na
 *   tela.
 *
 * @example
 * <CompartilharTreino treino={treino} resumo={resumo} recordes={2} concluidaEm={fim} onVoltar={voltar} />
 */
interface CompartilharTreinoProps {
  treino: Workout;
  resumo: ResumoDaSessao;
  recordes: number;
  concluidaEm: number;
  onVoltar: () => void;
}

const FORMATOS: { chave: FormatoDoCard; nome: string; proporcao: string }[] = [
  { chave: 'story', nome: 'Story', proporcao: '9:16' },
  { chave: 'post', nome: 'Post', proporcao: '1:1' },
  { chave: 'card', nome: 'Card', proporcao: '16:9' },
];

export function CompartilharTreino({
  treino,
  resumo,
  recordes,
  concluidaEm,
  onVoltar,
}: CompartilharTreinoProps) {
  const [formato, setFormato] = useState<FormatoDoCard>('story');
  const [inclusoes, setInclusoes] = useState({ recordes: true, foto: true, personal: false });
  const { fase } = useContextoDoTreino(treino);
  // O nome do personal é dado de outra pessoa: só é buscado se o aluno pedir.
  const personal = useNomeDoEspecialista(inclusoes.personal ? treino.specialist_id : null);
  const cartao = useRef<View>(null);
  const compartilhar = useCompartilharImagem(cartao);
  const nomeDoFormato = FORMATOS.find((f) => f.chave === formato)?.nome ?? '';

  const linha = [diaPorExtenso(new Date(concluidaEm)), fase, inclusoes.personal ? personal : null]
    .filter(Boolean)
    .join(' · ');
  const numeros = [
    { valor: formatarDuracao(resumo.duracaoSegundos), rotulo: 'Duração' },
    { valor: formatarVolume(resumo.volumeKg), rotulo: 'Volume' },
    { valor: String(resumo.series), rotulo: 'Séries' },
    ...(inclusoes.recordes ? [{ valor: String(recordes), rotulo: 'PRs' }] : []),
  ];

  return (
    <TelaDeVidroComFoto
      imagem={fotoDoGrupo(treino.muscle_group)}
      folgaNoFim="botaoFixo"
      sobreposicao={
        <BotaoFixoNoRodape
          rotulo={`Compartilhar ${nomeDoFormato.toLowerCase()}`}
          icone="share-outline"
          onPress={compartilhar}
        />
      }
    >
      <CabecalhoSobreFoto sobrelinha={treino.title} titulo="Compartilhar" onVoltar={onVoltar} />

      <Vidro classeExterna="mt-[1.125rem] rounded-[1.625rem]" className="rounded-[1.625rem] p-2.5">
        {/* `collapsable` desligado: sem ele o Android some com a view na
            otimização de layout, e não há o que fotografar. */}
        <View ref={cartao} collapsable={false}>
          <CardDeCompartilhar
            formato={formato}
            titulo={treino.title}
            linha={linha}
            numeros={numeros}
            foto={inclusoes.foto ? fotoDoGrupo(treino.muscle_group) : null}
          />
        </View>
        <View className="mt-2.5 flex-row gap-[0.4375rem]">
          {FORMATOS.map((opcao) => (
            <BotaoDeFormato
              key={opcao.chave}
              {...opcao}
              escolhido={opcao.chave === formato}
              onPress={() => setFormato(opcao.chave)}
            />
          ))}
        </View>
      </Vidro>

      <TituloDeSecao estilo="rotulo">Incluir no card</TituloDeSecao>
      <Vidro className="px-3.5 py-1">
        <LinhaDeInclusao
          rotulo="Recordes pessoais"
          ligado={inclusoes.recordes}
          onMudar={(recordes) => setInclusoes({ ...inclusoes, recordes })}
        />
        <LinhaDeInclusao
          rotulo="Foto de fundo do treino"
          ligado={inclusoes.foto}
          onMudar={(foto) => setInclusoes({ ...inclusoes, foto })}
          separada
        />
        <LinhaDeInclusao
          rotulo="Nome do personal"
          ligado={inclusoes.personal}
          onMudar={(ligado) => setInclusoes({ ...inclusoes, personal: ligado })}
          separada
        />
      </Vidro>
    </TelaDeVidroComFoto>
  );
}

/** Tira a foto do card e abre o compartilhamento do sistema. */
function useCompartilharImagem(cartao: React.RefObject<View | null>): () => Promise<void> {
  const [ocupado, setOcupado] = useState(false);

  return async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        showAlert({
          type: 'error',
          title: 'Sem compartilhamento',
          message: 'Este aparelho não oferece compartilhamento de imagens.',
        });
        return;
      }
      const imagem = await captureRef(cartao, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(imagem, { mimeType: 'image/png', UTI: 'public.png' });
    } catch {
      registrarAviso('treino.compartilhar');
      showAlert({
        type: 'error',
        title: 'Não deu',
        message: 'Não consegui gerar a imagem do treino. Tente de novo.',
      });
    } finally {
      setOcupado(false);
    }
  };
}

interface BotaoDeFormatoProps {
  nome: string;
  proporcao: string;
  escolhido: boolean;
  onPress: () => void;
}

function BotaoDeFormato({ nome, proporcao, escolhido, onPress }: BotaoDeFormatoProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: escolhido }}
      accessibilityLabel={`Formato ${nome}, ${proporcao}`}
      className={cn(
        'flex-1 items-center rounded-[0.8125rem] border-[0.09375rem] px-1.5 py-[0.5625rem]',
        escolhido ? 'border-primary bg-primary/20' : 'border-transparent bg-glass-strong'
      )}
    >
      <Text
        className={cn(
          'text-micro font-extrabold',
          escolhido ? 'text-primary-text' : 'text-foreground'
        )}
      >
        {nome}
      </Text>
      <Text className="mt-px text-[0.5625rem] font-bold tracking-widest text-placeholder">
        {proporcao}
      </Text>
    </TouchableOpacity>
  );
}

interface LinhaDeInclusaoProps {
  rotulo: string;
  ligado: boolean;
  onMudar: (ligado: boolean) => void;
  separada?: boolean;
}

function LinhaDeInclusao({ rotulo, ligado, onMudar, separada = false }: LinhaDeInclusaoProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-3 py-3',
        separada ? 'border-t border-glass-border' : null
      )}
    >
      <Text className="flex-1 text-[0.84375rem] font-semibold text-foreground">{rotulo}</Text>
      <Switch checked={ligado} onChange={onMudar} accessibilityLabel={rotulo} />
    </View>
  );
}
