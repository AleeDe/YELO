alter table public.cameras
add column if not exists latest_frame_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'camera-live-frames',
  'camera-live-frames',
  false,
  2097152,
  array['image/jpeg']
)
on conflict (id) do nothing;

create policy "live_frames_select_society_members"
on storage.objects for select
to authenticated
using (
  bucket_id = 'camera-live-frames'
  and public.is_society_member(((storage.foldername(name))[2])::uuid)
);
