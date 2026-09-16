import { avisandoSeFalhar, registrarFalha } from '../registro';

describe('avisandoSeFalhar', () => {
  it('devolve o valor quando a busca funciona, sem registrar nada', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(avisandoSeFalhar('medida.ler', async () => 42)).resolves.toBe(42);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  // LGPD, Art. 6°, VII. A recusa da RLS da medida declarada (0056) volta pelo PostgREST
  // com a linha inteira: peso, gordura e circunferências. O log precisa do evento para
  // a observabilidade saber o que falhou, e de nada mais.
  it('a falha ao declarar medida não leva valor nenhum ao log', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const recusa = {
      code: '42501',
      message: 'new row violates row-level security policy',
      details: 'Failing row contains (…, 78.4, 180, 17.2, 82.5, …)',
    };

    await expect(
      avisandoSeFalhar('progress.declare_measurement', () => Promise.reject(recusa))
    ).rejects.toBe(recusa);

    const registrado = warn.mock.calls.flat().map(String).join(' ');
    warn.mockRestore();
    expect(registrado).toContain('progress.declare_measurement');
    if (/78\.4|180|17\.2|82\.5|Failing row/.test(registrado)) {
      throw new Error(`MEDIDA NO LOG: ${registrado}`);
    }
  });
});

describe('registrarFalha', () => {
  it('escreve JSON com o evento e só valores escalares de contexto', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    registrarFalha('medida.gravar', { origem: 'self' });

    expect(error).toHaveBeenCalledWith('{"nivel":"erro","evento":"medida.gravar","origem":"self"}');
    error.mockRestore();
  });
});
