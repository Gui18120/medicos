-- Execute este SQL no Supabase SQL Editor

-- Tabela de médicos
create table if not exists medicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  crm text not null unique,
  email text,
  pin text not null,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Tabela de registros de ponto
create table if not exists registros (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid references medicos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  timestamp timestamptz default now(),
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  selfie_url text,
  token_usado text not null,
  created_at timestamptz default now()
);

create index if not exists registros_medico_id_idx on registros(medico_id);
create index if not exists registros_timestamp_idx on registros(timestamp);

-- RLS
alter table medicos enable row level security;
alter table registros enable row level security;

-- Anon pode ler medicos ativos (para busca na página de ponto)
create policy "anon_read_medicos" on medicos for select using (ativo = true);

-- Anon pode inserir registros (para bater ponto)
create policy "anon_insert_registros" on registros for insert with check (true);

-- Service role tem acesso total (para o admin)
create policy "service_all_medicos" on medicos for all using (true);
create policy "service_all_registros" on registros for all using (true);

-- Tabela de usuários administradores
create table if not exists admin_usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  senha_hash text not null,
  cargo text not null default 'admin' check (cargo in ('admin')),
  ativo boolean default true,
  created_at timestamptz default now()
);

alter table admin_usuarios enable row level security;
create policy "service_all_admin_usuarios" on admin_usuarios for all using (true);

-- Storage bucket para selfies (crie manualmente no Supabase)
-- Nome: selfies
-- Acesso: private
