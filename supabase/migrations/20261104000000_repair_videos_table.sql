-- TikTok videos shown in the "Watch Our Repairs" section of the Repairs page — mirrors the
-- plans/carriers RLS pattern: public read, authenticated admin write. tiktok_url is stored in
-- canonical form (https://www.tiktok.com/@user/video/<id>, no query string); the check
-- constraint enforces that even for writes that bypass the admin form, since the public page
-- renders it into links and embeds.

create table if not exists "public"."repair_videos" (
  "id"             uuid primary key default gen_random_uuid(),
  "tiktok_url"     text not null,
  "title"          text,
  "display_order"  integer default 0,
  "created_at"     timestamptz default now(),
  constraint "repair_videos_tiktok_url_format"
    check ("tiktok_url" ~ '^https://www\.tiktok\.com/@[A-Za-z0-9._]+/video/[0-9]+$')
);

alter table "public"."repair_videos" enable row level security;

create policy "public_read_repair_videos" on "public"."repair_videos"
  for select to public
  using (true);

create policy "auth_insert_repair_videos" on "public"."repair_videos"
  for insert to authenticated
  with check (true);

create policy "auth_update_repair_videos" on "public"."repair_videos"
  for update to authenticated
  using (true);

create policy "auth_delete_repair_videos" on "public"."repair_videos"
  for delete to authenticated
  using (true);
