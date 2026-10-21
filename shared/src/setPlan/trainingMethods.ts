/**
 * O catálogo fixo de técnicas de treino (TrainingMethod) que o especialista marca
 * nas séries. Vem de `docs/research/tecnicas-de-treino.md`; a BFR fica de fora
 * porque a pressão do manguito é dado de saúde.
 *
 * É código e não tabela: a lista não muda por usuário, e o texto que acompanha
 * cada técnica precisa de revisão no PR.
 *
 * A explicação afirma só o que a referência conclui. Cada referência foi
 * conferida no registro do PubMed (título, periódico, ano e conclusão do
 * resumo) em 20/10/2026. Técnica sem estudo publicado fica sem referência —
 * nunca se cita outro app ou blog.
 */

export type TrainingMethodGroup = "structure" | "execution" | "pairing" | "scheme" | "timed";

export interface TrainingMethodReference {
  /** Ex.: "Meta-análise, Sports Med, 2023". */
  label: string;
  url: string;
}

export interface TrainingMethod {
  id: string;
  label: string;
  group: TrainingMethodGroup;
  /** Aquecimento e preparação ficam fora do volume de trabalho. */
  countsTowardVolume: boolean;
  explanation: string;
  reference: TrainingMethodReference | null;
}

const pubmed = (pmid: number, label: string): TrainingMethodReference => ({
  label,
  url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
});

export const TRAINING_METHODS: readonly TrainingMethod[] = [
  {
    id: "warmup",
    label: "Aquecimento",
    group: "structure",
    countsTowardVolume: false,
    explanation:
      "Séries leves antes das de trabalho, para preparar o movimento e as articulações. Não contam no volume.",
    reference: null,
  },
  {
    id: "feeder",
    label: "Preparação",
    group: "structure",
    countsTowardVolume: false,
    explanation:
      "Séries de aproximação, com carga crescente e poucas repetições, até chegar à carga de trabalho. Não contam no volume.",
    reference: null,
  },
  {
    id: "working",
    label: "Normal",
    group: "structure",
    countsTowardVolume: true,
    explanation:
      "Série de trabalho com a carga e as repetições prescritas. Fazer várias séries por exercício dá mais hipertrofia que uma série só.",
    reference: pubmed(20300012, "Meta-análise, J Strength Cond Res, 2010"),
  },
  {
    id: "failure",
    label: "Até a falha",
    group: "structure",
    countsTowardVolume: true,
    explanation:
      "A série vai até não conseguir completar mais uma repetição. Ir até a falha não é necessário para ganhar força e massa, mas também não atrapalha.",
    reference: pubmed(33497853, "Meta-análise, J Sport Health Sci, 2022"),
  },
  {
    id: "rest_pause",
    label: "Rest-pause",
    group: "structure",
    countsTowardVolume: true,
    explanation:
      "Vai até perto da falha, pausa curta com a mesma carga e continua por mais algumas repetições. Com o mesmo volume, dá massa igual ao tradicional e leve vantagem em força.",
    reference: pubmed(34260860, "Ensaio randomizado, Appl Physiol Nutr Metab, 2021"),
  },
  {
    id: "myo_reps",
    label: "Myo-reps",
    group: "structure",
    countsTowardVolume: true,
    explanation:
      "Uma série de ativação perto da falha, seguida de mini-séries curtas com pausas de poucos segundos. Variação do rest-pause, sem estudo próprio.",
    reference: null,
  },
  {
    id: "cluster",
    label: "Cluster",
    group: "structure",
    countsTowardVolume: true,
    explanation:
      "A série é quebrada em blocos com pausas curtas entre eles. Dá o mesmo ganho de força e massa que o tradicional, com menos fadiga.",
    reference: pubmed(33475986, "Meta-análise, Sports Med, 2021"),
  },
  {
    id: "drop_set",
    label: "Drop-set",
    group: "structure",
    countsTowardVolume: true,
    explanation:
      "Ao chegar à falha, reduz a carga e continua sem descanso. Dá o mesmo ganho de massa que o tradicional, em metade a um terço do tempo.",
    reference: pubmed(37523092, "Meta-análise, Sports Med Open, 2023"),
  },
  {
    id: "sst",
    label: "SST",
    group: "structure",
    countsTowardVolume: true,
    explanation:
      "Sequência de pausas e reduções de carga muito curtas na mesma série. Um estudo mostrou mais espessura muscular logo após a sessão, em menos tempo; não há estudo de longo prazo.",
    reference: pubmed(31156459, "Estudo agudo, Front Physiol, 2019"),
  },
  {
    id: "forced_reps",
    label: "Repetições forçadas",
    group: "structure",
    countsTowardVolume: true,
    explanation:
      "Depois da falha, um parceiro ajuda nas últimas repetições. Aumenta a resposta hormonal e a fadiga na sessão; não há estudo de longo prazo mostrando mais ganho.",
    reference: pubmed(12905088, "Estudo agudo, Int J Sports Med, 2003"),
  },
  {
    id: "partial",
    label: "Parcial",
    group: "execution",
    countsTowardVolume: true,
    explanation:
      "Repetições em só uma parte do movimento. Feitas com o músculo alongado, mostraram bons resultados de hipertrofia em estudo.",
    reference: pubmed(33977835, "Ensaio randomizado, Eur J Sport Sci, 2022"),
  },
  {
    id: "twenty_ones",
    label: "21s",
    group: "execution",
    countsTowardVolume: true,
    explanation:
      "7 repetições na metade de baixo, 7 na de cima e 7 completas, sem pausa. Sem estudo do método.",
    reference: null,
  },
  {
    id: "negative",
    label: "Negativa",
    group: "execution",
    countsTowardVolume: true,
    explanation:
      "Ênfase na descida, mais lenta ou com mais carga. A excêntrica tende a dar um pouco mais de massa, mas sem diferença significativa: as duas fases importam.",
    reference: pubmed(28486337, "Meta-análise, J Strength Cond Res, 2017"),
  },
  {
    id: "isometric",
    label: "Isometria",
    group: "execution",
    countsTowardVolume: true,
    explanation:
      "Segura a carga parada numa posição por alguns segundos, no meio ou no fim do movimento.",
    reference: null,
  },
  {
    id: "tempo",
    label: "Cadência controlada",
    group: "execution",
    countsTowardVolume: true,
    explanation:
      "Tempo definido para cada fase da repetição (ex.: 3-1-1-0). Uma faixa ampla de durações dá hipertrofia parecida; muito lento, acima de 10 s por repetição, rende menos.",
    reference: pubmed(25601394, "Meta-análise, Sports Med, 2015"),
  },
  {
    id: "cheat",
    label: "Roubada",
    group: "execution",
    countsTowardVolume: true,
    explanation: "Usa impulso do corpo para vencer as últimas repetições. Sem estudo do método.",
    reference: null,
  },
  {
    id: "bi_set",
    label: "Bi-set",
    group: "pairing",
    countsTowardVolume: true,
    explanation:
      "Dois exercícios em sequência, sem descanso entre eles. Economiza tempo; com músculos opostos o volume se mantém melhor que com o mesmo músculo.",
    reference: pubmed(39903375, "Meta-análise, Sports Med, 2025"),
  },
  {
    id: "tri_set",
    label: "Tri-set",
    group: "pairing",
    countsTowardVolume: true,
    explanation: "Três exercícios em sequência, sem descanso entre eles. Sem estudo próprio.",
    reference: null,
  },
  {
    id: "giant_set",
    label: "Série gigante",
    group: "pairing",
    countsTowardVolume: true,
    explanation:
      "Quatro ou mais exercícios em sequência, sem descanso entre eles. Sem estudo próprio.",
    reference: null,
  },
  {
    id: "circuit",
    label: "Circuito",
    group: "pairing",
    countsTowardVolume: true,
    explanation:
      "Vários exercícios em sequência, com descanso só ao fim de cada volta. Sem estudo próprio.",
    reference: null,
  },
  {
    id: "pre_exhaustion",
    label: "Pré-exaustão",
    group: "pairing",
    countsTowardVolume: true,
    explanation:
      "Um exercício isolado antes do composto para o mesmo músculo. Manteve força e massa com menos volume total de treino.",
    reference: pubmed(31824336, "Estudo de intervenção, Front Physiol, 2019"),
  },
  {
    id: "post_exhaustion",
    label: "Pós-exaustão",
    group: "pairing",
    countsTowardVolume: true,
    explanation:
      "Um exercício isolado depois do composto para o mesmo músculo. Sem estudo próprio.",
    reference: null,
  },
  {
    id: "ascending_pyramid",
    label: "Pirâmide crescente",
    group: "scheme",
    countsTowardVolume: true,
    explanation:
      "A carga sobe e as repetições caem a cada série. Em treinados, não deu mais força nem massa que o tradicional.",
    reference: pubmed(28130627, "Ensaio randomizado, Eur J Appl Physiol, 2017"),
  },
  {
    id: "descending_pyramid",
    label: "Pirâmide decrescente",
    group: "scheme",
    countsTowardVolume: true,
    explanation:
      "Começa com a carga mais alta e reduz a cada série, subindo as repetições. Sem estudo próprio.",
    reference: null,
  },
  {
    id: "fst7",
    label: "FST-7",
    group: "scheme",
    countsTowardVolume: true,
    explanation:
      "Sete séries no fim do treino do músculo, com descanso curto, de 30 a 45 s. Sem estudo do método.",
    reference: null,
  },
  {
    id: "gvt",
    label: "GVT (10x10)",
    group: "scheme",
    countsTowardVolume: true,
    explanation:
      "Dez séries de dez repetições com a mesma carga. Não rendeu mais que cinco séries; o ganho parece estabilizar entre 4 e 6 séries por exercício.",
    reference: pubmed(27941492, "Ensaio randomizado, J Strength Cond Res, 2017"),
  },
  {
    id: "five_by_five",
    label: "5x5",
    group: "scheme",
    countsTowardVolume: true,
    explanation:
      "Cinco séries de cinco repetições com carga alta, voltado para força. Sem estudo do método.",
    reference: null,
  },
  {
    id: "top_set",
    label: "Top set",
    group: "scheme",
    countsTowardVolume: true,
    explanation:
      "A série principal e mais pesada do exercício no dia, seguida das séries de back-off. Sem estudo do método.",
    reference: null,
  },
  {
    id: "back_off",
    label: "Back-off",
    group: "scheme",
    countsTowardVolume: true,
    explanation:
      "Séries feitas depois da série principal, com carga menor, para somar volume. Sem estudo do método.",
    reference: null,
  },
  {
    id: "heavy_duty",
    label: "Heavy duty",
    group: "scheme",
    countsTowardVolume: true,
    explanation:
      "Uma única série muito intensa, até a falha ou além dela. Sem estudo do método como sistema.",
    reference: null,
  },
  {
    id: "emom",
    label: "EMOM",
    group: "timed",
    countsTowardVolume: true,
    explanation:
      "Um bloco de repetições no início de cada minuto; o que sobra do minuto é descanso. Sem estudo próprio em hipertrofia.",
    reference: null,
  },
  {
    id: "amrap",
    label: "AMRAP",
    group: "timed",
    countsTowardVolume: true,
    explanation:
      "O máximo de repetições ou voltas possível num tempo fixo. Sem estudo próprio em hipertrofia.",
    reference: null,
  },
];

export const TRAINING_METHOD_IDS = TRAINING_METHODS.map((m) => m.id);
