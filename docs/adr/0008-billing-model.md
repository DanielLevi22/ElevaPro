# Modelo de negócio B2B + B2C com aluno gerenciado gratuito

**Data:** 2026-04-19
**Status:** accepted — a prioridade "B2B primário" foi substituída pelo [ADR-0028](0028-o-praticante-vem-primeiro.md); preços e aluno gerenciado gratuito seguem valendo

---

## Contexto

Ao expandir para alunos autônomos e marketplace, surgiu a questão: o aluno deve pagar separadamente mesmo quando tem um especialista? E o especialista paga por aluno ou por funcionalidade?

## Opções consideradas

### Opção A — Todos pagam (especialista + aluno)
- **Prós:** Maior receita por usuário
- **Contras:** Alta fricção de adoção. Especialista precisa convencer o aluno a pagar para usar a plataforma. Competição direta com o WhatsApp + planilha do especialista aumenta.

### Opção B — Só o aluno paga
- **Prós:** Sem custo para o especialista
- **Contras:** Especialista sem incentivo financeiro para adotar a plataforma como ferramenta de negócio. Não resolve o problema de gestão do especialista.

### Opção C — B2B (especialista paga) + B2C separado (aluno autônomo paga)
- **Prós:** Especialista é o cliente primário — paga e recebe alunos gratuitos como benefício. Aluno gerenciado tem zero fricção de adoção. Aluno autônomo paga apenas quando não tem especialista.
- **Contras:** Dois produtos distintos requerem dois funnels de aquisição.

## Decisão

**Adotamos Opção C: B2B como produto primário, B2C como produto secundário.**

**B2B — Especialista paga:**
- Starter R$89/mês → até 30 alunos
- Pro R$129/mês → até 100 alunos + marketplace + WhatsApp
- Elite R$199/mês → ilimitado + destaque no marketplace

**B2C — Aluno autônomo paga:**
- Free → básico sem IA avançada
- Starter R$19/mês → assistente limitado + 1 check-in/mês
- Pro R$39/mês → assistente ilimitado + 4 check-ins/mês

**Aluno gerenciado:** sempre gratuito enquanto tiver especialista ativo.

**Migração B2C → B2B:** ao contratar um especialista via marketplace, a assinatura do aluno é cancelada automaticamente — o especialista assume o custo via plano dele.

O fator decisivo: aluno gerenciado sendo gratuito remove a maior barreira de adoção do especialista ("meu aluno vai ter que pagar?"). O especialista vende a plataforma para o aluno como benefício incluso no serviço dele.

## Consequências

- **Aquisição focada no especialista** — ele traz os alunos
- **Aluno gerenciado tem zero fricção** — aumenta a taxa de adoção
- **Marketplace cria novo canal** — aluno autônomo que contrata especialista migra de B2C para B2B (troca de quem paga, não cancela receita)
- **Spec detalhada:** issue [#160](https://github.com/DanielLevi22/ElevaPro/issues/160)
