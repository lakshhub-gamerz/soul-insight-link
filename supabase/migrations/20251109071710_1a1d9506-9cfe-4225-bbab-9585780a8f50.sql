-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create trigger to auto-create profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- QueryNet tables
create table public.querynet_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  url text,
  file_path text,
  content_type text,
  created_at timestamp with time zone not null default now()
);

alter table public.querynet_documents enable row level security;

create policy "Users can manage own documents"
  on public.querynet_documents for all
  using (auth.uid() = user_id);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.querynet_documents(id) on delete cascade not null,
  content text not null,
  embedding vector(1536),
  chunk_index int not null,
  created_at timestamp with time zone not null default now()
);

alter table public.document_chunks enable row level security;

create policy "Users can view chunks of own documents"
  on public.document_chunks for select
  using (
    exists (
      select 1 from public.querynet_documents
      where id = document_chunks.document_id
      and user_id = auth.uid()
    )
  );

-- Create index for vector similarity search
create index on public.document_chunks using ivfflat (embedding vector_cosine_ops);

create table public.querynet_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  document_id uuid references public.querynet_documents(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.querynet_chats enable row level security;

create policy "Users can manage own querynet chats"
  on public.querynet_chats for all
  using (auth.uid() = user_id);

create table public.querynet_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.querynet_chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.querynet_messages enable row level security;

create policy "Users can view messages in own chats"
  on public.querynet_messages for select
  using (
    exists (
      select 1 from public.querynet_chats
      where id = querynet_messages.chat_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own chats"
  on public.querynet_messages for insert
  with check (
    exists (
      select 1 from public.querynet_chats
      where id = querynet_messages.chat_id
      and user_id = auth.uid()
    )
  );

-- LifeSync tables
create table public.lifesync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  log_date date not null,
  mood int check (mood between 1 and 5),
  sleep_hours numeric(3,1),
  focus_hours numeric(3,1),
  energy_level int check (energy_level between 1 and 5),
  notes text,
  created_at timestamp with time zone not null default now(),
  unique(user_id, log_date)
);

alter table public.lifesync_logs enable row level security;

create policy "Users can manage own logs"
  on public.lifesync_logs for all
  using (auth.uid() = user_id);

create table public.lifesync_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null default 'Reflection',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.lifesync_chats enable row level security;

create policy "Users can manage own lifesync chats"
  on public.lifesync_chats for all
  using (auth.uid() = user_id);

create table public.lifesync_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.lifesync_chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone not null default now()
);

alter table public.lifesync_messages enable row level security;

create policy "Users can view messages in own lifesync chats"
  on public.lifesync_messages for select
  using (
    exists (
      select 1 from public.lifesync_chats
      where id = lifesync_messages.chat_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own lifesync chats"
  on public.lifesync_messages for insert
  with check (
    exists (
      select 1 from public.lifesync_chats
      where id = lifesync_messages.chat_id
      and user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_querynet_chats_updated_at
  before update on public.querynet_chats
  for each row execute function public.update_updated_at_column();

create trigger update_lifesync_chats_updated_at
  before update on public.lifesync_chats
  for each row execute function public.update_updated_at_column();