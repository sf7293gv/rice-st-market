-- Carriers shown in the "Carriers We Carry" section of the Plans page — mirrors the
-- plans table's RLS pattern: public read, authenticated admin write. Logos are
-- uploaded to the existing "images" storage bucket under carriers/.

create table if not exists "public"."carriers" (
  "id"             uuid primary key default gen_random_uuid(),
  "name"           text not null,
  "logo_url"       text,
  "display_order"  integer default 0,
  "created_at"     timestamptz default now()
);

alter table "public"."carriers" enable row level security;

create policy "public_read_carriers" on "public"."carriers"
  for select to public
  using (true);

create policy "auth_insert_carriers" on "public"."carriers"
  for insert to authenticated
  with check (true);

create policy "auth_update_carriers" on "public"."carriers"
  for update to authenticated
  using (true);

create policy "auth_delete_carriers" on "public"."carriers"
  for delete to authenticated
  using (true);

-- Seed the initial carriers (names only — logos are added from the admin).
-- Skipped if the table already has rows, so re-running never duplicates them.
insert into "public"."carriers" ("name", "display_order")
select v.name, v.display_order
from (values
  ('T-Mobile',          1),
  ('Verizon',           2),
  ('AT&T',              3),
  ('Metro by T-Mobile', 4),
  ('Boost Mobile',      5),
  ('Total Wireless',    6)
) as v(name, display_order)
where not exists (select 1 from "public"."carriers");
