import { contagem, contarExercicios, type Workout } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { CartaoDeTreino } from '@/components/ui/CartaoDeTreino';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { EstadoDaTela } from '../../components/aluno/EstadoDaTela';
import {
  type EstadoDoTreino,
  LinhaDoTreinoDaFase,
} from '../../components/aluno/LinhaDoTreinoDaFase';
import { useTreinosDaFase } from '../../hooks/useTreinosDaFase';
import { comModo, type ModoDaRota } from '../../routes/visaoDoAluno';

/**
 * Uma fase na visão do aluno — tela 2 do fluxo de treino do kit.
 *
 * O kit chama o destaque de "Sugerido para hoje". Aqui ele é **"Próximo"**: a
 * regra de qual treino é do dia ainda é a #291, e o que existe é o rodízio —
 * o seguinte ao último feito. Dizer "hoje" sem a regra seria afirmar o que o
 * app não sabe.
 *
 * O destaque e o botão de começar só existem na fase **ativa**. Numa planejada
 * ou concluída a tela lista os treinos e mais nada: "Começar treino" de uma
 * fase que ainda não começou convidaria a treinar fora do plano.
 *
 * @example
 * <TreinosDaFaseScreen periodizacaoId={cicloId} faseId={faseId} alunoId={user.id} modo={modo} />
 */
interface TreinosDaFaseScreenProps {
  periodizacaoId: string;
  faseId: string;
  alunoId: string;
  modo: ModoDaRota;
}

const PRIMEIRA_LETRA = 65;

export function TreinosDaFaseScreen({
  periodizacaoId,
  faseId,
  alunoId,
  modo,
}: TreinosDaFaseScreenProps) {
  const router = useRouter();
  const dados = useTreinosDaFase(periodizacaoId, faseId, alunoId);
  const { fase, treinos } = dados;

  if (!fase)
    return <EstadoDaTela naoEncontrado={dados.naoEncontrada} mensagem="Fase não encontrada." />;

  const ativa = fase.status === 'active';
  const proximo = ativa ? dados.proximo : null;
  const abrir = (treino: Workout) => router.push(comModo(ROUTES.WORKOUTS.DETAILS(treino.id), modo));

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo(proximo?.muscle_group)}>
      <CabecalhoSobreFoto
        sobrelinha={sobrelinhaDaFase(dados.numeroDaFase, fase.name)}
        titulo={ativa ? 'Próximo treino' : 'Treinos da fase'}
        onVoltar={router.back}
      />
      {proximo ? (
        <View className="mt-[1.125rem]">
          <DestaqueDoProximo
            treino={proximo}
            letra={letraDoTreino(treinos.indexOf(proximo))}
            treinouHoje={dados.treinouHoje}
            onAbrir={() => abrir(proximo)}
          />
        </View>
      ) : null}
      <ListaDaFase dados={dados} proximo={proximo} onAbrir={abrir} />
    </TelaDeVidroComFoto>
  );
}

interface ListaDaFaseProps {
  dados: ReturnType<typeof useTreinosDaFase>;
  proximo: Workout | null;
  onAbrir: (treino: Workout) => void;
}

function ListaDaFase({ dados, proximo, onAbrir }: ListaDaFaseProps) {
  const cores = useCores();
  // Antes da busca voltar a lista está vazia, e "0 treinos" seria afirmar que
  // a fase não tem treino.
  if (dados.carregandoTreinos) return <ActivityIndicator className="mt-8" color={cores.primary} />;

  return (
    <>
      <TituloDeSecao estilo="rotulo" acao={contagem(dados.treinos.length, 'treino', 'treinos')}>
        Treinos da fase
      </TituloDeSecao>
      {dados.treinos.map((treino, indice) => (
        <LinhaDoTreinoDaFase
          key={treino.id}
          letra={letraDoTreino(indice)}
          titulo={treino.title}
          exercicios={contarExercicios(treino)}
          estado={estadoDoTreino(treino, proximo, dados.feitos)}
          onPress={() => onAbrir(treino)}
        />
      ))}
      {dados.treinos.length === 0 ? (
        <Text className="py-8 text-center text-micro text-muted-foreground">
          Seu especialista ainda não montou os treinos desta fase.
        </Text>
      ) : null}
    </>
  );
}

interface DestaqueDoProximoProps {
  treino: Workout;
  letra: string;
  treinouHoje: boolean;
  onAbrir: () => void;
}

/**
 * O próximo treino continua sendo o próximo mesmo depois de um treino hoje. O
 * chip "Treinou hoje" fala do **aluno**, e não do treino — o que estava aqui
 * antes, "Feito hoje", marcava como feito justamente o treino que não foi. A
 * pergunta antes de um segundo treino no mesmo dia mora no detalhe, onde o
 * treino começa de fato.
 */
function DestaqueDoProximo({ treino, letra, treinouHoje, onAbrir }: DestaqueDoProximoProps) {
  const chips = [
    { texto: 'Próximo', tom: 'destaque' as const },
    { texto: `Treino ${letra}` },
    ...(treinouHoje ? [{ texto: 'Treinou hoje' }] : []),
  ];

  return (
    <CartaoDeTreino
      tamanho="destaque"
      titulo={treino.title}
      chips={chips}
      imagem={fotoDoGrupo(treino.muscle_group)}
      exercicios={contarExercicios(treino)}
      onPress={onAbrir}
      acao={{ rotulo: 'Começar treino', icone: 'play', onPress: onAbrir }}
    />
  );
}

/** A letra é a posição na fase — A, B, C —, como o kit a mostra. */
function letraDoTreino(indice: number): string {
  return String.fromCharCode(PRIMEIRA_LETRA + Math.max(0, indice));
}

function estadoDoTreino(
  treino: Workout,
  proximo: Workout | null,
  feitos: Set<string>
): EstadoDoTreino {
  if (treino.id === proximo?.id) return 'proximo';
  return feitos.has(treino.id) ? 'feito' : 'pendente';
}

/** "Fase 2 · Hipertrofia", sem repetir quando a fase se chama "Fase 2". */
function sobrelinhaDaFase(numero: number, nome: string): string {
  const rotulo = `Fase ${numero}`;
  return nome.trim().toLowerCase() === rotulo.toLowerCase() ? rotulo : `${rotulo} · ${nome}`;
}
