-- Point Xfinity Mobile at its logo in public/carriers/. Only fills the row if
-- logo_url is still empty, so a logo uploaded from the admin is never overwritten.

update "public"."carriers"
set "logo_url" = '/carriers/xfinity-mobile.png'
where "name" = 'Xfinity Mobile'
  and ("logo_url" is null or "logo_url" = '');
