import { renderHook, waitFor } from '@testing-library/react-native';
import { DeviceMotion } from 'expo-sensors';
import { useDeviceLevel } from '../useDeviceLevel';

jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    isAvailableAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
  },
}));

/** Grau → radiano, para escrever os casos em graus e ler o teste. */
const rad = (graus: number) => (graus * Math.PI) / 180;

/** Dispara uma leitura de sensor no listener registrado. */
function emitir(beta: number, gamma: number) {
  const listener = (DeviceMotion.addListener as jest.Mock).mock.calls[0][0];
  listener({ rotation: { alpha: 0, beta, gamma } });
}

describe('useDeviceLevel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DeviceMotion.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (DeviceMotion.addListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
  });

  it('considera nivelado o aparelho em pé', async () => {
    const { result } = renderHook(() => useDeviceLevel());
    await waitFor(() => expect(DeviceMotion.addListener).toHaveBeenCalled());

    emitir(rad(90), rad(0));

    await waitFor(() => expect(result.current.nivelado).toBe(true));
    expect(result.current.pitch).toBe(0);
  });

  it('recusa inclinação além da tolerância', async () => {
    const { result } = renderHook(() => useDeviceLevel());
    await waitFor(() => expect(DeviceMotion.addListener).toHaveBeenCalled());

    // 20° para trás encurta o corpo na imagem por perspectiva, e a altura em
    // pixels é a régua de todas as medidas derivadas.
    emitir(rad(70), rad(0));

    // Esperar por `nivelado === false` passaria de imediato: é o estado
    // inicial. O pitch só chega pelo listener, então é ele que prova a leitura.
    await waitFor(() => expect(result.current.pitch).toBe(-20));
    expect(result.current.nivelado).toBe(false);
  });

  it('recusa torção lateral além da tolerância', async () => {
    const { result } = renderHook(() => useDeviceLevel());
    await waitFor(() => expect(DeviceMotion.addListener).toHaveBeenCalled());

    emitir(rad(90), rad(15));

    await waitFor(() => expect(result.current.roll).toBe(15));
    expect(result.current.nivelado).toBe(false);
  });

  it('sem sensor, libera o disparo em vez de prender o aluno', async () => {
    (DeviceMotion.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useDeviceLevel());

    // `nivelado` verdadeiro com `disponivel` falso é a combinação que diz
    // "não dá para verificar" — a tela usa isso para não prometer conferência.
    // Só o ramo sem sensor produz `nivelado: true`, então é ele que se espera.
    await waitFor(() => expect(result.current.nivelado).toBe(true));
    expect(result.current.disponivel).toBe(false);
    expect(DeviceMotion.addListener).not.toHaveBeenCalled();
  });
});
