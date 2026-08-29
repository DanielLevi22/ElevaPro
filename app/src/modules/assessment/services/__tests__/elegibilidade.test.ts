import { avisoDoPortao } from '../elegibilidade';

describe('o aviso que o portão mostra', () => {
  // O portão existe para o aluno descobrir na ENTRADA que falta algo, e não
  // depois de tirar três fotos. Isso só se paga se cada motivo levar a uma
  // ação: "responda a anamnese" e "corrija sua altura" são caminhos
  // diferentes, e um texto só para os dois manda responder de novo quem já
  // respondeu — que é a versão educada do "tente de novo" que abriu a issue.
  it.each([
    ['sem_anamnese', 'anamnese'],
    ['altura_invalida', 'altura'],
    ['peso_invalido', 'peso'],
  ] as const)('o aviso de %s fala em %s', (motivo, palavra) => {
    expect(avisoDoPortao(motivo).texto.toLowerCase()).toContain(palavra);
  });

  it('todo motivo leva a uma ação, nenhum é beco', () => {
    const motivos = ['consentimento', 'sem_anamnese', 'altura_invalida', 'peso_invalido'] as const;

    for (const motivo of motivos) {
      expect(avisoDoPortao(motivo).rotulo.length).toBeGreaterThan(0);
    }
  });

  // Consentimento é o único que se resolve na própria tela: o aluno autoriza e
  // segue. Os outros três exigem sair para a anamnese.
  it('só o consentimento se resolve sem sair da tela', () => {
    expect(avisoDoPortao('consentimento').destino).toBeNull();
    expect(avisoDoPortao('sem_anamnese').destino).not.toBeNull();
  });
});
