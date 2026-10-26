create table if not exists public.learning_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('cards','reviews','sessions','settings','collections')),
  entity_id text not null check (length(entity_id) between 1 and 200),
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'id' = entity_id),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, entity_id)
);
alter table public.learning_records enable row level security;
alter table public.learning_records force row level security;
drop policy if exists own_records on public.learning_records;
create policy own_records on public.learning_records for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.learning_records from anon, authenticated;
grant select on public.learning_records to authenticated;

create or replace function public.put_learning_record(p_owner uuid, p_kind text, p_entity_id text, p_expected_revision bigint, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  current_record public.learning_records;
begin
  if caller is null or caller is distinct from p_owner then raise exception 'Authentication required for this owner'; end if;
  if p_kind not in ('cards','reviews','sessions','settings','collections') or p_kind is null
    or p_expected_revision is null or p_expected_revision < 0
    or p_entity_id is null or length(p_entity_id) not between 1 and 200
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or p_payload->>'id' is distinct from p_entity_id
    or octet_length(p_payload::text) > 1000000 then raise exception 'Invalid payload'; end if;
  if p_expected_revision = 0 then
    insert into public.learning_records(user_id,kind,entity_id,payload)
    values(caller,p_kind,p_entity_id,p_payload) on conflict do nothing returning * into current_record;
    if found then return jsonb_build_object('accepted',true,'record',to_jsonb(current_record)); end if;
  end if;
  select * into current_record from public.learning_records
  where user_id=caller and kind=p_kind and entity_id=p_entity_id for update;
  if not found then return jsonb_build_object('accepted',false,'record',null); end if;
  if current_record.revision <> p_expected_revision then
    return jsonb_build_object('accepted',false,'record',to_jsonb(current_record));
  end if;
  update public.learning_records set payload=p_payload,revision=revision+1,updated_at=now()
  where user_id=caller and kind=p_kind and entity_id=p_entity_id returning * into current_record;
  return jsonb_build_object('accepted',true,'record',to_jsonb(current_record));
end;
$$;
revoke all on function public.put_learning_record(uuid,text,text,bigint,jsonb) from public, anon;
grant execute on function public.put_learning_record(uuid,text,text,bigint,jsonb) to authenticated;