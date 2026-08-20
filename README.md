# Rice St Market Wireless & Deli

**Rice St Market Wireless & Deli** is a neighborhood grocery store, deli, electronics shop, and phone repair center located at 1110 Rice St, St Paul, MN 55117. Phone: (612) 459-7870.

**Live site:** Not yet deployed — local clone/retheme in progress.

> This project is a clone of the **Unity Foods** codebase, retargeted for a second store (Rice St Market Wireless & Deli). Branding, colors, and store info are being updated for the new store; the underlying features and structure are unchanged. The Deployment, Supabase project, and Environment variables sections below still describe the original Unity Foods infrastructure and have intentionally not been touched — see the note at the end of this README.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Routing | React Router v7 |
| Styling | Tailwind CSS + custom CSS |
| Backend / Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (email + password) |
| File storage | Supabase Storage (`images` bucket) |
| Email notifications | Supabase Edge Functions (Deno) + Resend |
| SEO | react-helmet-async |
| Deployment | Vercel + custom domain |

---

## Features

### Customer-facing pages

| Route | Description |
|---|---|
| `/` | Home — hero, live announcements, weekly specials, repair CTA, store hours, about snippet |
| `/menu` | Deli & grocery menu with category filters |
| `/electronics` | Product grid with category/condition filters and product inquiry modal |
| `/tobacco` | Tobacco products display grid (no prices, display only) |
| `/repairs` | Repair services list, before/after media gallery, online booking form |
| `/services` | Overview of all store service categories |
| `/about` | Store story and community background with live hours |
| `/contact` | Address, phone, embedded map, and live store hours |
| `*` | Custom branded 404 page |

### Admin panel (`/admin`)

All admin routes are protected — unauthenticated users are redirected to `/admin/login`.

| Route | Description |
|---|---|
| `/admin` | Dashboard — stat cards and quick-action links |
| `/admin/items` | Menu items CRUD (name, price, category, image, active toggle) |
| `/admin/specials` | Weekly specials CRUD (sale price, original price, image) |
| `/admin/announcements` | Site-wide announcements CRUD |
| `/admin/hours` | Store hours per day of week (open/close times, closed toggle) |
| `/admin/electronics` | Electronics products CRUD (price optional — shows "Call for Quote" if blank) |
| `/admin/tobacco` | Tobacco products CRUD (name and image only) |
| `/admin/inquiries` | Product inquiries from the Electronics page — view and delete |
| `/admin/repairs` | Repair services CRUD (price optional — shows "Call for Quote" if blank) |
| `/admin/repair-media` | Before/after repair photo gallery uploads |
| `/admin/bookings` | Repair bookings — status updates (pending / confirmed / cancelled) |
| `/admin/settings` | Owner phone, notification email, social media URLs, password change |

### Other features

- **Booking system** — customers select a date and time slot (1:00 PM–9:45 PM, 15-min intervals) and submit a repair appointment; closed days are blocked automatically
- **Email notifications** — Supabase Edge Functions send formatted HTML emails via Resend when a booking or product inquiry is submitted
- **Image uploads** — product, special, repair, and tobacco images uploaded directly to Supabase Storage
- **WhatsApp button** — floating button with phone number fetched live from the settings table
- **SEO** — per-page `<title>` and `<meta>` tags via react-helmet-async
- **Mobile responsive** — fully responsive layout across all pages and the admin panel

---

## Supabase tables

```sql
-- Menu items
create table items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(10,2),
  category    text,
  image_url   text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Weekly specials
create table specials (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  sale_price     numeric(10,2),
  original_price numeric(10,2),
  image_url      text,
  active         boolean default true,
  created_at     timestamptz default now()
);

-- Announcements
create table announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  active     boolean default true,
  created_at timestamptz default now()
);

-- Store hours (one row per day of the week)
create table hours (
  id         uuid primary key default gen_random_uuid(),
  day        text not null unique,
  open_time  time,
  close_time time,
  is_closed  boolean default false
);

-- Electronics / phone products
create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(10,2),
  category    text,
  condition   text default 'new',
  image_url   text,
  in_stock    boolean default true,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Product inquiries (submitted from /electronics)
create table inquiries (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references products(id) on delete set null,
  product_name   text not null,
  customer_name  text not null,
  customer_phone text not null,
  message        text,
  status         text not null default 'new' check (status in ('new', 'read')),
  created_at     timestamptz default now()
);

-- Tobacco products
create table tobacco_products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  image_url  text,
  created_at timestamptz default now()
);

-- Repair services
create table repair_services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(10,2),
  duration    text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Repair media gallery
create table repair_media (
  id         uuid primary key default gen_random_uuid(),
  url        text not null,
  caption    text,
  created_at timestamptz default now()
);

-- Repair bookings (submitted from /repairs)
create table bookings (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null,
  customer_phone text not null,
  service_name   text not null,
  service_id     uuid references repair_services(id) on delete set null,
  booking_date   date not null,
  booking_time   time not null,
  notes          text,
  status         text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'cancelled')),
  created_at     timestamptz default now()
);

-- Key-value settings (phone, notification email, social links)
create table settings (
  key   text primary key,
  value text
);
```

### Row Level Security

```sql
-- Public-read tables
alter table items             enable row level security;
alter table specials          enable row level security;
alter table announcements     enable row level security;
alter table hours             enable row level security;
alter table products          enable row level security;
alter table tobacco_products  enable row level security;
alter table repair_services   enable row level security;
alter table repair_media      enable row level security;

create policy "Public read" on items            for select to anon using (true);
create policy "Admin all"   on items            for all    to authenticated using (true);

create policy "Public read" on specials         for select to anon using (true);
create policy "Admin all"   on specials         for all    to authenticated using (true);

create policy "Public read" on announcements    for select to anon using (true);
create policy "Admin all"   on announcements    for all    to authenticated using (true);

create policy "Public read" on hours            for select to anon using (true);
create policy "Admin all"   on hours            for all    to authenticated using (true);

create policy "Public read" on products         for select to anon using (true);
create policy "Admin all"   on products         for all    to authenticated using (true);

create policy "Public read" on tobacco_products for select to anon using (true);
create policy "Admin all"   on tobacco_products for all    to authenticated using (true);

create policy "Public read" on repair_services  for select to anon using (true);
create policy "Admin all"   on repair_services  for all    to authenticated using (true);

create policy "Public read" on repair_media     for select to anon using (true);
create policy "Admin all"   on repair_media     for all    to authenticated using (true);

-- Bookings: customers insert, admin manages
alter table bookings enable row level security;
create policy "Public insert" on bookings for insert to anon          with check (true);
create policy "Admin all"     on bookings for all    to authenticated using (true);

-- Inquiries: customers insert, admin manages
alter table inquiries enable row level security;
create policy "Public insert" on inquiries for insert to anon          with check (true);
create policy "Admin all"     on inquiries for all    to authenticated using (true);

-- Settings: public read (WhatsApp number, social links), admin write
alter table settings enable row level security;
create policy "Public read" on settings for select to anon          using (true);
create policy "Admin all"   on settings for all    to authenticated using (true);
```

### Storage bucket

Create a **public** bucket named `images` in Supabase Storage for all product, special, repair, and tobacco image uploads.

> Supabase Dashboard → Storage → New bucket → Name: `images` → Public: ✓

---

## Environment variables

Create a `.env` file in the project root. This file is gitignored — **never commit it**.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Both values are found in your Supabase project under **Settings → API**.

> `RESEND_API_KEY` is stored exclusively as a Supabase Edge Function secret and is never exposed to the browser or added to Vercel environment variables.

---

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Add environment variables (see above)
cp .env.example .env   # then fill in your values

# 3. Start the dev server
npm run dev
```

The site runs at `http://localhost:5173` by default.

---

## Deployment

### Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo
2. Set **Root Directory** to `unity-foods` (the folder containing `package.json`)
3. Vercel auto-detects Vite — build command `npm run build`, output directory `dist`
4. Add environment variables under **Settings → Environment Variables**:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon / public key |

The `vercel.json` in the repo configures SPA rewrites so refreshing any route returns the app instead of a 404:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Custom domain

1. In the Vercel project → **Settings → Domains** → add `unityfoodsmn.com`
2. Follow the DNS instructions to point your domain to Vercel
3. Vercel automatically provisions an SSL certificate

---

## Email notifications

Two Supabase Edge Functions send HTML email via [Resend](https://resend.com) whenever a customer submits a booking or product inquiry.

| Function | Trigger |
|---|---|
| `notify-booking` | Customer submits a repair booking on `/repairs` |
| `notify-inquiry` | Customer submits a product inquiry on `/electronics` |

Emails are sent from `Unity Foods <bookings@unityfoodsmn.com>` to the `owner_email` address configured in the admin settings.

### Deploy

```bash
cd unity-foods
npx supabase functions deploy notify-booking --project-ref prblfpgnwvrzafhovdkj
npx supabase functions deploy notify-inquiry --project-ref prblfpgnwvrzafhovdkj
```

### Set the Resend API key

```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx --project-ref prblfpgnwvrzafhovdkj
```

---

## Admin access

1. Go to **Supabase → Authentication → Users → Add user**
2. Create an account with your email and a strong password
3. Log in at `https://unityfoodsmn.com/admin/login`

There is no public sign-up. The admin panel is accessible only through accounts created directly in Supabase Auth.

---

## Clone note

This repo started as a copy of the Unity Foods codebase for a second, unrelated store (Rice St Market Wireless & Deli). As part of the clone:

- Brand colors and store name/address/phone are being updated for the new store.
- Supabase config, `.env` values, and Vercel/domain setup were **intentionally left untouched** — this clone still points at Unity Foods' infrastructure references throughout this README (project ref, `unityfoodsmn.com` domain, email sending address) until a dedicated Supabase project and Vercel deployment are provisioned for Rice St Market.
- The Tobacco page/admin screen are hidden behind a `SHOW_TOBACCO_PAGE` flag rather than removed.
