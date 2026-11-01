-- Afterlife data is isolated from the project's existing applications.
create table public.afterlife_players (
 id uuid primary key default gen_random_uuid(), nickname text not null check (char_length(nickname) between 1 and 24),
 kind text not null check (kind in ('pumpkin','ghost','reaper')), title text not null, color text not null default '#f49a35',
 assignment_source text not null default 'party_draw', portrait_url text, portrait_status text not null default 'none',
 x real not null default 0 check(x between -48 and 48), z real not null default 14 check(z between -18 and 48),
 heading real not null default 0, sequence bigint not null default 0,
 emote text not null default 'idle' check(emote in ('idle','dance','wave','boo')), emote_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index afterlife_players_updated on public.afterlife_players(updated_at);
create table public.afterlife_sessions (
 player_id uuid primary key references public.afterlife_players(id) on delete cascade,
 token_hash text not null unique, ip_hash text not null, image_state text not null default 'none',
 created_at timestamptz not null default now()
);
create index afterlife_sessions_ip on public.afterlife_sessions(ip_hash,created_at);
create table public.afterlife_events (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('pumpkin_rain','ghost_dance','monster_election')),
 title text not null, message text not null, source text not null,
 starts_at timestamptz not null default now(), expires_at timestamptz not null
);
create table public.afterlife_state (
 id text primary key default 'plaza' check(id='plaza'), next_event_at timestamptz not null default now()+interval '90 seconds',
 tick_locked_until timestamptz not null default now(), event_id uuid references public.afterlife_events(id),
 portrait_count integer not null default 0
);
insert into public.afterlife_state(id) values('plaza');
create table public.afterlife_votes (
 event_id uuid references public.afterlife_events(id) on delete cascade,
 player_id uuid references public.afterlife_players(id) on delete cascade,
 candidate text not null check(candidate in ('pumpkin','ghost','reaper')),
 primary key(event_id,player_id)
);
-- Visitors can read the public world; only the Edge Function can mutate it.
alter table public.afterlife_players enable row level security;
alter table public.afterlife_sessions enable row level security;
alter table public.afterlife_events enable row level security;
alter table public.afterlife_state enable row level security;
alter table public.afterlife_votes enable row level security;
revoke all on public.afterlife_players,public.afterlife_sessions,public.afterlife_events,public.afterlife_state,public.afterlife_votes from anon,authenticated;
grant select on public.afterlife_players,public.afterlife_events,public.afterlife_state,public.afterlife_votes to anon,authenticated;
grant all on public.afterlife_players,public.afterlife_sessions,public.afterlife_events,public.afterlife_state,public.afterlife_votes to service_role;
create policy afterlife_public_players on public.afterlife_players for select to anon,authenticated using(updated_at > now()-interval '10 minutes');
create policy afterlife_public_events on public.afterlife_events for select to anon,authenticated using(starts_at > now()-interval '1 day');
create policy afterlife_public_state on public.afterlife_state for select to anon,authenticated using(true);
create policy afterlife_public_votes on public.afterlife_votes for select to anon,authenticated using(true);
-- Invoker functions run only as service_role. No anonymous privileged RPCs.
create function public.afterlife_claim_tick() returns boolean language sql set search_path='' as $$
 with claimed as (update public.afterlife_state set tick_locked_until=now()+interval '40 seconds'
 where id='plaza' and next_event_at<=now() and tick_locked_until<=now() returning id)
 select exists(select 1 from claimed);
$$;
create function public.afterlife_claim_portrait(p_player uuid,p_limit integer) returns boolean language plpgsql set search_path='' as $$
begin
 perform 1 from public.afterlife_state where id='plaza' for update;
 if (select portrait_count >= p_limit from public.afterlife_state where id='plaza') then return false; end if;
 update public.afterlife_sessions set image_state='pending' where player_id=p_player and image_state='none';
 if not found then return false; end if;
 update public.afterlife_state set portrait_count=portrait_count+1 where id='plaza';
 return true;
end;
$$;
revoke all on function public.afterlife_claim_tick(),public.afterlife_claim_portrait(uuid,integer) from public,anon,authenticated;
grant execute on function public.afterlife_claim_tick(),public.afterlife_claim_portrait(uuid,integer) to service_role;
alter publication supabase_realtime add table public.afterlife_players,public.afterlife_events,public.afterlife_votes;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('afterlife-portraits','afterlife-portraits',true,5242880,array['image/webp','image/png','image/jpeg']) on conflict(id) do nothing;
