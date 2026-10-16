-- Point each carrier at its logo in public/carriers/ (served from the site root).
-- Only fills rows whose logo_url is still empty, so a logo later uploaded from the
-- admin is never overwritten if this is re-run. Xfinity Mobile is intentionally
-- left without a logo (no current official logo file available) and shows its name tile.

update "public"."carriers" c
set "logo_url" = v.logo_url
from (values
  ('T-Mobile',          '/carriers/t-mobile.svg'),
  ('Verizon',           '/carriers/verizon.svg'),
  ('AT&T',              '/carriers/att.svg'),
  ('Metro by T-Mobile', '/carriers/metro-by-t-mobile.svg'),
  ('Boost Mobile',      '/carriers/boost-mobile.svg'),
  ('Total Wireless',    '/carriers/total-wireless.svg'),
  ('Tracfone',          '/carriers/tracfone.svg'),
  ('H2O Wireless',      '/carriers/h2o-wireless.png')
) as v(name, logo_url)
where c.name = v.name
  and (c.logo_url is null or c.logo_url = '');
