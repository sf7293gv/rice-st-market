-- Prepaid carrier plans (Plans page) — mirrors the products table's shape and RLS
-- pattern: public read, authenticated admin write.

create table if not exists "public"."plans" (
  "id"             uuid primary key default gen_random_uuid(),
  "carrier_name"   text not null,
  "plan_name"      text not null,
  "price"          numeric,
  "data_amount"    text,
  "features"       text,
  "image_url"      text,
  "display_order"  integer not null default 0,
  "created_at"     timestamptz not null default now()
);

alter table "public"."plans" enable row level security;

create policy "public_read_plans" on "public"."plans"
  for select to public
  using (true);

create policy "auth_insert_plans" on "public"."plans"
  for insert to authenticated
  with check (true);

create policy "auth_update_plans" on "public"."plans"
  for update to authenticated
  using (true);

create policy "auth_delete_plans" on "public"."plans"
  for delete to authenticated
  using (true);
