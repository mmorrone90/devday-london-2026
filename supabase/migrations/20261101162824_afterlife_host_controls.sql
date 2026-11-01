alter table public.afterlife_sessions add column is_host boolean not null default false;
alter table public.afterlife_state add column overlord_paused boolean not null default false, add column control_revision integer not null default 0;
create or replace function public.afterlife_claim_tick() returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update afterlife_state set tick_locked_until=now()+interval '40 seconds' where id='plaza' and not overlord_paused and next_event_at<=now() and tick_locked_until<=now();
 return found;
end; $$;
create function public.afterlife_set_paused(p_paused boolean) returns void language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from afterlife_state where id='plaza' for update;
 update afterlife_state set overlord_paused=p_paused,control_revision=control_revision+1,event_id=null,next_event_at=now()+interval '20 seconds',tick_locked_until=now() where id='plaza';
 if p_paused then update afterlife_events set expires_at=now() where expires_at>now(); end if;
end; $$;
create function public.afterlife_publish_event(p_revision integer,p_kind text,p_title text,p_message text,p_source text) returns jsonb language plpgsql security invoker set search_path=public as $$
declare s afterlife_state%rowtype; e afterlife_events%rowtype;
begin
 select * into s from afterlife_state where id='plaza' for update;
 if s.overlord_paused or s.control_revision<>p_revision then return null; end if;
 insert into afterlife_events(kind,title,message,source,starts_at,expires_at) values(p_kind,p_title,p_message,p_source,now(),now()+interval '15 seconds') returning * into e;
 update afterlife_state set event_id=e.id,next_event_at=now()+interval '20 seconds',tick_locked_until=now() where id='plaza';
 return to_jsonb(e);
end; $$;
revoke all on function public.afterlife_set_paused(boolean),public.afterlife_publish_event(integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.afterlife_set_paused(boolean),public.afterlife_publish_event(integer,text,text,text,text) to service_role;
alter publication supabase_realtime add table public.afterlife_state;
