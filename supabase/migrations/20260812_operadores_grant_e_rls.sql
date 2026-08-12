-- =============================================================================
-- Allowlist de operadores: tabela, permissão de leitura e RLS
-- Aplicar em AMBOS os projetos (Simulador-MoneyGo e Simulador-CapitaMax)
-- =============================================================================
--
-- Contexto: a tabela `operadores` existia só no banco de produção do MoneyGo,
-- sem nenhuma migration que a descrevesse — o repositório não contava essa
-- parte do schema. E o papel `authenticated` não tinha SELECT nela.
--
-- O efeito era silencioso e confuso de diagnosticar: a linha do operador
-- existia (visível no SQL Editor, que roda como administrador), mas o
-- `proxy.ts` — que consulta como o próprio usuário, com a chave anônima —
-- recebia vazio e barrava o acesso ao painel. Concedido o SELECT, o parceiro
-- entra normalmente.
--
-- São duas camadas independentes no Postgres, e as duas precisam estar certas:
-- o GRANT (permissão de tabela) e a política de RLS (permissão de linha).

-- 1. Tabela ------------------------------------------------------------------
-- `if not exists` para não conflitar com o banco que já a tem.
create table if not exists public.operadores (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  created_at timestamptz not null default now()
);

-- 2. Permissão de tabela ------------------------------------------------------
-- Só leitura. Entrar na allowlist é ato administrativo — feito pelo dashboard
-- ou por migration, nunca pelo app.
grant select on public.operadores to authenticated;

-- 3. RLS ----------------------------------------------------------------------
-- Sem RLS, qualquer conta autenticada — inclusive as de CLIENTE, criadas pelo
-- link do consultor — leria a lista inteira de parceiros. Com a política
-- abaixo, cada um enxerga apenas a própria linha, que é tudo de que os dois
-- pontos de consulta precisam: `proxy.ts` e `app/api/proposta/route.ts`
-- perguntam somente "existe a minha linha?" (`.eq("id", user.id)`).
alter table public.operadores enable row level security;

drop policy if exists "operador le o proprio registro" on public.operadores;
create policy "operador le o proprio registro" on public.operadores
  for select to authenticated
  using ((select auth.uid()) = id);

-- Conferência ------------------------------------------------------------------
-- Depois de aplicar, isto deve listar a política e o grant:
--
--   select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'operadores';
--
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'operadores';
