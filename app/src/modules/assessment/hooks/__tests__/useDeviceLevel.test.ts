import { renderHook, waitFor } from '@testing-library/react-native';
import { Accelerometer } from 'expo-sensors';
import { useDeviceLevel } from '../useDeviceLevel';

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    isAvailableAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
  },
}));

const G = 9.81;

/**
 * A gravidade que um aparelho em pé sente, torcido e inclinado nos ângulos
 * dados.
 *
 * Escrever o caso em graus e converter aqui é o que torna o teste legível: o
 * hook lê o vetor, e é o vetor que o sensor entrega — sem giroscópio, sem
 * ângulos de Euler.
 */
function gravidade(rollGraus: number, pitchGraus: number) {
  const roll = (rollGraus * Math.PI) / 180;
  const pitch = (pitchGraus * Math.PI) / 180;
  const noPlano = G * Math.cos(pitch);

  return {
    x: noPlano * Math.sin(roll),
    y: -noPlano * Math.cos(roll),
    z: G * Math.sin(pitch),
  };
}

/** Dispara uma leitura de sensor no listener registrado. */
function emitir(rollGraus: number, pitchGraus: number) {
  const listener = (Accelerometer.addListener as jest.Mock).mock.calls[0][0];
  listener(gravidade(rollGraus, pitchGraus));
}

describe('useDeviceLevel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Accelerometer.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Accelerometer.addListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
  });

  it('considera nivelado o aparelho em pé', async () => {
    const { result } = renderHook(() => useDeviceLevel());
    await waitFor(() => expect(Accelerometer.addListener).toHaveBeenCalled());

    emitir(0, 0);

    await waitFor(() => expect(result.current.nivelado).toBe(true));
    expect(result.current.pitch).toBe(0);
    expect(result.current.roll).toBe(0);
  });

  it('recusa inclinação além da tolerância', async () => {
    const { result } = renderHook(() => useDeviceLevel());
    await waitFor(() => expect(Accelerometer.addListener).toHaveBeenCalled());

    // 20° para trás encurta o corpo na imagem por perspectiva, e a altura em
    // pixels é a régua de todas as medidas derivadas.
    emitir(0, -20);

    // Esperar por `nivelado === false` passaria de imediato: é o estado
    // inicial. O pitch só chega pelo listener, então é ele que prova a leitura.
    await waitFor(() => expect(result.current.pitch).toBe(-20));
    expect(result.current.nivelado).toBe(false);
  });

  it('recusa torção lateral além da tolerância', async () => {
    const { result } = renderHook(() => useDeviceLevel());
    await waitFor(() => expect(Accelerometer.addListener).toHaveBeenCalled());

    emitir(15, 0);

    await waitFor(() => expect(result.current.roll).toBe(15));
    expect(result.current.nivelado).toBe(false);
  });

  it('sem sensor, libera o disparo em vez de prender o aluno', async () => {
    (Accelerometer.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useDeviceLevel());

    // `nivelado` verdadeiro com `disponivel` falso é a combinação que diz
    // "não dá para verificar" — a tela usa isso para não prometer conferência.
    // Só o ramo sem sensor produz `nivelado: true`, então é ele que se espera.
    await waitFor(() => expect(result.current.nivelado).toBe(true));
    expect(result.current.disponivel).toBe(false);
    expect(Accelerometer.addListener).not.toHaveBeenCalled();
  });

  // O aparelho de teste não tem giroscópio, e o `rotation` do DeviceMotion só
  // existe com ele. O listener caía fora, `disponivel` ficava `false` para
  // sempre, e a checagem de nível do portão era pulada em todo scan — trava
  // inerte desde que nasceu. A gravidade vem do acelerômetro, que todo
  // aparelho tem.
  it('lê o nível pelo acelerômetro, sem depender de giroscópio', async () => {
    const { result } = renderHook(() => useDeviceLevel());
    await waitFor(() => expect(Accelerometer.addListener).toHaveBeenCalled());

    const listener = (Accelerometer.addListener as jest.Mock).mock.calls[0][0];
    listener(gravidade(3, 0));

    await waitFor(() => expect(result.current.disponivel).toBe(true));
    expect(result.current.roll).toBe(3);
  });
});
