import { useState } from 'react';
import { View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { HowRankingWorksSheet } from '../components/HowRankingWorksSheet';
import { LeaderboardRow } from '../components/LeaderboardRow';
import { DeadlineCard, LeaderboardNotice, RankingInvite } from '../components/RankingCards';
import { RankingPodium } from '../components/RankingPodium';
import { type LeaderboardState, useLeaderboard } from '../hooks/useLeaderboard';
import { type RankingParticipation, useRankingConsent } from '../hooks/useRankingConsent';
import { buildLeaderboardView } from '../utils/leaderboardView';
import { deadlineLabel } from '../utils/rankingWeek';

/**
 * A aba Ranking — a tela "Ranking" do kit de vidro (issue #320).
 *
 * Quem pratica vê o placar global, se participar; o especialista vê o placar dos
 * alunos dele, e nunca o global, porque o aceite diz que o nome aparece só para
 * outros participantes.
 *
 * @example <RankingScreen userId={user.id} isSpecialist={false} />
 */
interface RankingScreenProps {
  userId: string;
  isSpecialist: boolean;
}

export function RankingScreen({ userId, isSpecialist }: RankingScreenProps) {
  return isSpecialist ? <SpecialistRanking /> : <ParticipantRanking userId={userId} />;
}

function ParticipantRanking({ userId }: { userId: string }) {
  const consent = useRankingConsent(userId);
  const leaderboard = useLeaderboard('global', consent.participation === 'in');
  return (
    <RankingLayout
      leaderboard={leaderboard}
      participation={consent.participation}
      busy={consent.busy}
      onJoin={() => changeParticipation(consent.join, 'ranking.entrar')}
      onLeave={() => changeParticipation(consent.leave, 'ranking.sair')}
    />
  );
}

function SpecialistRanking() {
  const leaderboard = useLeaderboard('my_students', true);
  return (
    <RankingLayout
      leaderboard={leaderboard}
      participation={null}
      busy={false}
      onJoin={noop}
      onLeave={noop}
    />
  );
}

interface RankingLayoutProps {
  leaderboard: LeaderboardState;
  /** `null` para o especialista, que não participa. */
  participation: RankingParticipation | null;
  busy: boolean;
  onJoin: () => Promise<void> | void;
  onLeave: () => Promise<void> | void;
}

function RankingLayout({ leaderboard, participation, busy, onJoin, onLeave }: RankingLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeAfter = (action: () => Promise<void> | void) => async () => {
    await action();
    setSheetOpen(false);
  };

  return (
    <TelaDeVidroComFoto
      imagem={fotoDoGrupo('pernas')}
      refresh={{ refreshing: leaderboard.refreshing, onRefresh: leaderboard.refresh }}
    >
      <CabecalhoSobreFoto
        sobrelinha={participation === null ? 'Meus alunos' : 'Competição semanal'}
        titulo="Ranking de Elite"
        direita={
          <BotaoRedondo icone="info" rotulo="Como funciona" onPress={() => setSheetOpen(true)} />
        }
      />
      <DeadlineCard label={deadlineLabel(new Date())} />
      <RankingBody
        leaderboard={leaderboard}
        participation={participation}
        busy={busy}
        onJoin={onJoin}
      />
      <HowRankingWorksSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        participation={participation}
        busy={busy}
        onJoin={closeAfter(onJoin)}
        onLeave={closeAfter(onLeave)}
      />
    </TelaDeVidroComFoto>
  );
}

interface RankingBodyProps {
  leaderboard: LeaderboardState;
  participation: RankingParticipation | null;
  busy: boolean;
  onJoin: () => void;
}

/** Consultando, convite, falha, vazio — e só depois o placar. */
function RankingBody({ leaderboard, participation, busy, onJoin }: RankingBodyProps) {
  if (participation === 'checking' || leaderboard.loading) return <LeaderboardSkeleton />;
  if (participation === 'out') return <RankingInvite onJoin={onJoin} busy={busy} />;

  const view = buildLeaderboardView(leaderboard.entries);
  const notice =
    leaderboard.failed || view.isEmpty ? (
      <LeaderboardNotice
        failed={leaderboard.failed}
        isSpecialist={participation === null}
        onRetry={leaderboard.refresh}
      />
    ) : null;

  return (
    <>
      {notice ?? <RankingPodium slots={view.podium} />}
      {view.rows.length > 0 ? <TituloDeSecao>Classificação</TituloDeSecao> : null}
      {view.rows.map((entry) => (
        <LeaderboardRow key={entry.studentId} entry={entry} />
      ))}
      {view.ownRowOutside ? (
        <View className="mt-3 border-t border-glass-border pt-3">
          <LeaderboardRow entry={view.ownRowOutside} />
        </View>
      ) : null}
    </>
  );
}

/** Vidro no formato do placar, enquanto ele não chega. */
function LeaderboardSkeleton() {
  return (
    <View className="mt-[1.625rem] gap-[0.5625rem]" accessibilityLabel="Carregando o placar">
      <Vidro className="h-[10rem]">
        <View />
      </Vidro>
      {[0, 1, 2].map((line) => (
        <Vidro key={line} className="h-[3.75rem] opacity-60">
          <View />
        </Vidro>
      ))}
    </View>
  );
}

async function changeParticipation(action: () => Promise<void>, event: string): Promise<void> {
  try {
    await action();
  } catch {
    registrarFalha(event);
    showAlert({
      type: 'error',
      title: 'Não deu certo',
      message: 'Não consegui atualizar sua participação no ranking. Tente de novo.',
    });
  }
}

function noop(): void {}
