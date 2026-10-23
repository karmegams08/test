alter table public.community_feedback
  add column if not exists speed_range text,
  add column if not exists network_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_feedback_speed_range_check'
  ) then
    alter table public.community_feedback
      add constraint community_feedback_speed_range_check
      check (
        speed_range is null
        or speed_range in ('below_0_5', '0_5_to_1', '2_mbps', 'no_network')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_feedback_network_type_check'
  ) then
    alter table public.community_feedback
      add constraint community_feedback_network_type_check
      check (
        network_type is null
        or network_type in ('5g', '5g_plus', '5g_plus_plus')
      );
  end if;
end;
$$;