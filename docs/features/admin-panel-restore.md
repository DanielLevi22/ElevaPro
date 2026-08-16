# Feature: admin-panel-restore

**Status:** active
**PRD:** [admin-panel-restore](../PRDs/admin-panel-restore.md)
**Plataformas:** web
**Última atualização:** 2026-08-16

---

## O que é

O painel `/admin`: listar usuários, aprovar especialista pendente, suspender
conta, anotar sobre uma conta e ver métricas de uso.

## Por que existe

O painel estava em código e **nenhum usuário conseguia entrar**, nem um admin
legítimo. A causa era uma coluna que não existe.

---

## Fluxo de dados

```
/admin/*  →  layout.tsx
                └── profiles.account_type === 'admin'?  não → /dashboard
/admin        →  contagens sobre profiles e workout_sessions
/admin/users  →  lista de profiles + mudança de account_status
/admin/users/[id] → detalhe + admin_notes
```

## Tabelas do banco

| Tabela | Operações | RLS ativo |
|--------|-----------|-----------|
| `profiles` | SELECT, UPDATE | ✅ |
| `workout_sessions` | COUNT (só `student_id` e data) | ✅ |

**O admin não alcança nenhuma tabela de saúde.** Verificado em
`scripts/test-rls-isolation.mjs`.

---

## Regras de negócio

1. **Só `account_type = 'admin'` entra.** Não existe super-admin — a distinção
   foi descartada porque nada dependia dela.
2. **Falha de consulta não é "não é admin".** O `error` é propagado; somar os
   dois foi o que deixou o painel inacessível.
3. **O painel não deleta quem administra o painel.** A Zona de Perigo não
   aparece para `account_type === 'admin'`.
4. **Métrica de uso conta treino, não login.** Abrir o app não é usar o
   produto.
5. **`admin_notes` é anotação sobre a conta**, escrita pelo admin. Não é dado
   de saúde e entra no direito de acesso do titular.

## Decisões técnicas não-óbvias

- **`is_super_admin`, `last_login_at` e `invite_code` foram removidas do
  código, não criadas no banco.** Nenhuma decidia nada: a primeira só passava
  um adorno para um badge, a segunda alimentava uma métrica que passou a ter
  fonte melhor, e a terceira só existia num fixture de teste.
- **A métrica de atividade mudou de fonte.** `workout_sessions` no período é
  mais honesto que último login, e não expõe conteúdo de saúde à contagem.
- **`scripts/check-column-refs.js` nasceu aqui.** Compara cada `.select()` e
  cada filtro com o schema e falha quando a coluna não existe. Rodando pela
  primeira vez, encontrou o mesmo defeito em oito lugares fora do admin — a
  lista está no PRD.

## Divergências web ↔ mobile

- Não há painel de admin no mobile.

---

## O que ficou fora

- **Último login por usuário.** Existe em `auth.users.last_sign_in_at`, mas
  alcançá-lo exige rota com `service_role`. A métrica de atividade foi
  atendida por outra fonte; o campo por usuário na listagem saiu.
- **Delete de usuário.** O botão está na Zona de Perigo com `TODO` desde antes
  desta branch.
