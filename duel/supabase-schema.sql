create schema if not exists ink_duel_private;
revoke all on schema ink_duel_private from public, anon, authenticated;
create table ink_duel_private.rooms (
  code text primary key,
  channel text not null,
  host_hash text not null,
  guest_hash text,
  host_seen timestamptz not null default now(),
  guest_seen timestamptz,
  quick boolean not null default false,
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table ink_duel_private.rooms enable row level security;
revoke all on ink_duel_private.rooms from public, anon, authenticated;
create function public.ink_duel_lobby(p_action text,p_token text,p_code text default '',p_mode text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r ink_duel_private.rooms%rowtype; h text; seat integer;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Session invalide'; end if;
  h:=encode(extensions.digest(p_token,'sha256'),'hex');
  if p_action='join' then
    perform pg_advisory_xact_lock(492810337);
    delete from ink_duel_private.rooms where created_at<now()-interval '20 minutes' or host_seen<now()-interval '45 seconds' or (closed and host_seen<now()-interval '30 seconds');
    select * into r from ink_duel_private.rooms where (host_hash=h or guest_hash=h) and not closed limit 1 for update;
    if r.code is null then
      if p_mode='quick' then
        select * into r from ink_duel_private.rooms where quick and guest_hash is null and not closed and host_seen>now()-interval '20 seconds' order by created_at limit 1 for update;
      elsif p_mode='join' then
        select * into r from ink_duel_private.rooms where code=upper(trim(p_code)) and not closed and host_seen>now()-interval '20 seconds' for update;
        if r.code is null then raise exception 'Salon introuvable ou expire'; end if;
        if r.guest_hash is not null then raise exception 'Salon complet'; end if;
      elsif p_mode<>'create' then raise exception 'Mode invalide'; end if;
      if r.code is not null then
        update ink_duel_private.rooms set guest_hash=h,guest_seen=now() where code=r.code returning * into r;
      else
        if (select count(*) from ink_duel_private.rooms where not closed)>=32 then raise exception 'Serveur complet, reessayez plus tard'; end if;
        insert into ink_duel_private.rooms(code,channel,host_hash,quick) values(upper(encode(extensions.gen_random_bytes(8),'hex')),encode(extensions.gen_random_bytes(32),'hex'),h,p_mode='quick') returning * into r;
      end if;
    end if;
  else
    select * into r from ink_duel_private.rooms where code=upper(trim(p_code)) and (host_hash=h or guest_hash=h) for update;
    if r.code is null then raise exception 'Session expiree'; end if;
    if r.closed or r.created_at<now()-interval '20 minutes' or r.host_seen<now()-interval '30 seconds' or (r.guest_hash is not null and r.guest_seen<now()-interval '30 seconds') then
      update ink_duel_private.rooms set closed=true where code=r.code;
      return jsonb_build_object('closed',true);
    end if;
    if p_action='leave' then update ink_duel_private.rooms set closed=true where code=r.code;return jsonb_build_object('closed',true); end if;
    if p_action not in ('status','ready') then raise exception 'Action invalide'; end if;
    update ink_duel_private.rooms set
      host_seen=case when host_hash=h then now() else host_seen end,
      guest_seen=case when guest_hash=h then now() else guest_seen end,
      host_ready=host_ready or (p_action='ready' and host_hash=h),
      guest_ready=guest_ready or (p_action='ready' and guest_hash=h)
    where code=r.code returning * into r;
  end if;
  seat:=case when r.host_hash=h then 0 else 1 end;
  return jsonb_build_object('code',r.code,'channel',r.channel,'seat',seat,'players',case when r.guest_hash is null then 1 else 2 end,'ready',jsonb_build_array(r.host_ready,r.guest_ready),'closed',r.closed);
end;
$$;
revoke all on function public.ink_duel_lobby(text,text,text,text) from public;
grant execute on function public.ink_duel_lobby(text,text,text,text) to anon, authenticated;
