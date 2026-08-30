import { avaliarPortao, type FatosDaCaptura } from '../portao';

/**
 * Fatos de um frame perfeito. Cada teste piora UM campo, para o que falha ser
 * sempre o campo do teste e não o cenário inteiro.
 */
function frameBom(sobrescreve: Partial<FatosDaCaptura> = {}): FatosDaCaptura {
  return {
    vistaPedida: 'front',
    vistaDetectada: 'front',
    visibilidadeMinima: 0.9,
    coroaY: 0.11,
    chaoY: 0.89,
    pitch: 0.5,
    roll: 0.5,
    nivelDisponivel: true,
    lumaMedia: 0.5,
    contrasteCorpoFundo: 1.1,
    ...sobrescreve,
  };
}

describe('o portão de captura', () => {
  it('libera o disparo quando tudo está no lugar', () => {
    const { liberado, instrucao } = avaliarPortao(frameBom(), null);

    expect(liberado).toBe(true);
    expect(instrucao).toBeNull();
  });

  // A ordem da cascata não é estética: vai da checagem que invalida a foto
  // inteira para a que apenas degrada. Corpo cortado não tem o que medir;
  // aparelho torto ainda mede, só pior. Reportar o nível primeiro mandaria o
  // aluno endireitar o celular para continuar cortado.
  describe('a cascata reporta a falha mais grave primeiro', () => {
    it.each([
      [
        'corpo cortado',
        'corpo-cortado',
        { visibilidadeMinima: 0.2, vistaDetectada: null, coroaY: null },
      ],
      ['vista errada', 'vista-errada', { vistaDetectada: 'side' as const, coroaY: 0.4 }],
      ['longe demais', 'aproxime', { coroaY: 0.3, chaoY: 0.7 }],
      ['perto demais', 'afaste', { coroaY: 0.02, chaoY: 0.98 }],
      ['fora de nível', 'nivel', { pitch: 9 }],
    ])('com %s a instrução é %s', (_nome, esperado, piora) => {
      const { instrucao } = avaliarPortao(frameBom(piora as Partial<FatosDaCaptura>), null);

      expect(instrucao?.id).toBe(esperado);
    });

    it('com dois problemas juntos, fala só o mais grave', () => {
      const { instrucao } = avaliarPortao(
        frameBom({ visibilidadeMinima: 0.2, coroaY: null, pitch: 9 }),
        null
      );

      expect(instrucao?.id).toBe('corpo-cortado');
    });
  });

  // Geometria trava porque é barata de corrigir e mata a medida. Luz não trava:
  // o aluno às dez da noite pode não ter como resolver o contraluz, e scan
  // marcado vale mais que scan que não aconteceu. O precedente é o
  // `framing_level_sensor`, que já significa "este sinal não conta".
  describe('luz avisa, nunca bloqueia', () => {
    it.each([
      ['contraluz', 'contraluz', { contrasteCorpoFundo: 0.35 }],
      ['escuro demais', 'luz-fraca', { lumaMedia: 0.04 }],
      ['estourado', 'luz-estourada', { lumaMedia: 0.98 }],
    ])('%s libera o disparo e registra o aviso %s', (_nome, aviso, piora) => {
      const { liberado, avisos } = avaliarPortao(frameBom(piora as Partial<FatosDaCaptura>), null);

      expect(liberado).toBe(true);
      expect(avisos).toContain(aviso);
    });

    it('luz ruim não impede que a geometria trave', () => {
      const { liberado, instrucao, avisos } = avaliarPortao(
        frameBom({ contrasteCorpoFundo: 0.35, visibilidadeMinima: 0.2, coroaY: null }),
        null
      );

      expect(liberado).toBe(false);
      expect(instrucao?.id).toBe('corpo-cortado');
      expect(avisos).toContain('contraluz');
    });
  });

  // Em perfil metade dos landmarks se auto-oclui: a mesma visibilidade que na
  // frontal significa corpo cortado, na lateral significa lateral. Aplicar o
  // limiar da frontal aqui reprovaria foto boa para sempre.
  describe('a lateral tem portão relaxado', () => {
    const perfil = { vistaPedida: 'side' as const, vistaDetectada: 'side' as const };

    it('aceita a visibilidade que reprovaria uma frontal', () => {
      const baixa = { visibilidadeMinima: 0.45 };

      expect(avaliarPortao(frameBom({ ...perfil, ...baixa }), null).liberado).toBe(true);
      expect(avaliarPortao(frameBom(baixa), null).liberado).toBe(false);
    });

    it('mas continua exigindo cabeça e pés no enquadramento', () => {
      const { liberado, instrucao } = avaliarPortao(
        frameBom({ ...perfil, coroaY: 0.3, chaoY: 0.7 }),
        null
      );

      expect(liberado).toBe(false);
      expect(instrucao?.id).toBe('aproxime');
    });
  });

  // Sem sensor, pitch e roll não valem nada — travar por eles seria barrar o
  // aluno por um número que o aparelho não sabe medir.
  it('sem sensor de nível, não trava por inclinação', () => {
    const semSensor = { nivelDisponivel: false, pitch: 40, roll: 40 };

    expect(avaliarPortao(frameBom(semSensor), null).liberado).toBe(true);
  });

  // A voz é o canal de quem está a três metros da tela. Repetir a mesma frase a
  // cada dois segundos vira ruído, e ruído ensina o aluno a ignorar.
  describe('a voz só fala quando tem o que dizer de novo', () => {
    it('cala quando a instrução não mudou', () => {
      const fatos = frameBom({ pitch: 9 });

      expect(avaliarPortao(fatos, null).deveFalar).toBe(true);
      expect(avaliarPortao(fatos, 'nivel').deveFalar).toBe(false);
    });

    it('fala de novo quando a instrução muda', () => {
      const { deveFalar } = avaliarPortao(frameBom({ coroaY: 0.3, chaoY: 0.7 }), 'nivel');

      expect(deveFalar).toBe(true);
    });

    it('não fala nada quando está tudo certo', () => {
      expect(avaliarPortao(frameBom(), 'nivel').deveFalar).toBe(false);
    });
  });

  // O texto sai daqui porque quem escolhe a instrução é quem sabe o que ela
  // significa. Uma instrução sem frase é uma tela muda e uma voz calada.
  it('toda instrução carrega o que dizer', () => {
    const piores: Partial<FatosDaCaptura>[] = [
      { visibilidadeMinima: 0.2, coroaY: null },
      { vistaDetectada: 'side' },
      { coroaY: 0.3, chaoY: 0.7 },
      { coroaY: 0.02, chaoY: 0.98 },
      { pitch: 9 },
    ];

    for (const piora of piores) {
      expect(avaliarPortao(frameBom(piora), null).instrucao?.texto.length).toBeGreaterThan(0);
    }
  });
});
