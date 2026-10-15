import { changeLabel } from '../changeLabel';

describe('o que mudou, na sobrelinha da C2', () => {
  it('diz a mudança com o texto da tela', () => {
    expect(changeLabel({ main_goal: 'Hipertrofia' })).toBe('Novo objetivo: ganhar massa');
    expect(changeLabel({ training_days: 4 })).toBe('Novos dias: 4 por semana');
    expect(changeLabel({ gym_type: 'Home gym' })).toBe('Novo local: casa');
  });

  // A região da dor não aparece: o que a tela mostra é o que o plano faz.
  it('a dor não vira texto com a região', () => {
    expect(changeLabel({ injuries: ['Joelhos'] })).toBe('O plano evita a região da dor');
  });

  it('sem mudança, o motivo é o peso parado', () => {
    expect(changeLabel({})).toBe('Peso parado há 3 semanas');
  });
});
