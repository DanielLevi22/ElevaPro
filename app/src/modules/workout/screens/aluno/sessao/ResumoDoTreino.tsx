import {
  dataPorExtenso,
  type Evolucao,
  formatarDuracao,
  formatarVolume,
  type ResumoDaSessao,
  type Workout,
} from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { useContextoDoTreino } from '../../../hooks/useContextoDoTreino';

/**
 * O resumo do kit (tela 8): duração, volume, séries, gasto e os recordes da
 * sessão.
 *
 * O cartão "Coach IA" do kit ficou de fora: a IA do aluno tem issues próprias
 * (#151–#156), com consentimento e envio de dado a serviço externo.
 *
 * @example
 * <ResumoDoTreino treino={treino} resumo={resumo} evolucoes={evolucoes} concluidaEm={fim} … />
 */
interface ResumoDoTreinoProps {
  treino: Workout;
  resumo: ResumoDaSessao;
  evolucoes: Evolucao[];
  concluidaEm: number;
  onSair: () => void;
  onCompartilhar: () => void;
}

export function ResumoDoTreino({
  treino,
  resumo,
  evolucoes,
  concluidaEm,
  onSair,
  onCompartilhar,
}: ResumoDoTreinoProps) {
  const { fase } = useContextoDoTreino(treino);
  const quando = dataPorExtenso(new Date(concluidaEm));

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo(treino.muscle_group)}
      bottomSpace="fixedButton"
      overlay={
        <BotaoFixoNoRodape rotulo="Compartilhar" icone="share-outline" onPress={onCompartilhar} />
      }
    >
      <View className="flex-row justify-between">
        <BotaoRedondo icone="chevron-left" rotulo="Sair do resumo" onPress={onSair} />
        <BotaoRedondo icone="share" rotulo="Compartilhar" onPress={onCompartilhar} />
      </View>

      <View className="items-start pt-11">
        <Chip tom="destaque">Treino concluído</Chip>
        <Text className="mt-3 font-display-black text-[2rem] uppercase leading-tight tracking-tight text-hero">
          {treino.title}
        </Text>
        <Text className="mt-[0.4375rem] text-[0.84375rem] text-hero-secondary">
          {fase ? `${quando} · ${fase}` : quando}
        </Text>
      </View>

      <GradeDoResumo resumo={resumo} />

      {evolucoes.length > 0 ? (
        <TituloDeSecao estilo="rotulo">Evoluções da sessão</TituloDeSecao>
      ) : null}
      {evolucoes.map((evolucao) => (
        <LinhaDeEvolucao key={evolucao.itemId} evolucao={evolucao} />
      ))}
    </TelaDeVidroComFoto>
  );
}

const TAMANHO_DO_ICONE = 15;

function GradeDoResumo({ resumo }: { resumo: ResumoDaSessao }) {
  const blocos = [
    { icone: 'time-outline', rotulo: 'Duração', valor: formatarDuracao(resumo.duracaoSegundos) },
    { icone: 'trending-up', rotulo: 'Volume', valor: formatarVolume(resumo.volumeKg) },
    { icone: 'repeat', rotulo: 'Séries', valor: String(resumo.series) },
    { icone: 'flame-outline', rotulo: 'Gasto', valor: `${resumo.kcal} kcal` },
  ] as const;

  return (
    <View className="mt-[1.375rem] flex-row flex-wrap gap-2.5">
      {blocos.map((bloco) => (
        <BlocoDoResumo key={bloco.rotulo} {...bloco} />
      ))}
    </View>
  );
}

interface BlocoDoResumoProps {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  valor: string;
}

/** Metade da largura menos meio vão: a grade de duas colunas do kit. */
function BlocoDoResumo({ icone, rotulo, valor }: BlocoDoResumoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro classeExterna="basis-[47%] grow" className="p-3.5">
      <View className="mb-2.5 h-[1.875rem] w-[1.875rem] items-center justify-center rounded-[0.625rem] bg-glass-strong">
        <Ionicons name={icone} size={escalar(TAMANHO_DO_ICONE)} color={cores.primary} />
      </View>
      <Text className="font-display-black text-[1.3125rem] tracking-tight text-foreground">
        {valor}
      </Text>
      <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">{rotulo}</Text>
    </Vidro>
  );
}

const TAMANHO_DA_SETA = 16;

function LinhaDeEvolucao({ evolucao }: { evolucao: Evolucao }) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro classeExterna="mb-[0.5625rem]" className="flex-row items-center gap-3 p-[0.8125rem]">
      <View className="h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-[0.6875rem] bg-metrica-passos/20">
        <Ionicons name="trending-up" size={escalar(TAMANHO_DA_SETA)} color={cores.metricaPassos} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
          {evolucao.nome}
        </Text>
        <Text className="mt-px text-micro text-muted-foreground">{evolucao.texto}</Text>
      </View>
      <Text className="text-[0.65625rem] font-extrabold uppercase tracking-wider text-metrica-passos">
        PR
      </Text>
    </Vidro>
  );
}
