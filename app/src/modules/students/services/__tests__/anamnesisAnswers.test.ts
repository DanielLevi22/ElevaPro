import type { AnamnesisSection } from '@elevapro/shared/data/anamnesisQuestions';
import { answeredSections, answerLabel } from '../anamnesisAnswers';

const SECTIONS: AnamnesisSection[] = [
  {
    id: 'sport',
    title: 'Esporte',
    questions: [
      { id: 'trains_sport', text: 'Pratica esporte?', type: 'boolean' },
      {
        id: 'which_sport',
        text: 'Qual?',
        type: 'text',
        condition: { questionId: 'trains_sport', expectedValue: true },
      },
      { id: 'injuries', text: 'Lesões', type: 'multiple_choice' },
    ],
  },
];

describe('answeredSections', () => {
  it('esconde a pergunta condicional que não foi feita ao aluno', () => {
    const [section] = answeredSections(SECTIONS, { trains_sport: false });

    expect(section.questions.map((q) => q.id)).toEqual(['trains_sport', 'injuries']);
  });

  it('mostra a condicional quando a condição bate, com a resposta em texto', () => {
    const [section] = answeredSections(SECTIONS, {
      trains_sport: true,
      which_sport: 'Futebol',
      injuries: ['Joelho', 'Ombro'],
    });

    expect(section.questions.map((q) => q.answer)).toEqual(['Sim', 'Futebol', 'Joelho, Ombro']);
  });
});

describe('answerLabel', () => {
  it.each([undefined, null, '', []])('trata %p como não respondido', (value) => {
    expect(answerLabel(value)).toBeNull();
  });

  it('escreve número como texto', () => {
    expect(answerLabel(175)).toBe('175');
  });
});
