-- My Masterpiece: schema del server per la sincronizzazione.
-- Da eseguire una volta in Supabase → SQL Editor (vedi docs/supabase.md).
-- Si può rieseguire: non cancella dati.

-- Una riga per voce (esercizio, template, seduta, blocco, fase, applicazione,
-- oppure `meta`: data gara e impostazioni), per utente.
create table if not exists public.items (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,
  id text not null,
  pos integer not null default 0,
  item jsonb,
  deleted boolean not null default false,
  -- ora della modifica sul dispositivo: vince la più recente
  updated_at timestamptz not null,
  -- ora di arrivo sul server: i dispositivi scaricano le righe più nuove del loro cursore
  server_at timestamptz not null default clock_timestamp(),
  schema_version integer not null,
  primary key (user_id, kind, id)
);

-- Tipi di voce ammessi (aggiornato a ogni nuovo elenco: `imports` dalla v10).
alter table public.items drop constraint if exists items_kind_check;
alter table public.items add constraint items_kind_check check (kind in (
  'exercises', 'templates', 'sessions', 'blocks', 'phases', 'applications',
  'imports', 'meta'
));

create index if not exists items_user_server_at on public.items (user_id, server_at);

-- Permessi (i progetti nuovi non li concedono in automatico). `anon` può solo leggere,
-- ma la RLS non gli mostra nessuna riga: serve al ping anti-pausa.
grant select on public.items to anon;
grant select, insert, update on public.items to authenticated;

-- Ognuno vede e modifica solo le proprie righe.
alter table public.items enable row level security;

drop policy if exists "items: solo le proprie" on public.items;
create policy "items: solo le proprie" on public.items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Invio dal dispositivo: inserisce o aggiorna, ma solo se la voce è più recente
-- di quella già sul server.
create or replace function public.push_items(rows jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.items as t
    (user_id, kind, id, pos, item, deleted, updated_at, server_at, schema_version)
  select
    auth.uid(),
    r.kind,
    r.id,
    coalesce(r.pos, 0),
    r.item,
    coalesce(r.deleted, false),
    r.updated_at,
    clock_timestamp(),
    r.schema_version
  from jsonb_to_recordset(rows) as r(
    kind text, id text, pos integer, item jsonb, deleted boolean,
    updated_at timestamptz, schema_version integer
  )
  where auth.uid() is not null
  on conflict (user_id, kind, id) do update set
    pos = excluded.pos,
    item = excluded.item,
    deleted = excluded.deleted,
    updated_at = excluded.updated_at,
    server_at = excluded.server_at,
    schema_version = excluded.schema_version
  where t.updated_at < excluded.updated_at;
$$;

revoke all on function public.push_items(jsonb) from public, anon;
grant execute on function public.push_items(jsonb) to authenticated;

-- File FIT originali delle attività Garmin: bucket privato `fit`, un file per
-- attività in una cartella per utente (`<user id>/<attività>.fit`).
insert into storage.buckets (id, name, public)
values ('fit', 'fit', false)
on conflict (id) do nothing;

drop policy if exists "fit: leggere i propri" on storage.objects;
create policy "fit: leggere i propri" on storage.objects
  for select to authenticated
  using (bucket_id = 'fit' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "fit: caricare i propri" on storage.objects;
create policy "fit: caricare i propri" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fit' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "fit: sostituire i propri" on storage.objects;
create policy "fit: sostituire i propri" on storage.objects
  for update to authenticated
  using (bucket_id = 'fit' and (storage.foldername(name))[1] = (select auth.uid())::text);
