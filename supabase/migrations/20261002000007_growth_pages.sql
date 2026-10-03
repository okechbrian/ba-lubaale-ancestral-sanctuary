-- Growth pages: /for-groups (tour operators, retreat leaders) and /stories.
--
-- /for-groups content is an ordinary CMS block (settings key content:for_groups);
-- only its INQUIRIES need a table. /stories is a real table because posts have
-- slugs, cover images, draft/published state and their own sitemap entries.
--
-- RLS is enabled with no policies on both, exactly like every other table here:
-- only the service-role key (server code) can read or write.

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- lowercase kebab-case, unique: it is the public URL
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 200),
  -- shown on the index card and used as the meta description
  excerpt text not null check (length(excerpt) between 1 and 400),
  body text not null check (length(body) between 1 and 20000),
  -- /images/... or an https Supabase Storage URL (same rule as CMS images)
  cover_image text,
  cover_alt text,
  published boolean not null default false,
  -- set the first time a story goes live; drives JSON-LD datePublished and the
  -- sitemap's lastModified. Never back-dated by the app.
  published_at timestamptz,
  -- Optional byline. Left NULL the page credits the house voice, and JSON-LD
  -- omits the author field entirely rather than inventing one.
  author text
);

alter table public.stories enable row level security;

-- The public index reads only published stories, newest first.
create index stories_published_idx
  on public.stories (published_at desc)
  where published = true;

comment on table public.stories is
  'Owner-written stories for /stories. Drafts are invisible to the public listing, the post page and the sitemap.';

create table public.group_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 160),
  email text not null check (length(email) between 3 and 320),
  -- operator / retreat house / school: who is asking
  organisation text,
  group_size integer check (group_size is null or group_size between 1 and 500),
  -- free text: groups ask about seasons long before they know exact dates.
  -- (quoted: WINDOW is a reserved word in SQL.)
  "window" text,
  message text not null check (length(message) between 1 and 4000),
  handled boolean not null default false,
  handled_at timestamptz
);

alter table public.group_inquiries enable row level security;

create index group_inquiries_open_idx
  on public.group_inquiries (created_at desc)
  where handled = false;

comment on table public.group_inquiries is
  'Enquiries from /for-groups. No prices are stored or implied - groups are quoted in conversation.';