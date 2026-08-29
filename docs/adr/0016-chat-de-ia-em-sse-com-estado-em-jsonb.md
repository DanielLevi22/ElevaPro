# O chat de IA transmite por SSE e guarda o estado da sessão em JSONB

SSE em vez de WebSocket porque a conversa é unidirecional durante a resposta: não há
estado no servidor, o cliente reconecta sozinho ao mandar a próxima mensagem, e cada
requisição é depurável isolada. O estado da sessão vai numa coluna `jsonb` em
`ai_chat_sessions.state`, e não no histórico de mensagens, porque o histórico é
cortado quando cresce — com o estado fora dele, o modelo nunca perde o estágio atual
nem a lista do que já foi salvo, por mais longa que a conversa fique.

## Consequências

- O orquestrador continua stateless e testável: a persistência mora no route handler,
  que é quem tem o `sessionId` e o controller do SSE, alcançada por callback.
- `getSessionState` espalha o estado em vez de montar campo a campo. A versão com
  lista branca de chaves descartava em silêncio qualquer chave nova — a proposta de
  dieta era gravada e sumia na leitura seguinte.
- Prompt caching marca o system prompt e o contexto do aluno; o estado da sessão
  nunca, porque muda a cada requisição.
