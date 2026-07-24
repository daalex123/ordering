create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  -- Allow SQL editor / migrations to bootstrap the first admin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;
