import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useNomeDoEspecialista } from '@/hooks/useNomeDoEspecialista';
import { cn } from '@/lib/utils';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { HidratacaoDeHoje } from '../../components/aluno/HidratacaoDeHoje';
import { TelaDaNutricao } from '../../components/aluno/TelaDaNutricao';
import { type AderenciaDoAluno, useAderenciaDoAluno } from '../../hooks/useAderenciaDoAluno';
import { useAguaDoDia } from '../../hooks/useAguaDoDia';
import type { DiaDeAderencia } from '../../services/aderenciaDaSemana';
import { mediaDeAguaDaSemana } from '../../services/aguaDoDia';

/**
 * Tela 8 do fluxo de nutrição do kit: as barras da semana, a grade de números
 * e a nota do especialista.
 *
 * O calendário do cabeçalho não entrou: a tela é da semana corrente, e não há
 * outra para escolher.
 *
 * @example
 * <AderenciaDaSemanaScreen alunoId={user.id} somenteLeitura={false} />
 */
export function AderenciaDaSemanaScreen({
  alunoId,
  somenteLeitura,
}: {
  alunoId: string;
  somenteLeitura: boolean;
}) {
  const router = useRouter();
  const semana = useAderenciaDoAluno(alunoId);
  const agua = useAguaDoDia(alunoId, { somenteLeitura });

  return (
    <TelaDaNutricao>
      <View className="pt-1.5">
        <CabecalhoSobreFoto
          sobrelinha={`Semana ${intervaloDaSemana(semana.inicio, semana.fim)}`}
          titulo="Sua aderência"
          onVoltar={router.back}
        />
      </View>
      <BarrasDaSemana dias={semana.dias} />
      <GradeDaSemana
        semana={semana}
        mediaDeAgua={mediaDeAguaDaSemana(semana.aguaDaSemana, agua.hoje, agua.totalMl)}
      />
      <HidratacaoDeHoje agua={agua} />
      <NotaDoEspecialista nota={semana.notaDoEspecialista} especialistaId={semana.especialistaId} />
    </TelaDaNutricao>
  );
}

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/**
 * "07–13 de setembro", ou "31 de agosto – 06 de setembro" quando a semana vira
 * o mês. Montado da própria string: `new Date("2026-09-07")` é lido como UTC e
 * volta um dia em fuso negativo.
 */
export function intervaloDaSemana(inicio: string, fim: string): string {
  const mesDe = (data: string) => MESES[Number(data.slice(5, 7)) - 1];
  const dia = (data: string) => data.slice(8, 10);
  if (mesDe(inicio) === mesDe(fim)) return `${dia(inicio)}–${dia(fim)} de ${mesDe(fim)}`;
  return `${dia(inicio)} de ${mesDe(inicio)} – ${dia(fim)} de ${mesDe(fim)}`;
}

function BarrasDaSemana({ dias }: { dias: DiaDeAderencia[] }) {
  return (
    <Vidro classeExterna="mt-4" className="p-4">
      <View className="h-[7.75rem] flex-row items-end justify-between gap-2">
        {dias.map((dia) => (
          <BarraDoDia key={dia.data} dia={dia} />
        ))}
      </View>
    </Vidro>
  );
}

/** O kit desenha a barra de dia sem registro com 4% da altura, para ela existir. */
const ALTURA_MINIMA = 4;
/** `0 0 14px -2px` da primária no dia na meta. */
const BRILHO_DA_META = { blur: 14, espalhamento: -2 } as const;

function BarraDoDia({ dia }: { dia: DiaDeAderencia }) {
  const brilho = useBrilho();
  const percentual = dia.percentual ?? 0;

  return (
    <View
      accessible
      accessibilityLabel={`${dia.data}: ${dia.percentual === null ? 'sem registro' : `${percentual}%`}`}
      className="h-full flex-1 items-center justify-end gap-[0.4375rem]"
    >
      <Text
        className={cn(
          'text-[0.625rem] font-bold',
          dia.destaque ? 'text-primary-text' : 'text-placeholder'
        )}
      >
        {dia.percentual === null ? '—' : percentual}
      </Text>
      <View
        className={cn(
          'w-full rounded-lg',
          percentual === 0 ? 'bg-glass-strong' : null,
          percentual > 0 && dia.destaque ? 'bg-primary' : null,
          percentual > 0 && !dia.destaque ? 'bg-primary/45' : null
        )}
        style={{
          // A altura é o próprio dado: não cabe em classe.
          height: `${Math.max(ALTURA_MINIMA, Math.min(100, percentual))}%`,
          boxShadow: dia.destaque ? brilho(BRILHO_DA_META) : undefined,
        }}
      />
      <Text className="text-[0.65625rem] font-bold text-placeholder">{dia.rotulo}</Text>
    </View>
  );
}

function GradeDaSemana({
  semana,
  mediaDeAgua,
}: {
  semana: AderenciaDoAluno;
  mediaDeAgua: number | null;
}) {
  const cores = useCores();

  return (
    <View className="mt-3 gap-2.5">
      <View className="flex-row gap-2.5">
        <BlocoDaSemana
          icone="locate-outline"
          cor={cores.textoProteina}
          valor={semana.aderencia === null ? '—' : `${semana.aderencia}%`}
          rotulo="Aderência"
        />
        <BlocoDaSemana
          icone="flame-outline"
          cor={cores.textoGordura}
          valor={semana.mediaDeCalorias === null ? '—' : milhar(semana.mediaDeCalorias)}
          rotulo="Média kcal"
        />
      </View>
      <View className="flex-row gap-2.5">
        <BlocoDaSemana
          icone="water-outline"
          cor={cores.textoCarboidrato}
          valor={mediaDeAgua === null ? '—' : `${umaCasa(mediaDeAgua / 1000)} L`}
          rotulo="Água"
        />
        <BlocoDaSemana
          icone={
            semana.variacaoDePeso !== null && semana.variacaoDePeso > 0
              ? 'trending-up'
              : 'trending-down'
          }
          cor={cores.primaryText}
          valor={textoDoPeso(semana)}
          rotulo="Peso"
        />
      </View>
    </View>
  );
}

/** "2,6": uma casa, com vírgula. */
function umaCasa(valor: number): string {
  return (Math.round(valor * 10) / 10).toString().replace('.', ',');
}

/** "2.180": o kit separa milhar com ponto. */
function milhar(valor: number): string {
  return String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "−1,4 kg" entre as duas últimas pesagens; "72,5 kg" com uma só; "—" sem nenhuma. */
function textoDoPeso({ variacaoDePeso, pesoAtual }: AderenciaDoAluno): string {
  const decimal = (valor: number) =>
    (Math.round(Math.abs(valor) * 10) / 10).toString().replace('.', ',');
  if (variacaoDePeso === null) return pesoAtual === null ? '—' : `${decimal(pesoAtual)} kg`;
  if (variacaoDePeso > 0) return `+${decimal(variacaoDePeso)} kg`;
  if (variacaoDePeso < 0) return `−${decimal(variacaoDePeso)} kg`;
  return '0 kg';
}

interface BlocoDaSemanaProps {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  valor: string;
  rotulo: string;
}

function BlocoDaSemana({ icone, cor, valor, rotulo }: BlocoDaSemanaProps) {
  const escalar = useEscala();

  return (
    <Vidro classeExterna="flex-1" className="p-3.5">
      <View className="mb-2.5 h-[1.875rem] w-[1.875rem] items-center justify-center rounded-[0.625rem] bg-glass-strong">
        <Ionicons name={icone} size={escalar(15)} color={cor} />
      </View>
      <Text className="font-display-black text-[1.3125rem] tracking-tight text-foreground">
        {valor}
      </Text>
      <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">{rotulo}</Text>
    </Vidro>
  );
}

function NotaDoEspecialista({
  nota,
  especialistaId,
}: {
  nota: string | null;
  especialistaId: string | null;
}) {
  const nome = useNomeDoEspecialista(especialistaId);
  if (!nota) return null;

  return (
    <>
      <TituloDeSecao estilo="rotulo">Do seu especialista</TituloDeSecao>
      <Vidro className="flex-row items-start gap-3 p-[0.9375rem]">
        <View className="h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-[0.6875rem] bg-glass-strong">
          <Text className="text-[0.875rem] font-bold text-foreground">
            {(nome ?? 'E').charAt(0)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[0.875rem] font-bold text-foreground">
            {nome ?? 'Seu especialista'}
          </Text>
          <Text className="mt-[0.1875rem] text-[0.78125rem] leading-[1.125rem] text-muted-foreground">
            {nota}
          </Text>
        </View>
      </Vidro>
    </>
  );
}
