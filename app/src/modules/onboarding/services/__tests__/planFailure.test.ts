import { BffHttpError, BffUnreachableError } from '@/shared/bff';
import { classifyPlanFailure } from '../planFailure';

describe('classifyPlanFailure — cada falha do O8 com a sua saída', () => {
  it('servidor inalcançável é falta de conexão', () => {
    expect(classifyPlanFailure(new BffUnreachableError('x', 'sem rede'))).toBe('rede');
  });

  it('plano recusado pela conferência é tentar de novo', () => {
    expect(classifyPlanFailure(new BffHttpError('/api', 502, 'plan_rejected'))).toBe('plano');
  });

  it('sem aceite de saúde leva ao aceite, e não a "sem conexão"', () => {
    expect(classifyPlanFailure(new BffHttpError('/api', 403, 'consent_required'))).toBe('aceite');
  });

  it('respostas incompletas levam de volta às perguntas', () => {
    expect(classifyPlanFailure(new BffHttpError('/api', 409, 'incomplete_answers'))).toBe(
      'respostas'
    );
  });

  it('o resto é erro do servidor, e não da conexão da pessoa', () => {
    expect(classifyPlanFailure(new BffHttpError('/api', 500))).toBe('servidor');
    expect(classifyPlanFailure(new Error('qualquer'))).toBe('servidor');
  });
});
