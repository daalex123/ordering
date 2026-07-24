-- Public bucket URLs work without a listing SELECT policy
drop policy if exists "Public read branding" on storage.objects;
