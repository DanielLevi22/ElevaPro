# As versões do app seguem o SDK do Expo, não o Dependabot

O React, o React Native, o Jest e as libs nativas do app mudam de versão só
quando o SDK do Expo muda, e pelas versões que o SDK fixa
(`npx expo install expo@^N --fix` e `npx expo-doctor`). O Dependabot do `/app`
deixa passar só patch nesses pacotes. Decidimos assim depois que os PRs dele
misturaram SDKs. O #391 subiu 29 `expo-*` para o 58 e deixou o `expo` no 57. O
#395 subiu o Tailwind para o v4, que o NativeWind 4 não aceita, e o Metro
parou. O #405 subiu o `react` sem o `react-dom`, que precisa bater com o
renderer do React Native.

**Status:** accepted (2026-10-19, migração para o SDK 58: #397, PR #409)

## O que o Dependabot ignora no `/app`

| Pacote | Ignora | Por quê |
|---|---|---|
| `react-native`, `react-native-*`, `@react-native/*` | minor e major | No 0.x o minor quebra, e a linha da lib é a do SDK |
| `expo`, `expo-*`, `@expo/*`, `jest-expo` | major | O major é o número do SDK |
| `react`, `react-dom`, `@types/react` | minor e major | Tem de bater com o renderer do React Native |
| `jest`, `@types/jest`, `@testing-library/*`, `test-renderer` | major (`test-renderer`: minor também) | O SDK escolhe: o 58 pede Jest 30 e RNTL 14 |
| `tailwindcss` | major | NativeWind 4 só roda com Tailwind 3 |
| `@biomejs/biome` (raiz e app) | tudo | Versão do linter é decisão do projeto e sobe nos três `package.json` juntos |

## Consequências

- **Troca de SDK é issue própria**, com rebuild nativo e teste no aparelho.
  Na do 58, os testes passavam e quatro fluxos estavam quebrados no emulador:
  abas escondidas, o "+" da barra, os atalhos e o "Sair sem salvar?". Os
  detalhes estão no PR #409.
- **O lockfile do app se refaz com o npm da pipeline** (`npx npm@10 install`).
  O npm 11 aceita um lock que o `npm ci` do npm 10 recusa.
- PR do Dependabot que mexa nesses pacotes fora de uma troca de SDK é fechado
  com um comentário apontando para este ADR.
