-- Store photos for public pages (shelves, aisles, storefront), managed from Admin → Page Photos.
-- One table for every page: `page` is the page's slug ('grocery' for now; other pages later).
-- Images are uploaded to the existing public "images" storage bucket under page-photos/.
-- Same RLS pattern as plans/carriers: public read, authenticated admin write.

create table if not exists "public"."page_photos" (
  "id"             uuid primary key default gen_random_uuid(),
  "page"           text not null,
  "image_url"      text not null,
  "caption"        text,
  "display_order"  integer default 0,
  "created_at"     timestamptz default now(),
  constraint "page_photos_page_slug" check ("page" ~ '^[a-z][a-z0-9-]*$')
);

create index if not exists "page_photos_page_order_idx"
  on "public"."page_photos" ("page", "display_order");

alter table "public"."page_photos" enable row level security;

create policy "public_read_page_photos" on "public"."page_photos"
  for select to public
  using (true);

create policy "auth_insert_page_photos" on "public"."page_photos"
  for insert to authenticated
  with check (true);

create policy "auth_update_page_photos" on "public"."page_photos"
  for update to authenticated
  using (true);

create policy "auth_delete_page_photos" on "public"."page_photos"
  for delete to authenticated
  using (true);
