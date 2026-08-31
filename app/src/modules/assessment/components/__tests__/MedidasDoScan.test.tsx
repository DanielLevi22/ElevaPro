import type { MedidasGeometricas } from '@elevapro/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MedidasDoScan } from '../MedidasDoScan';

function medidas(sobrescreve: Partial<MedidasGeometricas> = {}): MedidasGeometricas {
  return {
    px_per_cm_front: null,
    px_per_cm_back: null,
    px_per_cm_side: null,
    shoulder_drop_cm: null,
    shoulder_tilt_deg: null,
    hip_drop_cm: null,
    hip_tilt_deg: null,
    axis_deviation_cm: null,
    trunk_rotated: null,
    plumb_shoulder_cm: null,
    plumb_hip_cm: null,
    plumb_knee_cm: null,
    ...sobrescreve,
  };
}

/**
 * Renderiza já aberto.
 *
 * O bloco nasce recolhido: o Art. 18 garante acesso ao que foi tratado, não
 * exibição no meio do resultado — e "desvio do eixo 1,4 cm" sem faixa de
 * referência não comunica nada ao aluno, ou comunica ansiedade.
 */
function abrir(medidas: MedidasGeometricas) {
  render(<MedidasDoScan medidas={medidas} />);
  fireEvent.press(screen.getByText('Medido no seu aparelho'));
}

describe('as medidas na tela do aluno', () => {
  it('começa recolhido, mostrando só quantas medidas existem', () => {
    render(<MedidasDoScan medidas={medidas({ shoulder_drop_cm: 1.8 })} />);

    expect(screen.getByText(/1 medidas/)).toBeTruthy();
    expect(screen.queryByText('Desnível dos ombros')).toBeNull();
  });

  // Art. 18, II: medida gravada que só o especialista lê é tratamento sem livre
  // acesso. Esta seção é o acesso.
  it('mostra o que foi medido, com unidade', () => {
    abrir(medidas({ shoulder_drop_cm: 1.8 }));

    expect(screen.getByText('Desnível dos ombros')).toBeTruthy();
    expect(screen.getByText(/1\.8\s*cm/)).toBeTruthy();
  });

  // O sinal carrega o lado. Perder isso apontaria o ombro errado para o aluno
  // com toda a aparência de estar certo.
  it('traduz o sinal em lado, e mostra o número sem sinal', () => {
    abrir(medidas({ shoulder_drop_cm: -1.8, shoulder_tilt_deg: -2.3 }));

    expect(screen.getByText('esquerdo mais alto')).toBeTruthy();
    expect(screen.queryByText(/-1\.8/)).toBeNull();
  });

  it('omite a linha que não foi medida, em vez de mostrar zero', () => {
    abrir(medidas({ shoulder_drop_cm: 1.8 }));

    expect(screen.queryByText('Desnível do quadril')).toBeNull();
  });

  // Cabeçalho com nove traços afirmaria que houve medição e que ela deu zero —
  // que é um achado, não uma ausência.
  it('some inteira quando nada foi medido', () => {
    render(<MedidasDoScan medidas={medidas()} />);

    expect(screen.queryByText('Medido no seu aparelho')).toBeNull();
  });

  // Sem esta ressalva o aluno lê perspectiva como assimetria — o mesmo erro que
  // o prompt do BFF é instruído a não cometer.
  it('avisa quando o tronco estava virado na foto de frente', () => {
    abrir(medidas({ shoulder_drop_cm: 1.8, trunk_rotated: true }));

    expect(screen.getByText(/tronco estava um pouco virado/)).toBeTruthy();

    screen.unmount();
    abrir(medidas({ shoulder_drop_cm: 1.8, trunk_rotated: false }));

    expect(screen.queryByText(/tronco estava um pouco virado/)).toBeNull();
  });

  // A torção que o portão tolera entra 1:1 na inclinação medida, então abaixo
  // dela a medida não sabe de que lado o desnível cai. Nomear lado ali afirma
  // uma certeza que o aparelho consome inteira.
  it('não nomeia lado quando o desnível está abaixo da resolução', () => {
    abrir(medidas({ shoulder_drop_cm: 0.6, shoulder_tilt_deg: 0.7 }));

    expect(screen.getByText(/0\.6\s*cm/)).toBeTruthy();
    expect(screen.queryByText(/mais alto/)).toBeNull();
    expect(screen.getByText(/método resolva/)).toBeTruthy();
  });
});
