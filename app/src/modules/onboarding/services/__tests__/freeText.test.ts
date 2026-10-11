import { cleanFreeText } from '../freeText';

describe('cleanFreeText', () => {
  it('tira espaço sobrando e mantém acento', () => {
    expect(cleanFreeText('  natação   em  mar ')).toBe('natação em mar');
  });

  it('não deixa passar pontuação nem símbolo', () => {
    expect(cleanFreeText('crossfit!!! <b>')).toBe('crossfit b');
  });

  it('corta em 30 caracteres: é um nome, não um texto', () => {
    expect(cleanFreeText('a'.repeat(50))).toHaveLength(30);
  });

  it('vazio continua vazio', () => {
    expect(cleanFreeText('   ')).toBe('');
  });
});
