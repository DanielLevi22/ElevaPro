import { useState } from 'react';
import { View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { HowRankingWorksSheet } from '../components/HowRankingWorksSheet';
import { LeaderboardRow } from '../components/LeaderboardRow';
import { DeadlineCard, LeaderboardNotice, RankingInvite } from '../components/RankingCards';
import { RankingPodium } from '../components/RankingPodium';
import { type LeaderboardState, useLeaderboard } from '../hooks/useLeaderboard';
import { useRankingParticipant } from '../hooks/useRankingParticipant';
import type { ParticipantViewer, RankingViewer } from '../types';
import { buildLeaderboardView } from '../utils/leaderboardView';
import { deadlineLabel } from '../utils/rankingWeek';

/**
 * A aba Ranking — a tela "Ranking" do kit de vidro (issue #320).
 *
 * Quem pode participar vê o placar global, se entrar; o especialista vê o placar
 * dos alunos dele, e nunca o global, porque o aceite diz que o nome aparece só
 * para outros participantes. Quem decide é o CASL da rota.
 *
 * @example <RankingScreen userId={user.id} canParticipate />
 */
interface RankingScreenProps {
  userId: string;
  /** `manage RankingConsent`: sem ela, a tela é a do especialista. */
  canParticipate: boolean;
}

export function RankingScreen({ userId, canParticipate }: RankingScreenProps) {
  return canParticipate ? <ParticipantRanking userId={userId} /> : <SpecialistRanking />;
}

function ParticipantRanking({ userId }: { userId: string }) {
  const viewer = useRankingParticipant(userId);
  const leaderboard = useLeaderboard('global', viewer.participation === 'in');
  return <RankingLayout leaderboard={leaderboard} viewer={viewer} />;
}

const SPECIALIST: RankingViewer = { kind: 'specialist' };

function SpecialistRanking() {
  const leaderboard = useLeaderboard('my_students', true);
  return <RankingLayout leaderboard={leaderboard} viewer={SPECIALIST} />;
}

interface RankingLayoutProps {
  leaderboard: LeaderboardState;
  viewer: RankingViewer;
}

function RankingLayout({ leaderboard, viewer }: RankingLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('pernas')}
      refresh={{ refreshing: leaderboard.refreshing, onRefresh: leaderboard.refresh }}
    >
      <CabecalhoSobreFoto
        sobrelinha={viewer.kind === 'specialist' ? 'Meus alunos' : 'Competição semanal'}
        titulo="Ranking de Elite"
        direita={
          <BotaoRedondo icone="info" rotulo="Como funciona" onPress={() => setSheetOpen(true)} />
        }
      />
      <DeadlineCard label={deadlineLabel(new Date())} />
      {viewer.kind === 'participant' ? (
        <ParticipantBody leaderboard={leaderboard} viewer={viewer} />
      ) : (
        <LeaderboardBody leaderboard={leaderboard} emptyFor="specialist" />
      )}
      <HowRankingWorksSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        viewer={viewer}
      />
    </TelaDeVidroComFoto>
  );
}

/** Consultando e convite antes do placar: fora do ranking, não há o que pedir. */
function ParticipantBody({
  leaderboard,
  viewer,
}: {
  leaderboard: LeaderboardState;
  viewer: ParticipantViewer;
}) {
  if (viewer.participation === 'checking') return <LeaderboardSkeleton />;
  if (viewer.participation === 'out') {
    return <RankingInvite onJoin={viewer.join} busy={viewer.busy} />;
  }
  return <LeaderboardBody leaderboard={leaderboard} emptyFor="participant" />;
}

interface LeaderboardBodyProps {
  leaderboard: LeaderboardState;
  emptyFor: RankingViewer['kind'];
}

/** Carregando, falha, vazio — e só depois o pódio e a classificação. */
function LeaderboardBody({ leaderboard, emptyFor }: LeaderboardBodyProps) {
  if (leaderboard.loading) return <LeaderboardSkeleton />;

  const view = buildLeaderboardView(leaderboard.entries);
  const showNotice = leaderboard.failed || view.isEmpty;

  return (
    <>
      {showNotice ? (
        <LeaderboardNotice
          failed={leaderboard.failed}
          emptyFor={emptyFor}
          onRetry={leaderboard.refresh}
        />
      ) : (
        <RankingPodium slots={view.podium} />
      )}
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
