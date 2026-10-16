-- Add three more carriers to the "Carriers We Carry" section (names only — logos are
-- set separately). Each row is inserted only if no carrier with that name exists,
-- so re-running never creates duplicates.

insert into "public"."carriers" ("name", "display_order")
select v.name, v.display_order
from (values
  ('Xfinity Mobile', 7),
  ('Tracfone',       8),
  ('H2O Wireless',   9)
) as v(name, display_order)
where not exists (
  select 1 from "public"."carriers" c where c.name = v.name
);
