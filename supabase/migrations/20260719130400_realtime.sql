do $$
begin
  alter publication supabase_realtime add table public.trackers;
  alter publication supabase_realtime add table public.tracker_members;
  alter publication supabase_realtime add table public.tracker_states;
  alter publication supabase_realtime add table public.rulesets;
exception when duplicate_object then
  null;
end;
$$;

