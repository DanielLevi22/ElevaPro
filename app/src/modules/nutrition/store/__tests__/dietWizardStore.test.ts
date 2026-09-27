import { useDietWizardStore } from '../dietWizardStore';

const store = () => useDietWizardStore.getState();

describe('dietWizardStore', () => {
  beforeEach(() => store().startFor({ studentId: 'aluno-1', studentName: 'Ana', ownPlan: false }));

  it('começa pela estratégia padrão, sem nome e sem plano criado', () => {
    expect(store()).toMatchObject({ strategy: 'standard', planName: '', planId: null });
  });

  // O tipo de plano sai da estratégia, a mesma regra do web.
  it('o ciclo de carboidrato gera plano cíclico; as outras, único', () => {
    store().setStrategy('carb_cycling');
    expect(store().planType()).toBe('cyclic');
    store().setStrategy('ketogenic');
    expect(store().planType()).toBe('unique');
  });

  it('a soma de proteína, carbo e gordura fecha sempre 100%', () => {
    store().setMacroPercent('protein', 35);
    store().setMacroPercent('fat', 30);

    const { protein, carbs, fat } = store().macroPercent;
    expect(protein + carbs + fat).toBe(100);
    expect(carbs).toBe(35);
  });

  it('não deixa o carbo negativo quando proteína e gordura passam de 100%', () => {
    store().setMacroPercent('protein', 70);
    store().setMacroPercent('fat', 50);

    const { protein, carbs, fat } = store().macroPercent;
    expect(carbs).toBe(0);
    expect(protein + fat).toBe(100);
  });

  it('converte a divisão em gramas pela meta do dia', () => {
    store().setTargetCalories(2000);
    store().setMacroPercent('protein', 30);
    store().setMacroPercent('fat', 30);

    expect(store().macroGrams()).toEqual({ protein: 150, carbs: 200, fat: 67 });
  });

  it('aplicar a sugestão traz a meta e a divisão em percentual', () => {
    store().applySuggestion({
      targetCalories: 2000,
      macros: { protein: 150, carbs: 200, fat: 67 },
    });

    expect(store().targetCalories).toBe(2000);
    expect(store().macroPercent).toEqual({ protein: 30, carbs: 40, fat: 30 });
  });

  it('retomar as metas não sobrescreve os ajustes com a sugestão automática', () => {
    const suggestion = { targetCalories: 2000, macros: { protein: 150, carbs: 200, fat: 67 } };
    store().initializeGoals('aluno-1', suggestion, ['lactose_free']);
    store().setTargetCalories(2300);
    store().setPreferences({ ...store().preferences, dietary_restrictions: ['vegan'] });

    store().initializeGoals('aluno-1', suggestion, ['lactose_free']);

    expect(store().targetCalories).toBe(2300);
    expect(store().preferences.dietary_restrictions).toEqual(['vegan']);
  });

  it('a sugestão atrasada preserva a meta digitada e ainda preenche as restrições', () => {
    store().setTargetCalories(2300);
    store().initializeGoals(
      'aluno-1',
      {
        targetCalories: 1800,
        macros: { protein: 135, carbs: 180, fat: 60 },
      },
      ['lactose_free']
    );

    expect(store().targetCalories).toBe(2300);
    expect(store().preferences.dietary_restrictions).toEqual(['lactose_free']);
  });

  it('ignora a sugestão que chegou depois de trocar de aluno', () => {
    store().startFor({ studentId: 'aluno-2', studentName: 'Bia', ownPlan: false });
    store().initializeGoals(
      'aluno-1',
      {
        targetCalories: 1800,
        macros: { protein: 135, carbs: 180, fat: 60 },
      },
      ['lactose_free']
    );

    expect(store().targetCalories).toBe(2000);
    expect(store().preferences.dietary_restrictions).toEqual([]);
    expect(store().goalsInitialized).toBe(false);
  });

  it('a resposta automática não remove preferências já escolhidas', () => {
    store().setPreferences({ ...store().preferences, dietary_restrictions: ['vegan'] });
    store().initializeGoals('aluno-1', null, ['lactose_free']);

    expect(store().preferences.dietary_restrictions).toEqual(['vegan']);
  });

  // Trocar de aluno no meio não pode levar o rascunho de um para o outro.
  it('começar para outro aluno descarta o que estava preenchido', () => {
    store().setPlanName('Cutting');
    store().setCreatedPlan('plano-1');

    store().startFor({ studentId: 'aluno-2', studentName: 'Bia', ownPlan: false });

    expect(store()).toMatchObject({ studentId: 'aluno-2', planName: '', planId: null });
  });
});

describe('dietWizardStore — vigência', () => {
  it('começa em quatro semanas e nunca fica abaixo de uma', () => {
    store().startFor({ studentId: 'aluno-1', studentName: 'Ana', ownPlan: false });
    expect(store().durationWeeks).toBe(4);

    store().setDurationWeeks(0);
    expect(store().durationWeeks).toBe(1);
  });
});
