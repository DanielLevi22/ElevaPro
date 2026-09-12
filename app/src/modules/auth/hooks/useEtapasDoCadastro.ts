import type { ServiceType } from '@elevapro/shared';
import { useCallback, useMemo, useState } from 'react';

/**
 * As etapas do cadastro, fora da tela.
 *
 * Existe separado porque é a única lógica de verdade da tela de cadastro, e
 * porque o caminho não é linear: só o Specialist passa pela escolha de serviços,
 * e voltar precisa saber disso para não cair numa etapa que a pessoa nunca viu.
 * Isso é comportamento, e comportamento se testa sem renderizar nada.
 *
 * O impedimento é **exposto, não exibido**: o hook diz por que não dá para
 * avançar e quem mostra o aviso é a tela. Sem isso o hook precisaria conhecer o
 * `showAlert`, e o teste precisaria mockar um alerta para conferir uma regra de
 * fluxo.
 *
 * @example
 * const { etapa, avancar, impedimento } = useEtapasDoCadastro();
 * const seguir = () => (impedimento ? showAlert({ message: impedimento }) : avancar());
 */
export type Etapa = 'papel' | 'servicos' | 'dados';

export type PapelNoCadastro = 'specialist' | 'student' | 'member';

/** Só o Specialist tem serviços a declarar; os outros dois vão direto. */
const CAMINHO: Record<PapelNoCadastro, Etapa[]> = {
  specialist: ['papel', 'servicos', 'dados'],
  student: ['papel', 'dados'],
  member: ['papel', 'dados'],
};

/**
 * A barra de progresso do desenho tem três traços sempre, mesmo para quem passa
 * por duas etapas. Mudar o número de traços no meio do caminho faria a barra
 * encolher quando a pessoa escolhe "Sou Aluno", o que lê como perda de
 * progresso em vez de caminho mais curto.
 */
export const TOTAL_DE_TRACOS = 3;

type EtapasDoCadastro = {
  etapa: Etapa;
  indiceDoTraco: number;
  papel: PapelNoCadastro;
  escolherPapel: (papel: PapelNoCadastro) => void;
  servicos: ServiceType[];
  alternarServico: (servico: ServiceType) => void;
  /** Por que não dá para avançar agora, ou `null` quando dá. */
  impedimento: string | null;
  avancar: () => void;
  voltar: () => void;
  ehPrimeira: boolean;
  ehUltima: boolean;
};

export function useEtapasDoCadastro(): EtapasDoCadastro {
  const [etapa, setEtapa] = useState<Etapa>('papel');
  const [papel, setPapel] = useState<PapelNoCadastro>('specialist');
  const [servicos, setServicos] = useState<ServiceType[]>([]);

  const caminho = CAMINHO[papel];
  const posicao = caminho.indexOf(etapa);

  const impedimento = useMemo(() => {
    if (etapa === 'servicos' && servicos.length === 0) {
      return 'Selecione pelo menos um serviço que você oferece';
    }
    return null;
  }, [etapa, servicos.length]);

  /**
   * Trocar de papel não move a etapa — a escolha acontece na primeira e quem
   * avança é o botão — e **não** limpa os serviços já marcados: voltar e
   * reconfirmar "Sou Especialista" não deveria apagar o que foi preenchido.
   */
  const escolherPapel = useCallback((proximo: PapelNoCadastro) => {
    setPapel(proximo);
  }, []);

  const alternarServico = useCallback((servico: ServiceType) => {
    setServicos((atuais) =>
      atuais.includes(servico) ? atuais.filter((s) => s !== servico) : [...atuais, servico]
    );
  }, []);

  const avancar = useCallback(() => {
    if (impedimento) return;
    const proxima = CAMINHO[papel][CAMINHO[papel].indexOf(etapa) + 1];
    if (proxima) setEtapa(proxima);
  }, [etapa, impedimento, papel]);

  const voltar = useCallback(() => {
    const anterior = CAMINHO[papel][CAMINHO[papel].indexOf(etapa) - 1];
    if (anterior) setEtapa(anterior);
  }, [etapa, papel]);

  return {
    etapa,
    // O traço aceso é a posição no caminho real, mas a última etapa sempre
    // acende o terceiro traço: quem faz duas etapas chega ao fim da barra.
    indiceDoTraco: posicao === caminho.length - 1 ? TOTAL_DE_TRACOS - 1 : posicao,
    papel,
    escolherPapel,
    servicos,
    alternarServico,
    impedimento,
    avancar,
    voltar,
    ehPrimeira: posicao === 0,
    ehUltima: posicao === caminho.length - 1,
  };
}
