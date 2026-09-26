export { SpecialistDashboard } from './components/SpecialistDashboard';
export { HomeDoAluno } from './screens/HomeDoAluno';
export type { SeenRiskSignal } from './services/shouldShowRiskBanner';
export { shouldShowRiskBanner, toSeenRiskSignal } from './services/shouldShowRiskBanner';
export type { SeenTrainingSignal } from './services/shouldShowTrainingSignal';
export {
  shouldShowTrainingSignal,
  toSeenTrainingSignal,
} from './services/shouldShowTrainingSignal';
export { useRiskBannerSeenStore } from './store/riskBannerSeenStore';
export { useTrainingSignalSeenStore } from './store/trainingSignalSeenStore';
export type {
  DadosDaHomeDoAluno,
  DadosDoPainelDoEspecialista,
  EstadoDaAnamnese,
  FonteDaSaude,
  SaudeDoDia,
  TreinoSugerido,
} from './types';
