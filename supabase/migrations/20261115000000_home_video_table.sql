-- Background video for the home page hero, managed from Admin → Home Video. The page uses the
-- most recently updated active row. Video files live in the public "videos" bucket, posters in
-- "images" (both under home-video/). Same RLS pattern as other managed tables: public read,
-- authenticated admin write. URLs must be https, since the page renders them directly.

create table if not exists "public"."home_video" (
  "id"          uuid primary key default gen_random_uuid(),
  "video_url"   text not null,
  "poster_url"  text,
  "is_active"   boolean default true,
  "updated_at"  timestamptz default now(),
  constraint "home_video_video_url_https" check ("video_url" ~ '^https://'),
  constraint "home_video_poster_url_https" check ("poster_url" is null or "poster_url" ~ '^https://')
);

alter table "public"."home_video" enable row level security;

create policy "public_read_home_video" on "public"."home_video"
  for select to public
  using (true);

create policy "auth_insert_home_video" on "public"."home_video"
  for insert to authenticated
  with check (true);

create policy "auth_update_home_video" on "public"."home_video"
  for update to authenticated
  using (true);

create policy "auth_delete_home_video" on "public"."home_video"
  for delete to authenticated
  using (true);
