# Segurança é uma propriedade verificada no pipeline

Segurança não depende de revisão manual lembrar todos os controles. O Eleva Pro mantém uma linha de base versionada, testes negativos de autorização e verificações de release; uma mudança que amplia acesso, coleta, segredo ou superfície de API prova no pipeline que continua dentro dessa linha.

**Status:** accepted. A linha de base completa e as lacunas a transformar em issues estão em [`docs/research/security-and-auditability-baseline.md`](../research/security-and-auditability-baseline.md).

## Decisão

O conjunto mínimo inclui: identidade forte e sessão protegida; autorização no CASL e RLS; segredos segregados por ambiente; validação de entrada e saída no BFF; proteção contra abuso nas rotas expostas; dependências e imagens atualizadas; backups restauráveis; monitoramento de erro sem dado pessoal; resposta a incidente ensaiada; e evidência reproduzível das mudanças de schema, política e deploy.

Cada feature que tocar dado pessoal, autenticação, autorização, API, Storage, pagamento, integração ou IA passa por uma revisão de ameaça proporcional. Dados de saúde continuam sob o portão LGPD antes de qualquer mudança de schema ou fluxo.

## Consequências

- O pipeline falha em regressão de RLS, rota sem autenticação, referência a segredo no cliente e log proibido conhecido; novos detectores entram ao lado da falha que evitam.
- Segurança de dependência e configuração é monitorada continuamente, mas uma descoberta não vira correção silenciosa em produção: recebe severidade, responsável, prazo e evidência de resolução.
- Não existe alegação de "sistema auditável" sem evidência de restauração, de teste de isolamento entre contas, de revisão de acesso privilegiado e de investigação de evento.
