# Renomear produto para Eleva Pro

**Data:** 2026-04-19
**Status:** accepted

---

## Contexto

O produto se chamava "MeuPersonal" — nome que limitava o posicionamento e o público. Com a expansão para alunos autônomos, marketplace de especialistas e IA como secretária de performance, o nome precisava refletir o novo escopo e posicionamento premium.

Requisitos para o novo nome:
- Auto-descritivo para SEO (encontrável no Play Store e Google)
- Transmite elevação, resultado, nível profissional
- Funciona para os três públicos (especialista, aluno gerenciado, aluno autônomo)
- Não coloca "IA" no nome (aluno gerenciado paga o especialista, não quer sentir que está sendo gerenciado por robô)

## Opções consideradas

| Nome | Prós | Contras |
|---|---|---|
| MeuPersonal | Familiar, já existe | Limita ao personal trainer, não transmite IA nem premium |
| GestorIA | Descritivo, duplo sentido (gestoria) | Pode soar burocrático |
| Nexo | Conexão especialista-aluno | Não é auto-descritivo para buscas |
| PersonalPro | Findable ("personal trainer pro") | Limita ao personal, exclui nutricionistas |
| **Eleva Pro** | Transmite elevação + profissional. "Pro" cobre os 3 públicos. Subtítulo no Play Store carrega as keywords. Funciona em PT e EN. | Não é auto-descritivo sozinho — depende do subtítulo |

## Decisão

**Produto renomeado para Eleva Pro.**

- **Eleva:** verbo imperativo — "eleva seu nível". Motivacional, direto, sem jargão.
- **Pro:** sinaliza ferramenta profissional para os três públicos:
  - Especialista → plataforma profissional
  - Aluno gerenciado → cuidado de nível profissional
  - Aluno autônomo → ferramentas de nível profissional

**Estratégia de SEO:** o nome não precisa ser a keyword — o título no Play Store faz esse trabalho.
> App Store title: `"Eleva Pro — Personal Trainer e Nutrição com IA"`

**Por que não colocar "IA" no nome:** aluno gerenciado paga o especialista para ter acompanhamento humano. Colocar "IA" no nome transmite que ele está pagando por um robô. A IA é o motor, não a promessa.

## Consequências

- **Branding completo** documentado na issue [#161](https://github.com/DanielLevi22/ElevaPro/issues/161)
- **Cores da marca:** Laranja `#FF6B35` + Navy `#141B2D` + Off White `#F4F4F5`
- **Tagline:** "Eleva seu nível."
- **Impacto no código:** renomear referências ao longo do tempo — não é uma migração urgente
- **Domínio alvo:** `elevapro.com.br`
- **Nome antigo "MeuPersonal"** não deve aparecer em novos documentos, PRDs ou código

## Como reverter (se necessário)

Reverter branding. Custo: baixo tecnicamente, mas alto em esforço de marketing. Não reverter sem decisão explícita do produto.
