import { createHidratacao, createStudentsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { type CoposDoDia, coposDoDia, metaDeAgua, totalAoTocarNoCopo } from '../services/aguaDoDia';
import { AVISO_DE_MODO_LEITURA } from './usePlanoDoDia';

const agua = createHidratacao(supabase);
const alunos = createStudentsService(supabase);

export interface AguaDoDiaDoAluno {
  /** `YYYY-MM-DD` de hoje, o dia que os copos gravam. */
  hoje: string;
  metaMl: number;
  totalMl: number;
  copos: CoposDoDia;
  tocar: (indice: number) => void;
}

/**
 * A água de hoje do aluno: a meta pelo último peso, os copos e o toque que
 * reescreve o total do dia.
 *
 * O toque muda a tela na hora e grava depois. Se o banco recusar — sem
 * consentimento de saúde, a RLS da `0052` recusa —, o total volta e o aluno
 * sabe por quê.
 *
 * @example
 * const agua = useAguaDoDia(user.id, { somenteLeitura: isMasquerading });
 */
export function useAguaDoDia(
  alunoId: string,
  { somenteLeitura }: { somenteLeitura: boolean }
): AguaDoDiaDoAluno {
  const hoje = getLocalDateISOString();
  const [totalMl, setTotalMl] = useState(0);
  const [pesoKg, setPesoKg] = useState<number | null>(null);
  const metaMl = metaDeAgua(pesoKg);

  useFocusEffect(
    useCallback(() => {
      agua
        .lerDia(alunoId, hoje)
        .then(setTotalMl)
        .catch(() => setTotalMl(0));
      alunos
        .fetchUltimasPesagens(alunoId, 1)
        .then(([ultima]) => setPesoKg(ultima?.weight_kg ?? null))
        .catch(() => setPesoKg(null));
    }, [alunoId, hoje])
  );

  const tocar = (indice: number) => {
    if (somenteLeitura) return showAlert(AVISO_DE_MODO_LEITURA);
    const anterior = totalMl;
    const novo = totalAoTocarNoCopo(indice, anterior, metaMl);
    setTotalMl(novo);
    agua.gravarDia(alunoId, hoje, novo).catch(() => {
      setTotalMl(anterior);
      showAlert({
        title: 'Não deu para registrar a água',
        message:
          'Confira a conexão. Se você revogou a autorização de dados de saúde, o registro fica parado.',
        type: 'error',
      });
    });
  };

  return { hoje, metaMl, totalMl, copos: coposDoDia(totalMl, metaMl), tocar };
}
