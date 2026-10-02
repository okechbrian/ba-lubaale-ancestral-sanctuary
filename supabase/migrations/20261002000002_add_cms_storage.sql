-- Public photo library for the owner CMS (`/admin/content` uploads).
-- Writes go through the admin upload API only (service-role key); there are
-- deliberately no storage.objects policies, so anon/authenticated cannot write.
-- Public read is served by the bucket's public URL endpoint.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms',
  'cms',
  true,
  8388608, -- 8 MB, matches the API's pre-upload limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
