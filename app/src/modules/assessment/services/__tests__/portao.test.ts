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
    cobertura: 0.12,
    coroaY: 0.11,
    chaoY: 0.89,
    centroX: 0.5,
    viradoParaDireita: null,
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
    const { liberado, instrucao } = avaliarPortao(frameBom());

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
        'sem corpo',
        'sem-corpo',
        { visibilidadeMinima: 0.2, cobertura: 0, vistaDetectada: null, coroaY: null },
      ],
      [
        'perfil quando pediu frente',
        'vista-errada',
        { vistaDetectada: 'side' as const, coroaY: 0.4 },
      ],
      ['cabeça cortada', 'cabeca-cortada', { coroaY: 0 }],
      ['pés cortados', 'pes-cortados', { chaoY: 1 }],
      ['corpo à esquerda do quadro', 'va-para-esquerda', { centroX: 0.2 }],
      ['corpo à direita do quadro', 'va-para-direita', { centroX: 0.8 }],
      ['muito longe', 'aproxime-muito', { coroaY: 0.3, chaoY: 0.7 }],
      ['um pouco longe', 'aproxime', { coroaY: 0.2, chaoY: 0.82 }],
      ['perto demais', 'afaste', { coroaY: 0.02, chaoY: 0.97 }],
      ['fora de nível', 'nivel', { roll: 9 }],
    ])('com %s a instrução é %s', (_nome, esperado, piora) => {
      const { instrucao } = avaliarPortao(frameBom(piora as Partial<FatosDaCaptura>));

      expect(instrucao?.id).toBe(esperado);
    });

    it('com dois problemas juntos, fala só o mais grave', () => {
      const { instrucao } = avaliarPortao(
        frameBom({ visibilidadeMinima: 0.2, cobertura: 0, coroaY: null, roll: 9 })
      );

      expect(instrucao?.id).toBe('sem-corpo');
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
      const { liberado, avisos } = avaliarPortao(frameBom(piora as Partial<FatosDaCaptura>));

      expect(liberado).toBe(true);
      expect(avisos).toContain(aviso);
    });

    it('luz ruim não impede que a geometria trave', () => {
      const { liberado, instrucao, avisos } = avaliarPortao(
        frameBom({
          contrasteCorpoFundo: 0.35,
          visibilidadeMinima: 0.2,
          cobertura: 0,
          coroaY: null,
        })
      );

      expect(liberado).toBe(false);
      expect(instrucao?.id).toBe('sem-corpo');
      expect(avisos).toContain('contraluz');
    });
  });

  // A detecção sai da ordem dos ombros, não da visibilidade do rosto — por isso
  // travar frente contra costas voltou a ser honesto.
  describe('a vista trava nas três poses', () => {
    it('reprova quem fica de frente na pose de costas', () => {
      const errado = { vistaPedida: 'back' as const, vistaDetectada: 'front' as const };

      expect(avaliarPortao(frameBom(errado)).instrucao?.id).toBe('vista-errada');
    });

    it('libera quem fica de costas na pose de costas', () => {
      const certo = { vistaPedida: 'back' as const, vistaDetectada: 'back' as const };

      expect(avaliarPortao(frameBom(certo)).liberado).toBe(true);
    });

    it('reprova perfil quando pediu de frente', () => {
      const perfil = { vistaPedida: 'front' as const, vistaDetectada: 'side' as const };

      expect(avaliarPortao(frameBom(perfil)).instrucao?.id).toBe('vista-errada');
    });

    it('e reprova frontal quando pediu perfil', () => {
      const frontal = { vistaPedida: 'side' as const, vistaDetectada: 'front' as const };

      expect(avaliarPortao(frameBom(frontal)).instrucao?.id).toBe('vista-errada');
    });
  });

  // Em perfil metade dos landmarks se auto-oclui: a mesma visibilidade que na
  // frontal significa corpo cortado, na lateral significa lateral. Aplicar o
  // limiar da frontal aqui reprovaria foto boa para sempre.
  describe('a lateral tem portão relaxado', () => {
    const perfil = { vistaPedida: 'side' as const, vistaDetectada: 'side' as const };

    it('aceita a visibilidade que reprovaria uma frontal', () => {
      // Entre os dois limiares medidos em aparelho: acima do da lateral, abaixo
      // do da frontal. É o único valor que consegue afirmar a diferença.
      // Cobertura zerada de propósito: com corpo na máscara a visibilidade
      // deixa de decidir, e o teste não conseguiria afirmar a diferença.
      const baixa = { visibilidadeMinima: 0.25, cobertura: 0 };

      expect(avaliarPortao(frameBom({ ...perfil, ...baixa })).liberado).toBe(true);
      expect(avaliarPortao(frameBom(baixa)).liberado).toBe(false);
    });

    it('mas continua exigindo cabeça e pés no enquadramento', () => {
      const { liberado, instrucao } = avaliarPortao(
        frameBom({ ...perfil, coroaY: 0.3, chaoY: 0.7 })
      );

      expect(liberado).toBe(false);
      expect(instrucao?.id).toBe('aproxime-muito');
    });
  });

  // Quem está parado no lugar não pode perder a foto por estar parado: o corpo
  // em pé oscila, e sem histerese essa oscilação fecha o portão, mata a
  // contagem e faz o aviso repetir.
  describe('é mais difícil abrir do que continuar aberto', () => {
    // Logo fora da faixa: reprova na entrada, mas não derruba quem já entrou.
    const naBorda = { coroaY: 0.15, chaoY: 0.81 };

    it('reprova quem ainda não estava liberado', () => {
      expect(avaliarPortao(frameBom(naBorda), { estavaLiberado: false }).liberado).toBe(false);
    });

    it('mantém liberado quem já estava', () => {
      expect(avaliarPortao(frameBom(naBorda), { estavaLiberado: true }).liberado).toBe(true);
    });

    it('a folga não salva quem saiu de verdade', () => {
      expect(
        avaliarPortao(frameBom({ coroaY: 0.3, chaoY: 0.7 }), { estavaLiberado: true }).liberado
      ).toBe(false);
    });
  });

  // Tamanho certo não é lugar certo: com a altura correta mas deslocado para
  // cima, o corpo passava com a cabeça fora do retângulo desenhado.
  describe('o corpo precisa caber nas marcas, não só ter o tamanho delas', () => {
    it('acusa quem está alto demais no quadro', () => {
      const alto = { coroaY: 0.0, chaoY: 0.8 };

      expect(avaliarPortao(frameBom(alto)).instrucao?.id).toBe('cabeca-cortada');
    });

    it('acusa quem está deslocado para baixo', () => {
      const baixo = { coroaY: 0.19, chaoY: 0.97 };

      expect(avaliarPortao(frameBom(baixo)).instrucao?.id).toBe('baixe-o-celular');
    });

    it('libera quem está centrado nas marcas', () => {
      expect(avaliarPortao(frameBom({ coroaY: 0.11, chaoY: 0.89 })).liberado).toBe(true);
    });
  });

  // As três fotos precisam sair da mesma distância: escala igual entre elas é o
  // que faz a largura da frente e a da lateral descreverem o mesmo corpo, e não
  // dois pontos de vista diferentes.
  describe('a primeira foto vira a referência das outras', () => {
    // 0.78 de ocupação: dentro da faixa larga de entrada, longe da referência.
    const naFaixaMasLongeDaReferencia = { coroaY: 0.11, chaoY: 0.89 };

    it('sem referência, a faixa larga vale', () => {
      expect(avaliarPortao(frameBom(naFaixaMasLongeDaReferencia)).liberado).toBe(true);
    });

    it('com referência, exige voltar à mesma distância', () => {
      const comReferencia = avaliarPortao(frameBom(naFaixaMasLongeDaReferencia), {
        ocupacaoAlvo: 0.7,
      });

      expect(comReferencia.liberado).toBe(false);
      expect(comReferencia.instrucao?.id).toBe('afaste');
    });

    it('libera quem voltou à distância da primeira foto', () => {
      const mesmaDistancia = avaliarPortao(frameBom({ coroaY: 0.15, chaoY: 0.85 }), {
        ocupacaoAlvo: 0.7,
      });

      expect(mesmaDistancia.liberado).toBe(true);
    });

    it('devolve a ocupação para virar referência da próxima pose', () => {
      expect(avaliarPortao(frameBom({ coroaY: 0.15, chaoY: 0.85 })).ocupacao).toBeCloseTo(0.7, 2);
    });
  });

  // Olhar só o centro deixava o corpo transbordar pelas duas pontas com o
  // centro parado: pé abaixo da linha e portão verde. O aluno vê o retângulo e
  // conclui, com razão, que ele não vale nada.
  describe('o corpo cabe dentro das marcas, borda a borda', () => {
    it('reprova pé abaixo da linha de baixo, mesmo com o centro no lugar', () => {
      // Centro em 0.53, quase no das marcas — mas o pé passa de 0.9.
      const peFora = avaliarPortao(frameBom({ coroaY: 0.09, chaoY: 0.97 }));

      expect(peFora.liberado).toBe(false);
    });

    it('reprova cabeça acima da linha de cima', () => {
      const cabecaFora = avaliarPortao(frameBom({ coroaY: 0.02, chaoY: 0.8 }));

      expect(cabecaFora.liberado).toBe(false);
      expect(cabecaFora.instrucao?.id).toBe('suba-o-celular');
    });

    it('libera quem está inteiro entre as marcas', () => {
      expect(avaliarPortao(frameBom({ coroaY: 0.12, chaoY: 0.88 })).liberado).toBe(true);
    });
  });

  // Três estados e não dois porque a cor é o único canal que atravessa três
  // metros. "Quase" precisa ser distinguível de "longe" para o aluno saber se
  // ajusta ou se recomeça.
  describe('a proximidade separa ajuste de recomeço', () => {
    it.each([
      ['sem corpo', 'longe', { visibilidadeMinima: 0.2, cobertura: 0, coroaY: null }],
      ['vista errada', 'longe', { vistaDetectada: 'side' as const }],
      ['muito longe', 'longe', { coroaY: 0.3, chaoY: 0.7 }],
      ['um passo à frente', 'quase', { coroaY: 0.2, chaoY: 0.82 }],
      ['fora do centro', 'quase', { centroX: 0.2 }],
      ['fora de nível', 'quase', { roll: 9 }],
    ])('%s é %s', (_nome, esperado, piora) => {
      expect(avaliarPortao(frameBom(piora as Partial<FatosDaCaptura>)).proximidade).toBe(esperado);
    });

    it('no lugar certo é pronto', () => {
      expect(avaliarPortao(frameBom()).proximidade).toBe('pronto');
    });
  });

  // A mesma correção tem três nomes conforme a pose. Uma frase só acerta numa
  // e manda o aluno para o lugar errado nas outras duas — e nenhum teste de
  // "libera/não libera" pegaria, porque o portão fecha igual nos três casos.
  describe('a direção depende de para onde o aluno olha', () => {
    const foraDoCentro = { centroX: 0.2 };

    it('de frente, esquerda da imagem é a própria esquerda', () => {
      const frente = { vistaPedida: 'front' as const, vistaDetectada: 'front' as const };

      expect(avaliarPortao(frameBom({ ...frente, ...foraDoCentro })).instrucao?.id).toBe(
        'va-para-esquerda'
      );
    });

    it('de costas, o mesmo desvio inverte o lado', () => {
      const costas = { vistaPedida: 'back' as const, vistaDetectada: 'back' as const };

      expect(avaliarPortao(frameBom({ ...costas, ...foraDoCentro })).instrucao?.id).toBe(
        'va-para-direita'
      );
    });

    it('de perfil, não é lado nenhum: é frente ou trás', () => {
      const perfil = {
        vistaPedida: 'side' as const,
        vistaDetectada: 'side' as const,
        viradoParaDireita: true,
      };

      expect(avaliarPortao(frameBom({ ...perfil, ...foraDoCentro })).instrucao?.id).toBe(
        'passo-a-frente'
      );
    });

    it('de perfil sem saber para onde olha, cala em vez de chutar', () => {
      const perfil = {
        vistaPedida: 'side' as const,
        vistaDetectada: 'side' as const,
        viradoParaDireita: null,
      };

      expect(avaliarPortao(frameBom({ ...perfil, ...foraDoCentro })).liberado).toBe(true);
    });

    it('desvio pequeno não vira instrução', () => {
      expect(avaliarPortao(frameBom({ centroX: 0.6 })).liberado).toBe(true);
    });
  });

  // "À frente" só significa "aproxime-se" para quem olha para a câmera. De
  // costas ele afasta — foi o que apareceu no teste em aparelho.
  it('a distância é dita em relação à câmera, não ao corpo', () => {
    const longe = avaliarPortao(frameBom({ coroaY: 0.3, chaoY: 0.7 }));
    const perto = avaliarPortao(frameBom({ coroaY: 0.02, chaoY: 0.97 }));

    expect(longe.instrucao?.texto).toContain('câmera');
    expect(perto.instrucao?.texto).toContain('câmera');
  });

  // "Afaste-se" sem tamanho faz o aluno andar um passo de cada vez, medindo a
  // cada dois segundos. A razão entre alvo e ocupado já diz quanto.
  describe('a distância vem com tamanho', () => {
    it('separa um passo de vários', () => {
      const umPasso = avaliarPortao(frameBom({ coroaY: 0.2, chaoY: 0.82 }));
      const varios = avaliarPortao(frameBom({ coroaY: 0.35, chaoY: 0.65 }));

      expect(umPasso.instrucao?.id).toBe('aproxime');
      expect(varios.instrucao?.id).toBe('aproxime-muito');
    });

    it('toda instrução de distância diz para que lado andar', () => {
      const frente = avaliarPortao(frameBom({ coroaY: 0.2, chaoY: 0.82 }));
      const tras = avaliarPortao(frameBom({ coroaY: 0.02, chaoY: 0.97 }));

      expect(frente.instrucao?.texto).toContain('Aproxime-se');
      expect(tras.instrucao?.texto).toContain('Afaste-se');
    });
  });

  // Sem sensor, pitch e roll não valem nada — travar por eles seria barrar o
  // aluno por um número que o aparelho não sabe medir.
  it('sem sensor de nível, não trava por inclinação', () => {
    const semSensor = { nivelDisponivel: false, pitch: 40, roll: 40 };

    expect(avaliarPortao(frameBom(semSensor)).liberado).toBe(true);
  });

  // A voz é o canal de quem está a três metros da tela. Repetir a mesma frase a
  // cada dois segundos vira ruído, e ruído ensina o aluno a ignorar.
  describe('a voz só fala quando tem o que dizer de novo', () => {
    it('cala quando a instrução não mudou', () => {
      const fatos = frameBom({ roll: 9 });

      expect(avaliarPortao(fatos).deveFalar).toBe(true);
      expect(avaliarPortao(fatos, { ultimaFalada: 'nivel' }).deveFalar).toBe(false);
    });

    // Silêncio significa "está certo". Sem este limite, quem ficasse preso no
    // mesmo problema ouviria o mesmo silêncio e esperaria uma foto que não vem.
    it('volta a falar quando o problema persiste', () => {
      const preso = avaliarPortao(frameBom({ roll: 9 }), {
        ultimaFalada: 'nivel',
        msDesdeAFala: 9000,
      });

      expect(preso.deveFalar).toBe(true);
    });

    it('fala de novo quando a instrução muda', () => {
      const { deveFalar } = avaliarPortao(frameBom({ coroaY: 0.3, chaoY: 0.7 }), {
        ultimaFalada: 'nivel',
      });

      expect(deveFalar).toBe(true);
    });

    it('não fala nada quando está tudo certo', () => {
      expect(avaliarPortao(frameBom(), { ultimaFalada: 'nivel' }).deveFalar).toBe(false);
    });
  });

  // O texto sai daqui porque quem escolhe a instrução é quem sabe o que ela
  // significa. Uma instrução sem frase é uma tela muda e uma voz calada.
  it('toda instrução carrega o que dizer', () => {
    const piores: Partial<FatosDaCaptura>[] = [
      { visibilidadeMinima: 0.2, cobertura: 0, coroaY: null },
      { vistaDetectada: 'side' },
      { coroaY: 0 },
      { chaoY: 1 },
      { centroX: 0.2 },
      { coroaY: 0.3, chaoY: 0.7 },
      { coroaY: 0.02, chaoY: 0.97 },
      { roll: 9 },
    ];

    for (const piora of piores) {
      expect(avaliarPortao(frameBom(piora)).instrucao?.texto.length).toBeGreaterThan(0);
    }
  });
});

/**
 * A folga da histerese e a contagem regressiva existem para coisas opostas: a
 * primeira evita que o portão pisque enquanto o aluno se acomoda; a segunda é a
 * promessa de que ele vai ficar parado. Somadas, a tolerância ficava 50% mais
 * larga justo no momento em que devia estar mais estreita — o aluno saía de
 * posição durante os cinco segundos e a foto saía assim mesmo.
 */
describe('a contagem regressiva tira a folga da histerese', () => {
  /** Fora do enquadramento por mais que a tolerância normal, e menos que 1.5x. */
  const saiuDePosicao = frameBom({ coroaY: 0.02, chaoY: 0.82 });

  it('mantém aberto para quem só oscilou, fora da contagem', () => {
    const portao = avaliarPortao(saiuDePosicao, { estavaLiberado: true });

    expect(portao.liberado).toBe(true);
  });

  it('fecha para o mesmo desvio quando a contagem está rodando', () => {
    const portao = avaliarPortao(saiuDePosicao, { estavaLiberado: true, contando: true });

    expect(portao.liberado).toBe(false);
    expect(portao.instrucao).not.toBeNull();
  });

  it('não estorva quem continua encaixado durante a contagem', () => {
    const portao = avaliarPortao(frameBom(), { estavaLiberado: true, contando: true });

    expect(portao.liberado).toBe(true);
  });
});
