-- =============================================================================
-- Cadastro de clientes + leads escopados por operador
-- Aplicar em AMBOS os projetos (Simulador-MoneyGo e Simulador-CapitaMax)
-- via SQL Editor do dashboard (o MCP desta máquina está sem acesso à org).
-- =============================================================================

-- 1. Tabela de clientes -------------------------------------------------------
-- Uma linha por conta de cliente (auth.users). O operador_id vincula o cliente
-- ao consultor que gerou o link (?op=). É uuid sem FK de propósito: links
-- antigos não carregam operador e um valor inválido não pode travar o cadastro.
create table if not exists public.clientes (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text not null,
  operador_id uuid,
  criado_em timestamptz not null default now()
);

alter table public.clientes enable row level security;

grant select, insert, update on public.clientes to authenticated;

-- Cliente cria e enxerga apenas o próprio cadastro; o consultor dono do link
-- enxerga os clientes vinculados a ele (e somente esses — nada de leads de
-- outros parceiros).
drop policy if exists "cliente cria o proprio cadastro" on public.clientes;
create policy "cliente cria o proprio cadastro" on public.clientes
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "cliente ou operador dono le o cadastro" on public.clientes;
create policy "cliente ou operador dono le o cadastro" on public.clientes
  for select to authenticated
  using ((select auth.uid()) = id or (select auth.uid()) = operador_id);

drop policy if exists "cliente atualiza o proprio cadastro" on public.clientes;
create policy "cliente atualiza o proprio cadastro" on public.clientes
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 2. Propostas: vínculo com o cliente ----------------------------------------
alter table public.propostas
  add column if not exists cliente_id uuid references auth.users (id);

-- 3. Propostas: SELECT escopado por operador ----------------------------------
-- Antes: qualquer operador da allowlist lia TODAS as propostas.
-- Agora: cada operador lê apenas as propostas vinculadas a ele; o cliente lê
-- as próprias. Propostas públicas (sem operador) ficam visíveis só via
-- dashboard/service role.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'propostas' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.propostas', pol.policyname);
  end loop;
end $$;

create policy "operador ou cliente dono le a proposta" on public.propostas
  for select to authenticated
  using (
    (select auth.uid()) = operador_id
    or (select auth.uid()) = cliente_id
  );

-- 4. Operadores: leitura do próprio registro ----------------------------------
-- Garante que o app consiga checar "este usuário é operador?" (proxy e
-- /api/proposta) sem expor a lista de operadores a ninguém.
drop policy if exists "operador ve o proprio registro" on public.operadores;
create policy "operador ve o proprio registro" on public.operadores
  for select to authenticated
  using ((select auth.uid()) = id);
