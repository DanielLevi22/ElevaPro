import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { fotoDoObjetivo } from '@/shared/imagens/fotosDeTreino';
import { CartaoDaFase } from '../../components/aluno/CartaoDaFase';
import { CartaoDoCiclo } from '../../components/aluno/CartaoDoCiclo';
import { EstadoDaTela } from '../../components/aluno/EstadoDaTela';
import { useFasesDoCiclo } from '../../hooks/useFasesDoCiclo';
import { comModo, type ModoDaRota } from '../../routes/visaoDoAluno';

/**
 * As fases do ciclo, na visão do aluno — tela 1 do fluxo de treino do kit.
 *
 * A do especialista continua em `PeriodizationDetailsScreen`, com ativar,
 * encerrar e criar fase. As duas liam o papel com `isStudentView` em cada
 * botão; separadas, cada uma tem só o que o papel dela faz.
 *
 * @example
 * <FasesDoCicloScreen periodizacaoId={id} alunoId={user.id} modo={modo} />
 */
interface FasesDoCicloScreenProps {
  periodizacaoId: string;
  alunoId: string;
  modo: ModoDaRota;
}

export function FasesDoCicloScreen({ periodizacaoId, alunoId, modo }: FasesDoCicloScreenProps) {
  const router = useRouter();
  const { periodizacao, fases, especialista, naoEncontrado } = useFasesDoCiclo(
    periodizacaoId,
    alunoId
  );

  if (!periodizacao) {
    return <EstadoDaTela naoEncontrado={naoEncontrado} mensagem="Ciclo não encontrado." />;
  }

  return (
    <TelaDeVidroComFoto imagem={fotoDoObjetivo(periodizacao.objective)}>
      <CabecalhoSobreFoto
        sobrelinha="Periodização"
        titulo={periodizacao.name}
        onVoltar={router.back}
      />
      <CartaoDoCiclo
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
            Seu especialista ainda não montou as fases deste ciclo.
          </Text>
        </View>
      ) : null}
    </TelaDeVidroComFoto>
  );
}
