import type { Food } from '@elevapro/shared';
import { useState } from 'react';
import { numeroDoBanco } from '../services/consumoDoDia';
import { densidadeDeProteina } from '../services/equivalenciaDaTroca';
import { useFoodCatalogSearch } from './useFoodCatalogSearch';
import { type RegistroNoDiario, useRegistroNoDiario } from './useRegistroNoDiario';

export interface BuscaDeAlimento {
  consulta: string;
  digitar: (texto: string) => void;
  categoria: string | null;
  escolherCategoria: (categoria: string | null) => void;
  maisProteina: boolean;
  alternarMaisProteina: () => void;
  resultados: Food[];
  buscando: boolean;
  faltamCalorias: number;
  adicionar: (food: Food) => void;
  registro: RegistroNoDiario;
}

/**
 * A busca no catálogo do aluno, e o "+" que põe o alimento no registro de hoje,
 * na porção de referência do catálogo.
 *
 * @example
 * const busca = useBuscaDeAlimento(user.id, { somenteLeitura: isMasquerading });
 */
export function useBuscaDeAlimento(
  alunoId: string,
  { somenteLeitura }: { somenteLeitura: boolean }
): BuscaDeAlimento {
  const registro = useRegistroNoDiario(alunoId, { somenteLeitura });
  const [consulta, setConsulta] = useState('');
  const [categoria, setCategoria] = useState<string | null>('proteina');
  const [maisProteina, setMaisProteina] = useState(false);
  const { results: resultados, searching: buscando } = useFoodCatalogSearch(consulta, categoria);
  const { meta, consumo } = registro.plano;

  return {
    consulta,
    digitar: setConsulta,
    categoria,
    escolherCategoria: setCategoria,
    maisProteina,
    alternarMaisProteina: () => setMaisProteina((atual) => !atual),
    resultados: maisProteina ? [...resultados].sort(porProteina) : resultados,
    buscando,
    faltamCalorias: Math.max(0, Math.round(meta.calorias - consumo.calorias)),
    adicionar: (food) => registro.pedir(pedidoDoAlimento(food)),
    registro,
  };
}

function porProteina(a: Food, b: Food): number {
  return densidadeDeProteina(b) - densidadeDeProteina(a);
}

/**
 * O pedido de registro de um Food do catálogo. Vai para o registro só o que a
 * soma e a tela usam: `created_by` e datas do catálogo não têm o que fazer no
 * que o aluno comeu (Art. 6°, III).
 */
function pedidoDoAlimento(food: Food) {
  const { id, name, category, serving_size, serving_unit, calories, protein, carbs, fat } = food;
  const quantidade = numeroDoBanco(serving_size) || 100;
  return {
    descricao: `${quantidade} ${serving_unit} de ${name}`,
    extras: [
      {
        quantity: quantidade,
        unit: serving_unit,
        food: { id, name, category, serving_size, serving_unit, calories, protein, carbs, fat },
        origem: 'busca' as const,
      },
    ],
  };
}
