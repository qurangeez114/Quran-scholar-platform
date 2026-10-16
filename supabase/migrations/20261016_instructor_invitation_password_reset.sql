-- A successful Supabase Auth password reset is also a valid first password change.
-- Do NOT clear the gate on login, email change, or user_metadata edits.
-- Trigger executes only on a change in the stored password hash.
create or replace function qh_lms_private.clear_password_gate_after_auth_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password
     and new.encrypted_password is not null then
    update public.qh_lms_accounts
       set must_change_password = false
     where user_id = new.id and must_change_password = true;
  end if;
  return new;
end
$$;

revoke all on function qh_lms_private.clear_password_gate_after_auth_change() from public, anon, authenticated;

drop trigger if exists qh_lms_clear_password_gate_after_change on auth.users;
create trigger qh_lms_clear_password_gate_after_change
after update of encrypted_password on auth.users
for each row
when (old.encrypted_password is distinct from new.encrypted_password)
execute function qh_lms_private.clear_password_gate_after_auth_change();
