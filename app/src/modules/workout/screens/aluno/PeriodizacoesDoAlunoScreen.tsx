import type { CicloDoAluno } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { Chip } from '@/components/ui/Chip';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { CartaoDoCicloEmAndamento } from '../../components/aluno/CartaoDoCicloEmAndamento';
import { LinhaDoHistoricoDeCiclos } from '../../components/aluno/LinhaDoHistoricoDeCiclos';
import { useCiclosDoAluno } from '../../hooks/useCiclosDoAluno';
import { useNomeDoEspecialista } from '../../hooks/useNomeDoEspecialista';

/**
 * A aba Treinos do aluno — tela 1 do fluxo de treino do kit: o ciclo em
 * andamento em destaque e os outros no histórico, com filtro.
 *
 * O kit desenha busca e reticências no topo. Não entraram: com um ciclo por
 * vez e poucos no histórico não há o que buscar, e não há menu.
 *
 * @example
 * <PeriodizacoesDoAlunoScreen alunoId={user.id} />
 */
type Filtro = 'todas' | 'concluidas' | 'planejadas';

const STATUS_DO_FILTRO: Record<Exclude<Filtro, 'todas'>, CicloDoAluno['periodizacao']['status']> = {
  concluidas: 'completed',
  planejadas: 'planned',
};

export function PeriodizacoesDoAlunoScreen({ alunoId }: { alunoId: string }) {
  const router = useRouter();
  const { ciclos, carregando, falhou } = useCiclosDoAluno(alunoId);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const ativo = ciclos.find((c) => c.periodizacao.status === 'active') ?? null;
  const especialista = useNomeDoEspecialista(ativo?.periodizacao.specialist_id);
  const abrir = (ciclo: CicloDoAluno) =>
    router.push(ROUTES.WORKOUTS.PERIODIZATION(ciclo.periodizacao.id));

  const historico = ciclos.filter(
    (c) => c !== ativo && (filtro === 'todas' || c.periodizacao.status === STATUS_DO_FILTRO[filtro])
  );

  return (
    <TelaDeVidroComFoto imagem={fotoDoGrupo('braços')}>
      <CabecalhoSobreFoto sobrelinha="Meus treinos" titulo="Periodizações" />
      <ConteudoDaLista carregando={carregando} falhou={falhou} vazio={ciclos.length === 0}>
        {ativo ? (
          <CartaoDoCicloEmAndamento
            ciclo={ativo}
            especialista={especialista}
            onContinuar={() => abrir(ativo)}
          />
        ) : null}
        <FiltrosDosCiclos ciclos={ciclos} filtro={filtro} onMudar={setFiltro} />
        <TituloDeSecao estilo="rotulo" acao="Mais recentes">
          Histórico
        </TituloDeSecao>
        {historico.map((ciclo) => (
          <LinhaDoHistoricoDeCiclos
            key={ciclo.periodizacao.id}
            ciclo={ciclo}
            onPress={() => abrir(ciclo)}
          />
        ))}
        {historico.length === 0 ? (
          <Text className="py-6 text-center text-micro text-muted-foreground">
            Nenhum ciclo aqui.
          </Text>
        ) : null}
      </ConteudoDaLista>
    </TelaDeVidroComFoto>
  );
}

interface ConteudoDaListaProps {
  carregando: boolean;
  falhou: boolean;
  vazio: boolean;
  children: React.ReactNode;
}

/** Carregando, falha e lista vazia antes do conteúdo: "nenhum ciclo" só depois da busca. */
function ConteudoDaLista({ carregando, falhou, vazio, children }: ConteudoDaListaProps) {
  const cores = useCores();
  if (carregando) return <ActivityIndicator className="mt-10" color={cores.primary} />;
  if (falhou || vazio) {
    return (
      <Text className="px-6 py-10 text-center text-legenda text-muted-foreground">
        {falhou
          ? 'Não consegui carregar seus ciclos. Volte à aba para tentar de novo.'
          : 'Seu especialista ainda não montou um ciclo para você.'}
      </Text>
    );
  }
  return <>{children}</>;
}

interface FiltrosDosCiclosProps {
  ciclos: CicloDoAluno[];
  filtro: Filtro;
  onMudar: (filtro: Filtro) => void;
}

function FiltrosDosCiclos({ ciclos, filtro, onMudar }: FiltrosDosCiclosProps) {
  const quantos = (status: CicloDoAluno['periodizacao']['status']) =>
    ciclos.filter((c) => c.periodizacao.status === status).length;
  const opcoes: { chave: Filtro; rotulo: string }[] = [
    { chave: 'todas', rotulo: `Todas · ${ciclos.length}` },
    { chave: 'concluidas', rotulo: `Concluídas · ${quantos('completed')}` },
    { chave: 'planejadas', rotulo: `Planejadas · ${quantos('planned')}` },
  ];

  return (
    <View className="mt-4 flex-row flex-wrap gap-[0.4375rem]">
      {opcoes.map((opcao) => (
        <TouchableOpacity
          key={opcao.chave}
          onPress={() => onMudar(opcao.chave)}
          accessibilityRole="button"
          accessibilityState={{ selected: filtro === opcao.chave }}
        >
          <Chip tom={filtro === opcao.chave ? 'destaque' : 'neutro'}>{opcao.rotulo}</Chip>
        </TouchableOpacity>
      ))}
    </View>
  );
}
