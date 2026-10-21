import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { fotoDoObjetivo } from '@/shared/imagens/fotosDeTreino';
import { CartaoDaFase } from '../../components/aluno/CartaoDaFase';
import { CartaoDaPeriodizacao } from '../../components/aluno/CartaoDaPeriodizacao';
import { EstadoDaTela } from '../../components/aluno/EstadoDaTela';
import { useExportPlan } from '../../hooks/useExportPlan';
import { useFasesDaPeriodizacao } from '../../hooks/useFasesDaPeriodizacao';
import { comModo, type ModoDaRota } from '../../routes/visaoDoAluno';

/**
 * As fases da periodização, na visão do aluno — tela 1 do fluxo de treino do kit.
 *
 * A do especialista continua em `PeriodizationDetailsScreen`, com ativar,
 * encerrar e criar fase. O botão do canto exporta o plano completo em PDF (#431). As duas liam o papel com `isStudentView` em cada
 * botão; separadas, cada uma tem só o que o papel dela faz.
 *
 * @example
 * <FasesDaPeriodizacaoScreen periodizacaoId={id} alunoId={user.id} studentName={nome} modo={modo} />
 */
interface FasesDaPeriodizacaoScreenProps {
  periodizacaoId: string;
  alunoId: string;
  /** O nome que vai ao PDF; nulo sem nome preenchido. */
  studentName: string | null;
  modo: ModoDaRota;
}

export function FasesDaPeriodizacaoScreen({
  periodizacaoId,
  alunoId,
  studentName,
  modo,
}: FasesDaPeriodizacaoScreenProps) {
  const router = useRouter();
  const { periodizacao, fases, especialista, naoEncontrado } = useFasesDaPeriodizacao(
    periodizacaoId,
    alunoId
  );

  const { exportPdf, generating } = useExportPlan(periodizacaoId, {
    student: studentName,
    specialist: especialista,
  });

  if (!periodizacao) {
    return <EstadoDaTela naoEncontrado={naoEncontrado} mensagem="Periodização não encontrada." />;
  }

  return (
    <TelaDeVidroComFoto image={fotoDoObjetivo(periodizacao.objective)}>
      <CabecalhoSobreFoto
        sobrelinha="Periodização"
        titulo={periodizacao.name}
        onVoltar={router.back}
        direita={
          fases.length > 0 ? (
            <BotaoRedondo
              icone="download"
              rotulo={generating ? 'Gerando o PDF do plano' : 'Exportar o plano completo em PDF'}
              onPress={exportPdf}
            />
          ) : null
        }
      />
      <CartaoDaPeriodizacao
        periodizacao={periodizacao}
        fases={fases.length}
        treinos={fases.reduce((soma, fase) => soma + (fase.workouts_count ?? 0), 0)}
        especialista={especialista}
      />

      <TituloDeSecao estilo="rotulo">Fases</TituloDeSecao>
      {fases.map((fase, indice) => (
        <CartaoDaFase
          key={fase.id}
          fase={fase}
          numero={indice + 1}
          onPress={() => router.push(comModo(ROUTES.WORKOUTS.PHASE(periodizacaoId, fase.id), modo))}
        />
      ))}
      {fases.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-micro text-muted-foreground">
            Seu especialista ainda não montou as fases desta periodização.
          </Text>
        </View>
      ) : null}
    </TelaDeVidroComFoto>
  );
}
