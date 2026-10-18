begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

create temporary table v3_fixture as
select private.canonical_tracker_state_v3('{
  "team": [{"id":"10000000-0000-4000-8000-000000000091", "extension":"keep", "members":[{"id":"25", "name":"Pikachu", "extension":7}]}],
  "graveyard": [
    {"id":"10000000-0000-4000-8000-000000000092", "members":[{"id":1,"nickname":""}]},
    {"id":"10000000-0000-4000-8000-000000000093", "members":[{"id":2,"nickname":"Named"}]},
    {"id":"10000000-0000-4000-8000-000000000094", "isLost":false,"members":[{"id":3}]}
  ],
  "fossils":[[{"fossilId":"helix-fossil"},{"fossilId":"helix-fossil"}]],
  "items":[[{"name":"Custom item"},{"name":"Custom item"}]],
  "rules":["First", "First", "Second"],
  "stats":{"runs":4,"deaths":[2],"extension":"keep"},
  "extension":{"keep":true}, "rivalCensorEnabled":false
}'::jsonb, 2, 1234567890000) as state;

select ok(private.tracker_state_v3_is_valid(state), 'migration produces a canonical document') from v3_fixture;
select is(state #>> '{team,0,id}', '10000000-0000-4000-8000-000000000091', 'UUIDs survive migration') from v3_fixture;
select is(state #> '{team,0,members,0,id}', '25'::jsonb, 'numeric string Pokemon IDs are converted once') from v3_fixture;
select is(state #>> '{team,0,members,0,nickname}', '', 'missing nickname has an explicit default') from v3_fixture;
select is(state #> '{graveyard,0,isLost}', 'true'::jsonb, 'missing lost flag inferred once') from v3_fixture;
select is(state #> '{graveyard,1,isLost}', 'false'::jsonb, 'named legacy graveyard member is a death') from v3_fixture;
select is(state #> '{graveyard,2,isLost}', 'false'::jsonb, 'explicit false wins over nickname inference') from v3_fixture;
select is(jsonb_array_length(state #> '{fossils,0}'), 2, 'physical fossil duplicates survive') from v3_fixture;
select is(jsonb_array_length(state #> '{items,0}'), 2, 'physical item duplicates survive') from v3_fixture;
select is(state -> 'rules', '["First","First","Second"]'::jsonb, 'rule order and duplicates survive') from v3_fixture;
select is(state #> '{stats,deaths}', '[2,0]'::jsonb, 'stats are padded without losing values') from v3_fixture;
select is(state #> '{stats,sumDeaths}', '[0,0]'::jsonb, 'missing stats arrays default to zero') from v3_fixture;
select is(state #> '{stats,runs}', '4'::jsonb, 'existing numeric stats survive') from v3_fixture;
select is(state -> 'runStartedAt', '1234567890000'::jsonb, 'missing timestamp uses tracker creation time') from v3_fixture;
select is(state ->> 'rivalCensorMode', 'off', 'legacy false becomes off') from v3_fixture;
select ok(not state ? 'rivalCensorEnabled', 'legacy flag is removed') from v3_fixture;
select is(state #>> '{team,0,extension}', 'keep', 'link extensions survive') from v3_fixture;
select is(state #> '{team,0,members,0,extension}', '7'::jsonb, 'member extensions survive') from v3_fixture;
select is(state #>> '{stats,extension}', 'keep', 'stats extensions survive') from v3_fixture;
select is(state -> 'extension', '{"keep":true}'::jsonb, 'root extensions survive') from v3_fixture;
select is(private.canonical_tracker_state_v3(state, 2, 999), state, 'canonicalization is idempotent') from v3_fixture;

select ok(private.tracker_state_v3_is_valid(private.canonical_tracker_state_v3('{}', n, 10)), 'defaults valid for player count ' || n) from generate_series(1,3) n;
select is(private.canonical_tracker_state_v3('{"rules":[]}', 1, 10) -> 'rules', '[]'::jsonb, 'explicit empty rules remain empty');
select ok(jsonb_array_length(private.canonical_tracker_state_v3('{}', 1, 10) -> 'rules') > 0, 'missing rules receive frozen defaults');
select is(private.canonical_tracker_state_v3('{"runStartedAt":42}', 1, 10) -> 'runStartedAt', '42'::jsonb, 'valid timestamp survives');
select is(private.canonical_tracker_state_v3('{"runStartedAt":null}', 1, 10) -> 'runStartedAt', '10'::jsonb, 'null timestamp uses creation time');
select is(private.canonical_tracker_state_v3('{"rivalCensorMode":"showLevels","rivalCensorEnabled":false}', 1, 10) ->> 'rivalCensorMode', 'showLevels', 'explicit valid mode takes precedence');
select is(private.canonical_tracker_state_v3('{"rivalCensorEnabled":true}', 1, 10) ->> 'rivalCensorMode', 'on', 'legacy true becomes on');
select is(private.canonical_tracker_state_v3('{}', 1, 10) ->> 'rivalCensorMode', 'on', 'missing censor mode defaults on');
select is(private.canonical_tracker_state_v3('{"rivalCensorMode":"invalid","rivalCensorEnabled":false}', 1, 10) ->> 'rivalCensorMode', 'off', 'invalid mode falls back to legacy boolean');
select is(private.canonical_tracker_state_v3('{"items":[[],[]],"stats":{"deaths":[3,0]}}', 1, 10) #> '{stats,deaths}', '[3]'::jsonb, 'only empty surplus slots are removed');
select throws_ok($$select private.canonical_tracker_state_v3('{"items":[[],[{"name":"Keep me"}]]}', 1, 10)$$, '22023', 'invalid_tracker_state at $.items[1]', 'populated surplus items abort');
select throws_ok($$select private.canonical_tracker_state_v3('{"stats":{"deaths":[0,2]}}', 1, 10)$$, '22023', 'invalid_tracker_state at $.stats.deaths[1]', 'nonzero surplus stats abort');
select throws_ok($$select private.canonical_tracker_state_v3('{"runStartedAt":"yesterday"}', 1, 10)$$, '22023', 'invalid_tracker_state at $.runStartedAt', 'malformed timestamp aborts');
select throws_ok($$select private.canonical_tracker_state_v3('{"items":[[false]]}', 1, 10)$$, '22023', 'invalid_tracker_state at $.items[0][0]', 'malformed entries abort rather than disappear');
select throws_ok($$select private.canonical_tracker_state_v3('{"rules":["Keep",42]}', 1, 10)$$, '22023', 'invalid_tracker_state at $.rules', 'malformed rules abort');
select ok(not private.tracker_state_v3_is_valid(state - 'runStartedAt'), 'writes cannot omit canonical fields') from v3_fixture;
select ok(not private.tracker_state_v3_is_valid(state #- '{graveyard,0,isLost}'), 'writes cannot infer lost status') from v3_fixture;
select ok(not private.tracker_state_v3_is_valid(state || '{"rivalCensorEnabled":false}'), 'writes reject deprecated fields') from v3_fixture;
select ok(not private.tracker_state_v3_is_valid(state || '{"playerNames":[]}'), 'writes reject relational metadata') from v3_fixture;
select ok(not private.tracker_state_v3_is_valid(jsonb_set(state, '{stats,deaths}', '["2",0]')), 'writes reject nonnumeric stats') from v3_fixture;

-- Exercise the actual row upgrader, including its version gate and diagnostics.
alter table public.tracker_states drop constraint tracker_state_v3_valid;
update public.tracker_states set state = '{"rules":[],"extension":"original"}', schema_version = 2
where tracker_id = '30000000-0000-0000-0000-000000000001';
create temporary table before_upgrade as select revision, updated_at from public.tracker_states where tracker_id = '30000000-0000-0000-0000-000000000001';
select lives_ok('select private.migrate_tracker_states_v3()', 'upgrades legacy rows');
select is(schema_version, 3, 'row receives v3') from public.tracker_states where tracker_id = '30000000-0000-0000-0000-000000000001';
select is(revision, (select revision + 1 from before_upgrade), 'migration increments revision once') from public.tracker_states where tracker_id = '30000000-0000-0000-0000-000000000001';
select is(s.state -> 'runStartedAt', to_jsonb(extract(epoch from t.created_at) * 1000), 'row upgrader uses actual creation time') from public.tracker_states s join public.trackers t on t.id = s.tracker_id where t.id = '30000000-0000-0000-0000-000000000001';
create temporary table after_upgrade as select * from public.tracker_states;
select lives_ok('select private.migrate_tracker_states_v3()', 'repeat upgrade succeeds');
select results_eq('select * from public.tracker_states order by tracker_id', 'select * from after_upgrade order by tracker_id', 'repeat upgrade leaves all columns unchanged');
update public.tracker_states set state = '{"runStartedAt":"bad"}', schema_version = 2 where tracker_id = '30000000-0000-0000-0000-000000000001';
select throws_ok('select private.migrate_tracker_states_v3()', '22023', 'Tracker 30000000-0000-0000-0000-000000000001: invalid_tracker_state at $.runStartedAt', 'unsafe upgrades include tracker ID and path');
update public.tracker_states s set state = a.state, schema_version = a.schema_version from after_upgrade a where s.tracker_id = a.tracker_id;
set constraints all immediate;
alter table public.tracker_states add constraint tracker_state_v3_valid check (schema_version = 3 and private.tracker_state_v3_is_valid(state));
set constraints all deferred;
select throws_ok($$update public.tracker_states set state = state - 'items' where tracker_id = '30000000-0000-0000-0000-000000000001'$$, '23514', null, 'direct invalid updates are rejected');
select throws_ok($$update public.tracker_states set schema_version = 2 where tracker_id = '30000000-0000-0000-0000-000000000001'$$, '23514', null, 'direct schema downgrade is rejected');

create function pg_temp.mismatch_players() returns void language plpgsql as $$
begin
  update public.trackers set player_names = array['Only one'] where id = '30000000-0000-0000-0000-000000000001';
  set constraints all immediate;
end;
$$;
select throws_ok('select pg_temp.mismatch_players()', '23514', null, 'metadata updates cannot leave mismatched arrays');
create function pg_temp.resize_players() returns void language plpgsql as $$
begin
  update public.trackers set player_names = array['Only one'] where id = '30000000-0000-0000-0000-000000000001';
  update public.tracker_states set state = private.canonical_tracker_state_v3(state, 1, 10) where tracker_id = '30000000-0000-0000-0000-000000000001';
  set constraints all immediate;
end;
$$;
select lives_ok('select pg_temp.resize_players()', 'deliberate atomic player resizing succeeds');
set constraints all deferred;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.create_tracker('Invalid', array['Red'], 'gen1_rb', false, null, '{}')$$, '22023', 'invalid_tracker_input', 'creation rejects incomplete states');
select throws_ok($$select public.update_tracker_state('30000000-0000-0000-0000-000000000001', 1, '{}')$$, '22023', 'invalid_tracker_state', 'state RPC rejects incomplete states');
select lives_ok($$select public.create_tracker('Canonical', array['Red','Blue'], 'gen1_rb', false, null, (select state from v3_fixture))$$, 'creation accepts canonical state');

select ok(private.tracker_state_v3_is_valid(private.canonical_tracker_state_v3('{"levelCaps":[{"id":1,"done":true}],"rivalCaps":[{"id":2,"revealed":true}]}', 1, 10)), 'legacy cap progress can omit template descriptions');
select ok(not private.tracker_state_v3_is_valid(jsonb_set(state, '{fossils,0,0,inBag}', '"true"')), 'fossil booleans are not coerced during writes') from v3_fixture;
select ok(not private.tracker_state_v3_is_valid(jsonb_set(state, '{items,0,0,used}', '1')), 'item booleans are not coerced during writes') from v3_fixture;
select ok(not private.tracker_state_v3_is_valid(jsonb_set(state, '{megaStoneSpriteStyle}', '"invalid"')), 'invalid sprite styles are rejected') from v3_fixture;
select ok(not private.tracker_state_v3_is_valid(jsonb_set(state, '{graveyard,0,id}', state #> '{team,0,id}')), 'duplicate UUIDs remain forbidden') from v3_fixture;
select throws_ok($$insert into public.tracker_states(tracker_id, state) values ('30000000-0000-0000-0000-000000000001', '{}')$$, '23514', null, 'direct incomplete inserts are rejected');
select lives_ok('set constraints all immediate', 'all created tracker rows satisfy deferred constraints');

select * from finish();
rollback;
