-- Criação da tabela de perfis de usuários integrada com auth.users do Supabase
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  cnpj text,
  unit text,
  role text default 'user' check (role in ('admin', 'user')),
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Função auxiliar SECURITY DEFINER para verificar se o usuário atual é admin.
-- Usar security definer faz a função rodar com os privilégios do criador,
-- bypassando o RLS da tabela profiles e evitando recursão infinita.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Políticas de RLS
create policy "Usuários podem ler seus próprios dados ou admins leem todos"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Usuários podem atualizar seus próprios dados"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger para criar perfil automaticamente no cadastro do Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, cnpj, unit, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'cnpj',
    coalesce(new.raw_user_meta_data->>'unit', 'Supermercado Parceiro'),
    coalesce(new.raw_user_meta_data->>'role', case when new.email in ('admin@cm.com.br', 'adrmin@cm.com.br') then 'admin' else 'user' end),
    coalesce(new.raw_user_meta_data->>'status', 'active'),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, true)
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Adicionar a coluna para solicitar a troca da senha na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;

-- ─── TABELA DE IDEIAS ────────────────────────────────────────────────────────
create table if not exists public.ideas (
  id text default gen_random_uuid()::text primary key,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  product text not null check (product in ('Varejofacil', 'SysPDV')),
  category text not null,
  company text not null,
  author_name text not null,
  author_email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  cycle text not null,
  pain_description text not null,
  current_workaround text not null,
  attachments jsonb default '[]'::jsonb not null,
  status text default 'pending_review' check (status in (
    'pending_review',
    'voting',
    'in_immersion',
    'in_development',
    'in_validation',
    'in_pilot',
    'delivered',
    'merged',
    'rejected'
  )),
  delivered_build text,
  merged_into_id text references public.ideas(id) on delete set null,
  votes jsonb default '{}'::jsonb not null,
  comments jsonb default '[]'::jsonb not null
);

-- Habilitar Row Level Security (RLS)
alter table public.ideas enable row level security;

-- Políticas de RLS para ideas
create policy "Todos os usuários podem visualizar ideias"
  on public.ideas for select
  using (true);

create policy "Usuários podem cadastrar ideias"
  on public.ideas for insert
  with check (true);

create policy "Usuários podem atualizar suas próprias ideias ou admins atualizam todas"
  on public.ideas for update
  using (auth.uid() = user_id or public.is_admin());

-- Storage Bucket para arquivos/anexos das ideias
insert into storage.buckets (id, name, public)
values ('files', 'files', true)
on conflict (id) do update set public = true;

create policy "Anexos públicos para visualização e download"
  on storage.objects for select
  using (bucket_id = 'files');

create policy "Usuários podem enviar anexos para ideias"
  on storage.objects for insert
  with check (bucket_id = 'files');