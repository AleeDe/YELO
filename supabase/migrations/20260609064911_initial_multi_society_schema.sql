create extension if not exists pgcrypto;

create type public.platform_role as enum ('super_admin', 'user');
create type public.society_role as enum ('society_admin', 'operator');
create type public.camera_source as enum (
  'mobile',
  'webcam',
  'rtsp',
  'recorded_video'
);
create type public.camera_status as enum (
  'pending',
  'online',
  'offline',
  'disabled',
  'error'
);
create type public.event_status as enum (
  'new',
  'under_review',
  'confirmed',
  'false_positive',
  'resolved'
);
create type public.event_media_type as enum ('image', 'video');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  platform_role public.platform_role not null default 'user',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  address text,
  timezone text not null default 'Asia/Karachi',
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.society_members (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.society_role not null default 'operator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (society_id, user_id)
);

create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  location_label text,
  source_type public.camera_source not null,
  status public.camera_status not null default 'pending',
  device_token_hash text,
  stream_config jsonb not null default '{}'::jsonb,
  detection_enabled boolean not null default true,
  confidence_threshold numeric(4, 3) not null default 0.500
    check (confidence_threshold between 0 and 1),
  confirmation_seconds integer not null default 5
    check (confirmation_seconds between 1 and 60),
  last_seen_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restricted_zones (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  camera_id uuid not null references public.cameras (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  polygon jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(polygon) = 'array' and jsonb_array_length(polygon) >= 3)
);

create table public.detection_events (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  camera_id uuid not null references public.cameras (id) on delete cascade,
  zone_id uuid references public.restricted_zones (id) on delete set null,
  event_type text not null default 'possible_littering',
  status public.event_status not null default 'new',
  object_class text not null,
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  detected_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create table public.event_media (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  event_id uuid not null references public.detection_events (id) on delete cascade,
  media_type public.event_media_type not null,
  storage_path text not null,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.detection_events (id) on delete cascade,
  title text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  society_id uuid references public.societies (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index society_members_user_society_idx
  on public.society_members (user_id, society_id);
create index cameras_society_status_idx
  on public.cameras (society_id, status);
create index cameras_last_seen_idx
  on public.cameras (last_seen_at);
create index restricted_zones_camera_active_idx
  on public.restricted_zones (camera_id, is_active);
create index detection_events_society_detected_idx
  on public.detection_events (society_id, detected_at desc);
create index detection_events_camera_detected_idx
  on public.detection_events (camera_id, detected_at desc);
create index detection_events_status_detected_idx
  on public.detection_events (status, detected_at desc);
create index notifications_user_read_created_idx
  on public.notifications (user_id, is_read, created_at desc);
create index audit_logs_society_created_idx
  on public.audit_logs (society_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger societies_set_updated_at
before update on public.societies
for each row execute function public.set_updated_at();

create trigger cameras_set_updated_at
before update on public.cameras
for each row execute function public.set_updated_at();

create trigger restricted_zones_set_updated_at
before update on public.restricted_zones
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and platform_role = 'super_admin'
  );
$$;

create or replace function public.is_society_member(target_society_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.society_members
    where society_id = target_society_id
      and user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function public.is_society_admin(target_society_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.society_members
    where society_id = target_society_id
      and user_id = (select auth.uid())
      and role = 'society_admin'
      and is_active
  );
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.is_society_member(uuid) from public;
revoke all on function public.is_society_admin(uuid) from public;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_society_member(uuid) to authenticated;
grant execute on function public.is_society_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.societies enable row level security;
alter table public.society_members enable row level security;
alter table public.cameras enable row level security;
alter table public.restricted_zones enable row level security;
alter table public.detection_events enable row level security;
alter table public.event_media enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_self_or_super_admin"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or public.is_super_admin());

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "societies_select_members"
on public.societies for select
to authenticated
using (public.is_society_member(id));

create policy "societies_insert_super_admin"
on public.societies for insert
to authenticated
with check (public.is_super_admin() and created_by = (select auth.uid()));

create policy "societies_update_admin"
on public.societies for update
to authenticated
using (public.is_society_admin(id))
with check (public.is_society_admin(id));

create policy "society_members_select_members"
on public.society_members for select
to authenticated
using (public.is_society_member(society_id));

create policy "society_members_insert_admin"
on public.society_members for insert
to authenticated
with check (public.is_society_admin(society_id));

create policy "society_members_update_admin"
on public.society_members for update
to authenticated
using (public.is_society_admin(society_id))
with check (public.is_society_admin(society_id));

create policy "society_members_delete_admin"
on public.society_members for delete
to authenticated
using (public.is_society_admin(society_id));

create policy "cameras_select_members"
on public.cameras for select
to authenticated
using (public.is_society_member(society_id));

create policy "cameras_insert_admin"
on public.cameras for insert
to authenticated
with check (
  public.is_society_admin(society_id)
  and created_by = (select auth.uid())
);

create policy "cameras_update_admin"
on public.cameras for update
to authenticated
using (public.is_society_admin(society_id))
with check (public.is_society_admin(society_id));

create policy "cameras_delete_admin"
on public.cameras for delete
to authenticated
using (public.is_society_admin(society_id));

create policy "zones_select_members"
on public.restricted_zones for select
to authenticated
using (public.is_society_member(society_id));

create policy "zones_insert_admin"
on public.restricted_zones for insert
to authenticated
with check (
  public.is_society_admin(society_id)
  and exists (
    select 1 from public.cameras
    where cameras.id = camera_id
      and cameras.society_id = restricted_zones.society_id
  )
);

create policy "zones_update_admin"
on public.restricted_zones for update
to authenticated
using (public.is_society_admin(society_id))
with check (public.is_society_admin(society_id));

create policy "zones_delete_admin"
on public.restricted_zones for delete
to authenticated
using (public.is_society_admin(society_id));

create policy "events_select_members"
on public.detection_events for select
to authenticated
using (public.is_society_member(society_id));

create policy "events_review_members"
on public.detection_events for update
to authenticated
using (public.is_society_member(society_id))
with check (
  public.is_society_member(society_id)
  and reviewed_by = (select auth.uid())
);

create policy "event_media_select_members"
on public.event_media for select
to authenticated
using (public.is_society_member(society_id));

create policy "notifications_select_own"
on public.notifications for select
to authenticated
using (
  user_id = (select auth.uid())
  and public.is_society_member(society_id)
);

create policy "notifications_update_own"
on public.notifications for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "audit_logs_select_admin"
on public.audit_logs for select
to authenticated
using (
  (society_id is null and public.is_super_admin())
  or (society_id is not null and public.is_society_admin(society_id))
);

revoke update on public.detection_events from authenticated;
grant update (status, reviewed_by, reviewed_at, review_notes)
  on public.detection_events to authenticated;

revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-evidence',
  'event-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'video/mp4']
)
on conflict (id) do nothing;

create policy "evidence_select_society_members"
on storage.objects for select
to authenticated
using (
  bucket_id = 'event-evidence'
  and public.is_society_member(((storage.foldername(name))[2])::uuid)
);
