alter table public.cameras
add column if not exists signaling_key text
  not null
  default replace(gen_random_uuid()::text, '-', '');

alter table public.cameras
add constraint cameras_signaling_key_format
check (signaling_key ~ '^[a-f0-9]{32}$');
