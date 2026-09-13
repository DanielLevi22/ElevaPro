import { WorkoutDetailsScreen } from '@/workout';

/**
 * O treino de um aluno, aberto pelo especialista a partir da ficha do aluno.
 *
 * A rota caía na execução para quem não era especialista, mas `/students` só
 * existe na navegação do especialista: o aluno treina por `workouts/execute`,
 * e a sessão antiga que esta rota abria foi substituída pela sessão do kit.
 */
export default function TreinoDoAlunoRoute() {
  return <WorkoutDetailsScreen />;
}
