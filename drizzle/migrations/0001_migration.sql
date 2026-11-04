create or replace function public.create_invite(_group uuid, _days int default 7, _max_uses int default 1)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare c text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if not public.is_group_organizer(_group, auth.uid()) then raise exception 'Only the organizer can invite'; end if;
  if _days < 1 or _days > 30 then raise exception 'Expiry must be 1-30 days'; end if;
  loop
    c := '';
    for i in 1..12 loop c := c || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1),0) % 32), 1); end loop;
    exit when not exists (select 1 from public.group_invites where code=c);
  end loop;
  insert into public.group_invites(group_id, code, created_by, expires_at, max_uses)
  values (_group, c, auth.uid(), now() + make_interval(days => _days), greatest(1, least(_max_uses, 100)));
  perform public._log(_group, 'invite_created', 'invite', null, jsonb_build_object('expires_days', _days));
  return c;
end $$;
revoke execute on function public.create_invite(uuid,int,int) from anon;