import { TECHNIQUE_RELEASED } from '@/shared/technique/release';
import { ExerciciosDaTecnicaScreen, TecnicaEmDesenvolvimento } from '@/technique';

export default function Tecnica() {
  return TECHNIQUE_RELEASED ? <ExerciciosDaTecnicaScreen /> : <TecnicaEmDesenvolvimento />;
}
