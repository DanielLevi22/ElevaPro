---
name: lgpd-check
description: Revisão LGPD e de controles auditáveis do Eleva Pro. Use para dados pessoais ou de saúde, onboarding, consentimento, direitos do titular, autenticação, autorização, logs, auditoria, incidentes e integrações que tratem dados.
metadata:
  author: Daniel Levi
  version: "1.1.0"
---

# Skill: /lgpd-check

Esta é a entrada do Claude para a revisão LGPD do Eleva Pro. A fonte canônica fica em
`../../../.agents/skills/lgpd-check/SKILL.md`, para Codex e Claude não divergirem.

Antes de revisar ou implementar, leia integralmente essa skill e, quando ela indicar,
`../../../.agents/skills/lgpd-check/references/security-and-auditability.md`. Siga o
resultado estruturado, as travas negativas e os bloqueadores definidos ali.

Não substitua a revisão por uma leitura superficial: o escopo inclui proteção de dados,
autorização no banco, auditoria sem conteúdo sensível, retenção e resposta a incidente.
