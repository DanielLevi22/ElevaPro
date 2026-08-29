# Cada variável mora onde é lida, e credencial não atravessa ambiente

A IA do preview ficou fora do ar por dias porque `ANTHROPIC_API_KEY` estava numa loja
de *build* e era lida em *runtime*. O repo classificava variável por **quão secreta
ela é**; o que decide é **onde ela é lida**. Passamos a classificar pelo momento da
leitura, e a exigir credencial própria por ambiente.

## As três lojas

| Onde vive | Lido quando | O que pertence ali |
|---|---|---|
| **GitHub Secrets** | durante o job de CI | só o que o job usa: `VERCEL_TOKEN`, `EXPO_TOKEN`, `SUPABASE_DB_URL`, e os `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*` que o build inlina |
| **Vercel Project Env**, por ambiente | a cada request na função | `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` |
| **EAS Environment** | durante o build do bundle | só `EXPO_PUBLIC_*` — tudo ali é **publicado** |

O `vercel deploy --prebuilt` sobe o output já compilado. A função lê `process.env` das
Environment Variables do projeto, escopadas por ambiente — o shell do runner do GitHub
não atravessa. Passar segredo de servidor no passo `vercel build` é **no-op que parece
resolver**, e o comentário que acompanhava a linha convencia o leitor de que o problema
estava tratado.

`NEXT_PUBLIC_*` funciona por outro caminho: é inlinada no bundle em tempo de build. Foi
por isso que `authorizeStudent` validou o token na mesma requisição em que a Anthropic
falhou — meia aplicação de pé, e a metade que caiu era muda.

## As regras

1. **A variável mora onde é lida.** Runtime do servidor → Vercel, por ambiente. GitHub
   Secrets guarda só o que o próprio job consome.
2. **Credencial por ambiente, sem exceção.** Preview comprometido não pode dar acesso a
   produção.
3. **O que entra em bundle é público, e isso é escolha.** `EXPO_PUBLIC_*` sai do APK com
   um `unzip`. A anon key ali é correta — foi desenhada para isso, e a RLS é o controle.
   O bypass da Vercel é exceção deliberada. Nunca entram: service role,
   `ANTHROPIC_API_KEY`, `DATABASE_URL`.
4. **Falhar alto, no limite.** Segredo ausente derruba na entrada da rota com JSON
   tipado, nunca 500 em HTML três camadas abaixo da causa.

## Por que a assimetria de hoje é o risco maior

`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são segregadas por ambiente
(`_PREVIEW` / `_PROD`). `SUPABASE_SERVICE_ROLE_KEY` é **uma só**, usada nos dois builds.

Segregamos a credencial pública por desenho e compartilhamos a que **ignora a RLS
inteira** — com ela se lê anamnese, avaliação física e histórico de treino de todos os
alunos, sem política nenhuma no caminho. A prioridade está invertida.

E há uma consequência lógica a verificar: a service role é um JWT assinado pelo segredo
*daquele* projeto Supabase. Com URLs separadas por ambiente, uma única chave não pode ser
válida nos dois. Ou os ambientes compartilham projeto — contra o [ADR-0003](0003-environment-strategy.md) —
ou um deles está com `supabaseAdmin` quebrado agora, em silêncio, porque o erro de
consulta é descartado.

## Consequências

- `web/src/lib/server-env.ts` declara os segredos de servidor **com a consequência de
  cada ausência**, e `rotaDeIA` (`web/src/lib/ai-route.ts`) checa antes do handler. A
  resposta distingue `server_misconfigured` de `ai_unavailable`: a primeira é do time,
  a segunda é tentar de novo.
- As seis rotas de IA que não tinham `try/catch` passaram a devolver JSON tipado. Um
  invólucro, não seis cópias — cópia do tratamento foi como o ponto cego ficou uniforme
  da primeira vez.
- O `release-web.yml` deixou de passar segredo de servidor no build, e ganhou **smoke
  test pós-deploy**: uma chamada sem token deve responder `401`. Isso prova de uma vez
  que o deployment está no ar, que o bypass funciona e que o ambiente está completo —
  porque faltando variável a resposta seria `503 server_misconfigured` antes do 401.
- A guarda **não** valida se a chave é aceita pelo provedor. Chave revogada passa; só o
  smoke test, que faz chamada real, alcançaria isso — e ele para no 401 de propósito,
  para não exigir usuário de teste com dado de saúde real só para medir configuração.
- **Fica pendente**, porque exige acesso ao painel: segregar
  `SUPABASE_SERVICE_ROLE_KEY` em `_PREVIEW` / `_PROD`, depois de confirmar por
  `vercel env ls` a qual projeto a atual pertence.

## O que este ADR não decide

Rotação de segredo. Hoje não há periodicidade nem procedimento — e o bypass da Vercel,
por ser inlinado no bundle, só rotaciona com build novo. Vale decidir quando houver um
segundo mantenedor; com um só, o custo do processo supera o risco que ele reduz.
