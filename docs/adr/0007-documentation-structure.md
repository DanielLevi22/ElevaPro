# Estrutura de documentação em 3 camadas

**Data:** 2026-04-19
**Status:** accepted — a camada `decisions/` foi substituída por `docs/adr/`
pelo [ADR-0012](0012-adr-layout-padrao-das-skills.md); as outras três camadas
seguem valendo. O corpo abaixo é o registro histórico da decisão original.

---

## Contexto

A documentação do projeto cresceu de forma orgânica e virou um arquivo de 70+ documentos sem hierarquia clara — misturando análises pontuais, planos futuros, referências técnicas e decisões arquiteturais. Qualquer novo desenvolvedor (ou agente de IA) levava muito tempo para entender onde buscar cada tipo de informação.

## Opções consideradas

### Opção A — Um documento único gigante
- **Prós:** Tudo em um lugar
- **Contras:** Inviável para manter atualizado. Seções ficam desatualizadas sem que ninguém perceba.

### Opção B — Wiki estilo Confluence (Notion, GitBook)
- **Prós:** Boa navegação, ferramentas ricas
- **Contras:** Fora do repositório — fica desatualizado com o código. Custo de setup e manutenção.

### Opção C — 3 camadas no próprio repositório (`/docs`)
- **Prós:** Versionado junto com o código. Cada tipo de documento tem audiência e frequência de atualização diferente — separá-los evita que misturem.
- **Contras:** Requer disciplina para manter a estrutura.

## Decisão

**Adotamos Opção C: estrutura de 3 camadas dentro de `/docs`.**

```
docs/
  README.md              ← entrada: visão geral com diagramas C4 Nível 1+2
  modules/<x>/README.md  ← C4 Nível 3: como o módulo funciona (técnico)
  PRDs/<x>/*.md          ← o que está sendo construído e por quê (planejamento)
  decisions/             ← por que cada decisão estrutural foi tomada (ADRs)
```

| Camada | Responde | Atualiza quando |
|---|---|---|
| `modules/` | Como funciona agora | Código muda |
| `PRDs/` | O que vamos construir | Feature nova |
| `decisions/` | Por que essa escolha | Decisão estrutural |

**Padrão de diagramas:** Mermaid para diagramas técnicos (flowchart, sequence, stateDiagram, erDiagram) + Excalidraw planejado para diagramas de visão geral.

**C4 Model** como padrão de profundidade:
- `docs/README.md` → Nível 1 (contexto) + Nível 2 (containers)
- `docs/modules/<x>/README.md` → Nível 3 (componentes)

## Consequências

- **Mais claro:** qualquer desenvolvedor ou agente encontra o tipo de informação que precisa em < 30 segundos
- **Mais fácil de manter:** cada documento tem responsabilidade única — não mistura referência com planejamento
- **70+ documentos antigos removidos:** o `archive/` foi deletado. O que não estava em uso não será recuperado.
- **Template obrigatório:** `docs/modules/_template.md` para novos módulos
