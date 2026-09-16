import { AnamnesisService } from '../anamnesisService';

const mockSave = jest.fn();

jest.mock('@elevapro/shared', () => ({
  createAdaptiveAnamnesisService: () => ({ save: (input: unknown) => mockSave(input) }),
}));
jest.mock('@elevapro/supabase', () => ({ supabase: {} }));

describe('AnamnesisService.saveAdaptiveAnamnesis', () => {
  it('grava pelo serviço do shared como Praticante, e diz que salvou', async () => {
    mockSave.mockResolvedValue('created');

    const result = await AnamnesisService.saveAdaptiveAnamnesis('aluno-1', { weight: 78 }, true);

    // O que o serviço fez com a medida volta para a tela contar ao aluno (#312).
    expect(result).toEqual({ success: true, startingMeasure: 'created' });
    expect(mockSave).toHaveBeenCalledWith({
      studentId: 'aluno-1',
      answers: { weight: 78 },
      completed: true,
      selfGuided: true,
    });
  });

  // LGPD, Art. 6°, VII. O erro do PostgREST pode trazer a linha recusada, com peso,
  // medidas e o histórico da anamnese. Observabilidade precisa do evento, e não do dado.
  it('a falha ao gravar não leva medida nem resposta ao log', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSave.mockRejectedValue(new Error('new row violates policy: weight_kg 78.4, circ_waist 82'));

    const result = await AnamnesisService.saveAdaptiveAnamnesis('aluno-1', { weight: 78.4 }, true);

    const logged = error.mock.calls.flat().map(String).join(' ');
    error.mockRestore();
    expect(result.success).toBe(false);
    if (/78|82|weight|circ_/.test(logged)) {
      throw new Error(`MEDIDA NO LOG: ${logged}`);
    }
  });
});
