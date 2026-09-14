import type { AnaliseDoPrato, ComponenteDoPrato } from '@elevapro/shared';
import { useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { mensagemDeErroBff } from '@/shared/bff';
import { MACROS_ZERADOS, type Macros } from '../services/consumoDoDia';
import { FoodRecognitionService } from '../services/FoodRecognitionService';
import { fotoDoPrato } from '../services/fotoDoPrato';
import { pedidoDoPrato } from '../services/itensEstimados';
import { type PratoComPorcoes, pratoComPorcoes } from '../services/porcoesDoPrato';
import { type RegistroNoDiario, useRegistroNoDiario } from './useRegistroNoDiario';

export interface ScanDoPrato {
  imagem: string | null;
  analisando: boolean;
  resultado: AnaliseDoPrato | null;
  /** Os componentes com as gramas que o aluno ajustou. Vazio no contrato antigo. */
  componentes: ComponenteDoPrato[];
  macros: Macros;
  metaDiaria: Macros;
  fotografar: () => void;
  escolherDaGaleria: () => void;
  /** Soma (ou tira) gramas de um componente. */
  ajustarPorcao: (indice: number, deltaGramas: number) => void;
  /** Falso sem análise, ou com todos os componentes zerados: não há o que registrar. */
  podeAdicionar: boolean;
  adicionar: () => void;
  registro: RegistroNoDiario;
}

interface OpcoesDoScan {
  somenteLeitura: boolean;
  /** O token da sessão na hora do envio: a rota o lê do login, e o módulo não importa o de auth. */
  obterToken: () => string;
}

/**
 * O scan do prato: a foto, o reconhecimento pelo BFF, as porções ajustáveis e
 * o registro no diário.
 *
 * A imagem não é guardada em lugar nenhum — nem no banco, nem no bucket. Vai ao
 * BFF, que confere o consentimento de saúde antes, e o que fica é o resultado,
 * gravado com origem `scan` para o especialista saber que é estimativa.
 *
 * @example
 * const scan = useScanDoPrato(user.id, { somenteLeitura, obterToken: () => token });
 */
export function useScanDoPrato(
  alunoId: string,
  { somenteLeitura, obterToken }: OpcoesDoScan
): ScanDoPrato {
  const registro = useRegistroNoDiario(alunoId, { somenteLeitura });
  const [imagem, setImagem] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<AnaliseDoPrato | null>(null);
  const [gramas, setGramas] = useState<Record<number, number>>({});
  const prato = resultado ? pratoComPorcoes(resultado, gramas) : null;

  const analisar = async (origem: 'camera' | 'galeria') => {
    const uri = await fotoDoPrato(origem);
    if (!uri) return;
    setImagem(uri);
    setResultado(null);
    setGramas({});
    setAnalisando(true);
    FoodRecognitionService.analyzeFoodImage(uri, obterToken())
      .then(setResultado)
      .catch((erro) =>
        showAlert({
          title: 'Não deu para analisar',
          message: mensagemDeErroBff(erro),
          type: 'error',
        })
      )
      .finally(() => setAnalisando(false));
  };

  const ajustarPorcao = (indice: number, deltaGramas: number) => {
    const atual = prato?.componentes[indice]?.grams ?? 0;
    setGramas((antes) => ({ ...antes, [indice]: Math.max(0, atual + deltaGramas) }));
  };

  return {
    imagem,
    analisando,
    resultado,
    componentes: prato?.componentes ?? [],
    macros: prato?.macros ?? MACROS_ZERADOS,
    metaDiaria: registro.plano.meta,
    fotografar: () => analisar('camera'),
    escolherDaGaleria: () => analisar('galeria'),
    ajustarPorcao,
    podeAdicionar: prato !== null && temOQueRegistrar(prato),
    adicionar: () => {
      if (resultado && prato) registro.pedir(pedidoDoPrato(resultado, prato));
    },
    registro,
  };
}

/** Sem componentes vale o prato inteiro; com eles, ao menos um com gramas. */
function temOQueRegistrar(prato: PratoComPorcoes): boolean {
  return prato.componentes.length === 0 || prato.componentes.some((c) => c.grams > 0);
}
