import type { Workout } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { AlvoDoVidro } from '@/components/ui/AlvoDoVidro';
import { showConfirm } from '@/components/ui/appAlert';
import { BrilhoAmbiente } from '@/components/ui/BrilhoAmbiente';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { CartaoDeTreino } from '@/components/ui/CartaoDeTreino';
import { FundoDeFoto, RECEITA_DA_HOME } from '@/components/ui/FundoDeFoto';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { LinhaDoTreinoDaFase } from '../../components/aluno/LinhaDoTreinoDaFase';
import { useTreinosDaFase } from '../../hooks/useTreinosDaFase';
import { comModo } from '../../services/visaoDoAluno';

/**
 * A fase ativa na visão do aluno — tela 2 do fluxo de treino do kit.
 *
 * O kit chama o destaque de "Sugerido para hoje". Aqui ele é **"Próximo"**: a
 * regra de qual treino é do dia ainda é a #291, e o que existe é o rodízio —
 * o seguinte ao último feito. Dizer "hoje" sem a regra seria afirmar o que o
 * app não sabe.
 *
 * @example
 * <TreinosDaFaseScreen periodizacaoId={cicloId} faseId={faseId} alunoId={user.id} />
 */
interface TreinosDaFaseScreenProps {
  periodizacaoId: string;
  faseId: string;
  alunoId: string;
  modo?: string;
}

const PRIMEIRA_LETRA = 65;

export function TreinosDaFaseScreen({
  periodizacaoId,
  faseId,
  alunoId,
  modo,
}: TreinosDaFaseScreenProps) {
  const router = useRouter();
  const cores = useCores();
  const dados = useTreinosDaFase(periodizacaoId, faseId, alunoId);
  const { fase, treinos, proximo, feitos } = dados;

  if (!fase) {
    return (
      <ScreenLayout className="items-center justify-center">
        <ActivityIndicator color={cores.primary} />
      </ScreenLayout>
    );
  }

  const abrir = (treino: Workout) => router.push(comModo(ROUTES.WORKOUTS.DETAILS(treino.id), modo));

  return (
    <ScreenLayout useSafeArea={false}>
      <AlvoDoVidro
        fundo={
          <>
            <FundoDeFoto
              imagem={fotoDoGrupo(proximo?.treino.muscle_group)}
              receita={RECEITA_DA_HOME}
            />
            <BrilhoAmbiente />
          </>
        }
      >
        <ScrollView
          contentContainerClassName="px-4 pb-28 pt-14"
          showsVerticalScrollIndicator={false}
        >
          <CabecalhoSobreFoto
            sobrelinha={sobrelinhaDaFase(dados.numeroDaFase, fase.name)}
            titulo="Próximo treino"
            onVoltar={router.back}
          />

          {proximo ? (
            <View className="mt-[1.125rem]">
              <DestaqueDoProximo
                treino={proximo.treino}
                letra={letraDoTreino(treinos.indexOf(proximo.treino))}
                feitoHoje={proximo.feitoHoje}
                onAbrir={() => abrir(proximo.treino)}
              />
            </View>
          ) : null}

          {/* Antes da busca voltar a lista está vazia, e "0 treinos" seria
              afirmar que a fase não tem treino. */}
          {dados.carregando && treinos.length === 0 ? (
            <ActivityIndicator className="mt-8" color={cores.primary} />
          ) : null}
          <TituloDeSecao estilo="rotulo" acao={`${treinos.length} treinos`}>
            Treinos da fase
          </TituloDeSecao>
          {treinos.map((treino, indice) => (
            <LinhaDoTreinoDaFase
              key={treino.id}
              letra={letraDoTreino(indice)}
              titulo={treino.title}
              exercicios={contarExercicios(treino)}
              estado={estadoDoTreino(treino, proximo?.treino, feitos)}
              onPress={() => abrir(treino)}
            />
          ))}
          {treinos.length === 0 && !dados.carregando ? (
            <Text className="py-8 text-center text-micro text-muted-foreground">
              Seu especialista ainda não montou os treinos desta fase.
            </Text>
          ) : null}
        </ScrollView>
      </AlvoDoVidro>
    </ScreenLayout>
  );
}

interface DestaqueDoProximoProps {
  treino: Workout;
  letra: string;
  feitoHoje: boolean;
  onAbrir: () => void;
}

/**
 * Já treinou hoje, o cartão não some: o próximo continua sendo o próximo, e o
 * botão pede confirmação antes de um segundo treino no mesmo dia — a mesma
 * pergunta que a tela anterior fazia.
 */
function DestaqueDoProximo({ treino, letra, feitoHoje, onAbrir }: DestaqueDoProximoProps) {
  const comecar = () => {
    if (!feitoHoje) return onAbrir();
    showConfirm({
      title: 'Treino realizado',
      message: 'Você já registrou um treino hoje. Deseja realizar outro treino?',
      type: 'warning',
      confirmText: 'Sim, treinar',
      cancelText: 'Cancelar',
      onConfirm: onAbrir,
    });
  };

  return (
    <CartaoDeTreino
      tamanho="destaque"
      titulo={treino.title}
      chips={[
        { texto: feitoHoje ? 'Feito hoje' : 'Próximo', tom: feitoHoje ? 'neutro' : 'destaque' },
        { texto: `Treino ${letra}` },
      ]}
      imagem={fotoDoGrupo(treino.muscle_group)}
      exercicios={contarExercicios(treino)}
      onPress={onAbrir}
      acao={{
        rotulo: feitoHoje ? 'Treinar de novo' : 'Começar treino',
        icone: 'play',
        onPress: comecar,
      }}
    />
  );
}

/** A letra é a posição na fase — A, B, C —, como o kit a mostra. */
function letraDoTreino(indice: number): string {
  return String.fromCharCode(PRIMEIRA_LETRA + Math.max(0, indice));
}

function contarExercicios(treino: Workout): number {
  return treino.exercises_count ?? treino.exercises?.length ?? 0;
}

function estadoDoTreino(
  treino: Workout,
  proximo: Workout | undefined,
  feitos: Set<string>
): 'proximo' | 'feito' | 'pendente' {
  if (treino.id === proximo?.id) return 'proximo';
  return feitos.has(treino.id) ? 'feito' : 'pendente';
}

/** "Fase 2 · Hipertrofia", sem repetir quando a fase se chama "Fase 2". */
function sobrelinhaDaFase(numero: number, nome: string): string {
  const rotulo = `Fase ${numero}`;
  return nome.trim().toLowerCase() === rotulo.toLowerCase() ? rotulo : `${rotulo} · ${nome}`;
}
