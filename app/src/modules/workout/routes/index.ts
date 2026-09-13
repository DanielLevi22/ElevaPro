// Screens

// Telas do aluno, que as rotas de `(tabs)/workouts` escolhem pelo papel
export { DetalheDoTreinoScreen } from '../screens/aluno/DetalheDoTreinoScreen';
export { FasesDoCicloScreen } from '../screens/aluno/FasesDoCicloScreen';
export { SessaoDeTreinoScreen } from '../screens/aluno/sessao/SessaoDeTreinoScreen';
export { TreinosDaFaseScreen } from '../screens/aluno/TreinosDaFaseScreen';
export { default as CreateWorkoutScreen } from '../screens/CreateWorkoutScreen';
export { default as SelectExercisesScreen } from '../screens/SelectExercisesScreen';
export { default as WorkoutDetailsScreen } from '../screens/WorkoutDetailsScreen';
export { default as WorkoutsScreen } from '../screens/WorkoutsScreen';

// Routes
export { WorkoutNavigator } from './routes';
export {
  comModo,
  ehVisaoDoAluno,
  type ModoDaRota,
  modoDaRota,
  primeiroValor,
} from './visaoDoAluno';
