import { queryStatisticsForQuantity } from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';
import { readRecords } from 'react-native-health-connect';

/**
 * Frequência cardíaca média de uma sessão de treino, lida do relógio.
 *
 * **Só a média.** A série de batimentos permitiria inferir estresse, atividade
 * sexual e crise de ansiedade — muito além de acompanhar treino. É a mesma
 * minimização que a `0046` aplicou à FC de repouso, e o motivo de este módulo
 * devolver um número, e nunca a lista de amostras que ele leu.
 *
 * Mora no módulo de treino, e não em `useHealthData`, porque a pergunta é outra:
 * lá é o agregado do dia, aqui é o período de uma sessão.
 */

/**
 * Faixa fisiológica em esforço. 30 bpm é abaixo do atleta de endurance mais
 * bradicárdico; 230 é acima da FC máxima de qualquer adulto. É a mesma faixa do
 * CHECK da `0049` — fora dela o banco recusaria a linha e derrubaria a gravação
 * da sessão inteira, então o corte acontece aqui.
 */
const BPM_MINIMO = 30;
const BPM_MAXIMO = 230;

function mediaPlausivel(valor: number): number | null {
  if (!Number.isFinite(valor)) return null;
  const arredondado = Math.round(valor);
  return arredondado >= BPM_MINIMO && arredondado <= BPM_MAXIMO ? arredondado : null;
}

async function mediaAndroid(inicio: Date, fim: Date): Promise<number | null> {
  const { records } = await readRecords('HeartRate', {
    timeRangeFilter: {
      operator: 'between',
      startTime: inicio.toISOString(),
      endTime: fim.toISOString(),
    },
  });

  // Cada registro do Health Connect carrega uma série de amostras. A média é a
  // das amostras, não a das séries: séries têm tamanhos diferentes, e a média
  // de médias daria peso igual a um bloco de 2 e a um de 200.
  const batimentos = records.flatMap((record) =>
    (record.samples ?? []).map((amostra) => amostra.beatsPerMinute)
  );
  if (batimentos.length === 0) return null;

  const soma = batimentos.reduce((total, bpm) => total + bpm, 0);
  return mediaPlausivel(soma / batimentos.length);
}

async function mediaIOS(inicio: Date, fim: Date): Promise<number | null> {
  const stats = await queryStatisticsForQuantity(
    'HKQuantityTypeIdentifierHeartRate',
    ['discreteAverage'],
    { filter: { date: { startDate: inicio, endDate: fim } } }
  );

  const media = stats.averageQuantity?.quantity;
  return media == null ? null : mediaPlausivel(media);
}

/**
 * Média de batimentos do período, ou `null` quando não há o que gravar.
 *
 * Nulo cobre três casos que dão no mesmo para quem grava: o relógio não estava
 * no pulso, a permissão foi negada (o Health Connect devolve lista vazia em vez
 * de lançar), e a leitura veio fora da faixa fisiológica. Nunca zero — zero bpm
 * gravado como medida significaria parada cardíaca.
 *
 * @example
 * const bpm = await mediaDeBatimentos(inicioDaSessao, fimDaSessao);
 */
export async function mediaDeBatimentos(inicio: Date, fim: Date): Promise<number | null> {
  if (fim.getTime() <= inicio.getTime()) return null;

  try {
    return Platform.OS === 'ios' ? await mediaIOS(inicio, fim) : await mediaAndroid(inicio, fim);
  } catch {
    // Falha de leitura não é zero batimento. A sessão é gravada sem a FC, do
    // mesmo modo que é gravada sem observação quando falta consentimento.
    return null;
  }
}
