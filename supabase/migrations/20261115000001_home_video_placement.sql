-- home_video now holds two slots, told apart by `placement`:
--   'hero'     — silent background loop behind the home page banner (existing behavior)
--   'featured' — the "See Rice St Market" video section, played with sound on demand
-- Existing rows keep working as the hero video. Each slot uses its most recently updated active row.

alter table "public"."home_video"
  add column if not exists "placement" text not null default 'hero';

alter table "public"."home_video"
  add constraint "home_video_placement_check" check ("placement" in ('hero', 'featured'));

create index if not exists "home_video_placement_idx"
  on "public"."home_video" ("placement", "is_active", "updated_at" desc);
