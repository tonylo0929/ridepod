-- RidePod proof file storage foundation.
-- Proof files are private and scoped to one ride instance.
-- Frontend upload wiring stays disabled until the Supabase Storage adapter is implemented.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ridepod-proofs',
  'ridepod-proofs',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.ridepod_proof_object_ride_instance_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public, storage
as $$
declare
  folders text[] := storage.foldername(object_name);
  ride_instance_id_text text;
begin
  if coalesce(array_length(folders, 1), 0) <> 3 then
    return null;
  end if;

  if folders[1] <> 'ride-instances' then
    return null;
  end if;

  if folders[3] not in ('QUOTE_SCREENSHOT', 'FINAL_RECEIPT', 'METER_PROOF') then
    return null;
  end if;

  ride_instance_id_text := folders[2];

  if ride_instance_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;

  return ride_instance_id_text::uuid;
end;
$$;

create or replace function public.ridepod_is_valid_proof_storage_path(object_name text)
returns boolean
language sql
immutable
set search_path = public, storage
as $$
  select public.ridepod_proof_object_ride_instance_id(object_name) is not null
    and nullif(storage.filename(object_name), '') is not null;
$$;

create or replace function public.ridepod_can_host_storage_ride_instance(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from ride_instances
    where ride_instances.id = public.ridepod_proof_object_ride_instance_id(object_name)
      and public.is_pod_host(ride_instances.pod_id)
  );
$$;

drop policy if exists "RidePod hosts can upload proof files" on storage.objects;
create policy "RidePod hosts can upload proof files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ridepod-proofs'
  and public.ridepod_is_valid_proof_storage_path(name)
  and public.ridepod_can_host_storage_ride_instance(name)
);

drop policy if exists "RidePod hosts can read own proof files" on storage.objects;
create policy "RidePod hosts can read own proof files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ridepod-proofs'
  and public.ridepod_can_host_storage_ride_instance(name)
);

drop policy if exists "RidePod admins can read proof files" on storage.objects;
create policy "RidePod admins can read proof files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ridepod-proofs'
  and public.is_admin()
);

-- Guests intentionally do not get raw proof file access in this MVP storage slice.
-- Existing table RLS can expose proof metadata/status. Add signed preview URLs later if product policy allows.
-- TODO SQL-2L: Implement signed upload/read URLs and decide if guests can preview raw proof files.
-- TODO: Add storage_path/provider columns to proofs in a later schema cleanup if file_url becomes too ambiguous.
