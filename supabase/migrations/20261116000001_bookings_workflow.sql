-- Appointments workflow: new → called → confirmed → completed, with cancelled / no_show allowed
-- from any active step. Every step is stamped with when and by whom (the signed-in admin's email,
-- taken from the JWT). Finished appointments (completed, cancelled, no_show) get archived_at and
-- stay in the table as permanent history — nothing is hard-deleted by the app.
--
-- Existing rows: pending → new, confirmed → confirmed (confirmed_time = the requested slot, store
-- time), cancelled → cancelled (archived_at = time of this migration).

-- 1. Workflow columns (all existing columns are kept).
alter table "public"."bookings"
  add column if not exists "called_at"      timestamptz,
  add column if not exists "called_by"      text,
  add column if not exists "call_notes"     text,
  add column if not exists "call_attempts"  integer not null default 0,
  add column if not exists "confirmed_time" timestamptz,
  add column if not exists "confirmed_at"   timestamptz,
  add column if not exists "confirmed_by"   text,
  add column if not exists "completed_at"   timestamptz,
  add column if not exists "completed_by"   text,
  add column if not exists "amount_paid"    numeric(10, 2),
  add column if not exists "payment_method" text,
  add column if not exists "admin_notes"    text,
  add column if not exists "archived_at"    timestamptz;

-- 2. Map existing statuses, then switch to the new set.
alter table "public"."bookings" drop constraint if exists "bookings_status_check";

update "public"."bookings" set "status" = 'new' where "status" = 'pending';
update "public"."bookings"
  set "confirmed_time" = ("booking_date" + "booking_time") at time zone 'America/Chicago'
  where "status" = 'confirmed' and "confirmed_time" is null;
update "public"."bookings"
  set "archived_at" = now()
  where "status" = 'cancelled' and "archived_at" is null;

alter table "public"."bookings" alter column "status" set default 'new';

alter table "public"."bookings"
  add constraint "bookings_status_check"
    check ("status" in ('new', 'called', 'confirmed', 'completed', 'cancelled', 'no_show')),
  add constraint "bookings_payment_method_check"
    check ("payment_method" is null or "payment_method" in ('cash', 'card', 'other')),
  add constraint "bookings_amount_paid_check"
    check ("amount_paid" is null or "amount_paid" >= 0),
  add constraint "bookings_call_attempts_check"
    check ("call_attempts" >= 0),
  add constraint "bookings_archived_check"
    check (("archived_at" is not null) = ("status" in ('completed', 'cancelled', 'no_show')));

create index if not exists "bookings_status_idx" on "public"."bookings" ("status", "created_at" desc);
create index if not exists "bookings_archived_at_idx" on "public"."bookings" ("archived_at" desc);

-- 3. Guard: new rows always start as 'new' with an empty workflow (the public booking form can't
--    pre-set a status or fake an admin step; an old form sending 'pending' still works), and status
--    changes must follow the allowed order. Step stamps are set here, not trusted from the client.
create or replace function "public"."bookings_workflow_guard"()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor text := nullif(auth.jwt() ->> 'email', '');
begin
  if tg_op = 'INSERT' then
    new.status         := 'new';
    new.called_at      := null;  new.called_by    := null;  new.call_notes := null;
    new.call_attempts  := 0;
    new.confirmed_time := null;  new.confirmed_at := null;  new.confirmed_by := null;
    new.completed_at   := null;  new.completed_by := null;
    new.amount_paid    := null;  new.payment_method := null;
    new.admin_notes    := null;  new.archived_at  := null;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
         (old.status = 'new'       and new.status = 'called')
      or (old.status = 'called'    and new.status = 'confirmed')
      or (old.status = 'confirmed' and new.status = 'completed')
      or (old.status in ('new', 'called', 'confirmed') and new.status in ('cancelled', 'no_show'))
    ) then
      raise exception 'An appointment can''t go from "%" to "%".', old.status, new.status
        using errcode = 'check_violation';
    end if;

    if new.status = 'called' then
      if coalesce(btrim(new.call_notes), '') = '' then
        raise exception 'Call notes are required to mark an appointment as called.' using errcode = 'check_violation';
      end if;
      new.called_at := now();
      new.called_by := coalesce(actor, new.called_by);
    elsif new.status = 'confirmed' then
      if new.confirmed_time is null then
        raise exception 'A confirmed date and time is required.' using errcode = 'check_violation';
      end if;
      new.confirmed_at := now();
      new.confirmed_by := coalesce(actor, new.confirmed_by);
    elsif new.status = 'completed' then
      if new.amount_paid is null or new.payment_method is null then
        raise exception 'Amount paid and payment method are required to complete an appointment.' using errcode = 'check_violation';
      end if;
      new.completed_at := now();
      new.completed_by := coalesce(actor, new.completed_by);
      new.archived_at  := now();
    else -- cancelled / no_show
      new.archived_at := now();
    end if;
  else
    -- No status change: step stamps can't be rewritten.
    new.called_at    := old.called_at;    new.called_by    := old.called_by;
    new.confirmed_at := old.confirmed_at; new.confirmed_by := old.confirmed_by;
    new.completed_at := old.completed_at; new.completed_by := old.completed_by;
    new.archived_at  := old.archived_at;
  end if;

  if new.call_attempts < old.call_attempts then
    raise exception 'Call attempts can''t go down.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists "bookings_workflow_guard" on "public"."bookings";
create trigger "bookings_workflow_guard"
  before insert or update on "public"."bookings"
  for each row execute function "public"."bookings_workflow_guard"();

-- 4. RLS: public INSERT (booking form) and authenticated SELECT/UPDATE stay as they are.
--    The app never hard-deletes appointments, so the authenticated DELETE policy is removed.
drop policy if exists "auth_delete_bookings" on "public"."bookings";

-- 5. Realtime, for the admin new-appointment alert (RLS still applies: only signed-in users get events).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication "supabase_realtime" add table "public"."bookings";
  end if;
end $$;
