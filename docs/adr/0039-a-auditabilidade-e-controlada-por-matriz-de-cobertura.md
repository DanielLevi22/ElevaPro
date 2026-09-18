# A auditabilidade é controlada por uma matriz de cobertura

Uma lista de controles não prova que o Eleva Pro inteiro foi revisado. O sistema passa a
ter uma matriz de cobertura versionada: toda superfície que recebe, guarda, transforma ou
administra dados possui um identificador, fronteira, evidência, estado e próximo teste.
Uma superfície ausente da matriz é uma lacuna; uma linha sem evidência é **não verificada**,
nunca "segura por padrão".

**Status:** accepted. A matriz viva está em
[`docs/security/coverage-matrix.md`](../security/coverage-matrix.md); o inventário técnico
de origem está em `docs/research/security-surface-coverage-map.md`.

## Por que a matriz, e não uma ADR maior

O Eleva Pro tem dois clientes, BFF com 27 rotas, banco exposto por PostgREST, migrations,
pipelines e operadores externos. Um ADR explica a regra durável; ele não é bom para manter
arquivo, endpoint, teste e evidência de cada superfície. Espalhar a checagem por issues
isoladas perde justamente as partes que não recebem feature nova, como CI, Storage, logs,
backup e contas de plataforma.

## Regra de encerramento

Uma rodada de auditoria só termina quando cada ID da matriz estiver `verificado`,
`risco-aceito` com dono/prazo ou `fora-de-escopo` com evidência. `não verificado` e
`desconhecido` mantêm a rodada aberta. Uma mudança que cria nova fronteira adiciona seu ID
na mesma PR; não espera a próxima auditoria.

## Consequências

- Evidência é reexecutável: caminho de código, teste, configuração ou comando; captura de
  tela sozinha não basta.
- Achado produz issue com severidade, dono, data de revisão, correção e teste de regressão.
  A issue descreve a mudança; a matriz só conserva o estado e a evidência.
- A matriz não armazena segredos, dados pessoais ou payloads. IDs de recursos e links para
  configuração ficam opacos quando a visibilidade do repositório exigir.
- A conclusão pública será precisa: "auditável para as superfícies verificadas na rodada
  N", e nunca uma promessa absoluta de segurança.
