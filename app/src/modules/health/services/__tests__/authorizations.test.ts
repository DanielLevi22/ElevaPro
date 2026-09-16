import { type ConsentStatus, RANKING, SAUDE, TECNICA } from '@elevapro/shared';
import { AUTHORIZATIONS, authorizationFooter, revokeEffects } from '../authorizations';

const health = AUTHORIZATIONS[0];
const technique = AUTHORIZATIONS[1];
const ranking = AUTHORIZATIONS[2];

function status(state: ConsentStatus['state'], policyVersion = '1.7'): ConsentStatus {
  return { state, givenAt: '2026-08-28T10:00:00Z', policyVersion };
}

describe('autorizações', () => {
  it('lista as três finalidades, separadas e na ordem da tela', () => {
    expect(AUTHORIZATIONS.map((item) => item.purpose.tipo)).toEqual([
      SAUDE.tipo,
      TECNICA.tipo,
      RANKING.tipo,
    ]);
  });

  // O ranking pede na própria aba, como a técnica; aqui só se sai dele.
  it('o ranking sem aceite diz onde pede, e o aceite oferece sair', () => {
    expect(authorizationFooter(ranking, status('missing')).action).toBeNull();
    expect(authorizationFooter(ranking, status('granted', '1.0')).action).toBe('revoke');
    expect(revokeEffects(ranking, true).map((effect) => effect.text)).toContain(
      'Seu nome sai do placar na hora'
    );
  });

  it('o aceite vigente diz a data e a versão, e só ele oferece a retirada', () => {
    expect(authorizationFooter(health, status('granted'))).toEqual({
      text: '28 ago 2026 · versão 1.7',
      action: 'revoke',
    });
    for (const state of ['outdated', 'revoked', 'missing'] as const) {
      expect(authorizationFooter(health, status(state)).action).not.toBe('revoke');
      expect(authorizationFooter(technique, status(state)).action).not.toBe('revoke');
    }
  });

  // A folha de retirar promete que autorizar de novo "leva um toque": na saúde o
  // toque fica no cartão; a técnica pede na tela da câmera, e o texto diz isso.
  it('a saúde sem aceite oferece autorizar ali; a técnica diz onde pede', () => {
    expect(authorizationFooter(health, status('revoked'))).toEqual({
      text: 'Retirada.',
      action: 'authorize',
    });
    const techniqueFooter = authorizationFooter(technique, status('missing'));
    expect(techniqueFooter.action).toBeNull();
    expect(techniqueFooter.text).toContain('pede quando você abrir a tela');
  });

  // O aceite de uma versão anterior não autoriza nada (`hasCollectionConsent` é
  // falso), e dizer "autorizado" a quem está nele esconderia que o app parou.
  it('o aceite de versão anterior diz que a política mudou', () => {
    const footer = authorizationFooter(health, status('outdated', '1.6'));
    expect(footer.text).toContain('versão 1.6');
    expect(footer.text).toContain('A política mudou');
    expect(footer.action).toBe('authorize');
  });

  /**
   * TRAVA — a folha de retirar diz o que de fato para.
   *
   * O kit escrevia "Treinos e refeições deixam de ser registrados", e não deixam:
   * treino e refeição não consultam o aceite. Quem retira decide pelo que perde; um
   * efeito inventado torna a decisão desinformada (Art. 9°). A prova negativa: com
   * a frase do kit de volta, este teste falha.
   */
  it('retirar a saúde não promete parar treinos e refeições', () => {
    const effects = revokeEffects(health, true).map((effect) => effect.text);
    const promised = effects.filter((text) => /treinos e refeições deixam/i.test(text));
    if (promised.length > 0) {
      throw new Error(
        `EFEITO INVENTADO NA RETIRADA: "${promised[0]}" — treino e refeição continuam registrados sem o aceite`
      );
    }
    expect(effects.some((text) => /treinos e as refeições continuam/i.test(text))).toBe(true);
  });

  // A medida declarada consulta o aceite no banco (0056): quem retira precisa saber
  // que o registro de medida para junto com a água e as anotações.
  it('retirar a saúde diz que as medidas deixam de ser guardadas', () => {
    const effects = revokeEffects(health, false).map((effect) => effect.text);
    expect(effects.some((text) => /medidas/i.test(text))).toBe(true);
  });

  it('só o Aluno lê que o especialista perde o acesso', () => {
    const withSpecialist = revokeEffects(health, true).map((effect) => effect.text);
    const selfGuided = revokeEffects(health, false).map((effect) => effect.text);
    expect(withSpecialist.some((text) => text.includes('especialista'))).toBe(true);
    expect(selfGuided.some((text) => text.includes('especialista'))).toBe(false);
  });

  it('retirar a técnica fala da câmera, e não do relógio', () => {
    const effects = revokeEffects(technique, true).map((effect) => effect.text);
    expect(effects.some((text) => text.includes('câmera'))).toBe(true);
    expect(effects.some((text) => text.includes('relógio'))).toBe(false);
  });
});
