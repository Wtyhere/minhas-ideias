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

-- Políticas de RLS
create policy "Usuários podem ler seus próprios dados ou admins leem todos"
  on public.profiles for select
  using (auth.uid() = id or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

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
    coalesce(new.raw_user_meta_data->>'status', 'active')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
