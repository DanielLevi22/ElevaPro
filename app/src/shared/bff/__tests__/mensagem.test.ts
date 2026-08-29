import { BffConfigError, BffHttpError, BffNotJsonError, BffUnreachableError } from '../client';
import { mensagemDeErroBff } from '../mensagem';

describe('mensagemDeErroBff', () => {
  // O ponto do helper inteiro: a causa que o `client.ts` nomeou tem que
  // sobreviver até a tela. Prova negativa — se alguém trocar isto por uma
  // frase fixa, estes três testes falham dizendo o que se perdeu.
  it('preserva a causa quando falta a variável de configuração', () => {
    expect(mensagemDeErroBff(new BffConfigError())).toContain('EXPO_PUBLIC_API_URL');
  });

  it('preserva o host e o motivo quando o BFF não responde', () => {
    const erro = new BffUnreachableError('elevapro-preview.vercel.app', 'não respondeu em 60s');

    const mensagem = mensagemDeErroBff(erro);

    expect(mensagem).toContain('elevapro-preview.vercel.app');
    expect(mensagem).toContain('não respondeu em 60s');
  });

  it('preserva o diagnóstico quando quem respondeu não foi a aplicação', () => {
    const erro = new BffNotJsonError('elevapro-preview.vercel.app', 'text/html', 200);

    expect(mensagemDeErroBff(erro)).toContain('proteção de plataforma');
  });

  // Falta de consentimento é situação do produto, não falha de transporte: o
  // aluno precisa saber o que fazer, e "a IA recusou (consent_required)" não
  // diz nada a ele.
  it('traduz a falta de consentimento em algo acionável pelo aluno', () => {
    const erro = new BffHttpError('/api/ai/student/nutribot', 403, 'consent_required');

    expect(mensagemDeErroBff(erro)).toContain('consentimento');
  });

  it('nomeia o código quando a rota recusou por outro motivo', () => {
    const erro = new BffHttpError('/api/x', 503, 'ai_unavailable');

    expect(mensagemDeErroBff(erro)).toContain('ai_unavailable');
  });

  it('cai na frase genérica só quando nem Error era', () => {
    expect(mensagemDeErroBff('string solta')).toContain('Tente de novo');
    expect(mensagemDeErroBff(null)).toContain('Tente de novo');
  });
});
