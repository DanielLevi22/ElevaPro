import type { ResumoDaPeriodizacao } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { Chip } from '@/components/ui/Chip';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { useNomeDoEspecialista } from '@/hooks/useNomeDoEspecialista';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { CartaoDaPeriodizacaoAtiva } from '../../components/aluno/CartaoDaPeriodizacaoAtiva';
import { LinhaDoHistoricoDePeriodizacoes } from '../../components/aluno/LinhaDoHistoricoDePeriodizacoes';
import { useResumosDasPeriodizacoes } from '../../hooks/useResumosDasPeriodizacoes';

/**
 * A aba Treinos do aluno — tela 1 do fluxo de treino do kit: a periodização
 * em andamento em destaque e as outras no histórico, com filtro.
 *
 * O kit desenha busca e reticências no topo. Não entraram: com uma periodização por
 * vez e poucas no histórico não há o que buscar, e não há menu.
 *
 * @example
 * <PeriodizacoesDoAlunoScreen alunoId={user.id} />
 */
type Filtro = 'todas' | 'concluidas' | 'planejadas';

const STATUS_DO_FILTRO: Record<
  Exclude<Filtro, 'todas'>,
  ResumoDaPeriodizacao['periodizacao']['status']
> = {
  concluidas: 'completed',
  planejadas: 'planned',
};

export function PeriodizacoesDoAlunoScreen({ alunoId }: { alunoId: string }) {
  const router = useRouter();
  const { resumos, carregando, falhou } = useResumosDasPeriodizacoes(alunoId);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const ativo = resumos.find((c) => c.periodizacao.status === 'active') ?? null;
  const especialista = useNomeDoEspecialista(ativo?.periodizacao.specialist_id);
  const abrir = (resumo: ResumoDaPeriodizacao) =>
    router.push(ROUTES.WORKOUTS.PERIODIZATION(resumo.periodizacao.id));

  const historico = resumos.filter(
    (c) => c !== ativo && (filtro === 'todas' || c.periodizacao.status === STATUS_DO_FILTRO[filtro])
  );

  return (
    <TelaDeVidroComFoto imagem={fotoDoGrupo('braços')}>
      <CabecalhoSobreFoto sobrelinha="Meus treinos" titulo="Periodizações" />
      <ConteudoDaLista carregando={carregando} falhou={falhou} vazio={resumos.length === 0}>
        {ativo ? (
          <CartaoDaPeriodizacaoAtiva
            resumo={ativo}
            especialista={especialista}
            onContinuar={() => abrir(ativo)}
          />
        ) : null}
        <FiltrosDasPeriodizacoes resumos={resumos} filtro={filtro} onMudar={setFiltro} />
        <TituloDeSecao estilo="rotulo" acao="Mais recentes">
          Histórico
        </TituloDeSecao>
        {historico.map((resumo) => (
          <LinhaDoHistoricoDePeriodizacoes
            key={resumo.periodizacao.id}
            resumo={resumo}
            onPress={() => abrir(resumo)}
          />
        ))}
        {historico.length === 0 ? (
          <Text className="py-6 text-center text-micro text-muted-foreground">
            Nenhuma periodização aqui.
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

/** Carregando, falha e lista vazia antes do conteúdo: "nenhuma periodização" só depois da busca. */
function ConteudoDaLista({ carregando, falhou, vazio, children }: ConteudoDaListaProps) {
  const cores = useCores();
  if (carregando) return <ActivityIndicator className="mt-10" color={cores.primary} />;
  if (falhou || vazio) {
    return (
      <Text className="px-6 py-10 text-center text-legenda text-muted-foreground">
        {falhou
          ? 'Não consegui carregar suas periodizações. Volte à aba para tentar de novo.'
          : 'Seu especialista ainda não montou uma periodização para você.'}
      </Text>
    );
  }
  return <>{children}</>;
}

interface FiltrosDasPeriodizacoesProps {
  resumos: ResumoDaPeriodizacao[];
  filtro: Filtro;
  onMudar: (filtro: Filtro) => void;
}

function FiltrosDasPeriodizacoes({ resumos, filtro, onMudar }: FiltrosDasPeriodizacoesProps) {
  const quantos = (status: ResumoDaPeriodizacao['periodizacao']['status']) =>
    resumos.filter((c) => c.periodizacao.status === status).length;
  const opcoes: { chave: Filtro; rotulo: string }[] = [
    { chave: 'todas', rotulo: `Todas · ${resumos.length}` },
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
