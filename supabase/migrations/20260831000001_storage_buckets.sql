-- Recreates the "images" and "videos" storage buckets and their RLS policies,
-- matching the Unity Foods project exactly (public buckets, no size/mime limits;
-- authenticated users can upload/delete, anyone can read).

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

create policy "auth_delete_videos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos');

create policy "auth_upload_videos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos');

create policy "authenticated_delete_images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images');

create policy "authenticated_upload_images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images');

create policy "public_read_images" on storage.objects
  for select to public
  using (bucket_id = 'images');

create policy "public_read_videos" on storage.objects
  for select to public
  using (bucket_id = 'videos');
