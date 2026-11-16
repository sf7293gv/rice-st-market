-- Repair Media: explicit order and an optional poster image for videos.
--   display_order — lower shows first on the Repairs page; ties (e.g. new uploads, which default
--                   to 0) fall back to newest first, matching the previous behavior.
--   poster_url    — still image shown on a video before it plays (null for photos / no poster).

alter table "public"."repair_media"
  add column if not exists "display_order" integer not null default 0;

alter table "public"."repair_media"
  add column if not exists "poster_url" text;

alter table "public"."repair_media"
  add constraint "repair_media_poster_url_check" check ("poster_url" is null or "poster_url" like 'https://%');

create index if not exists "repair_media_display_order_idx"
  on "public"."repair_media" ("display_order", "created_at" desc);
