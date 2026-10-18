-- Compatibility belongs here, never in a client read or write trigger.
create or replace function private.v3_field(
  obj jsonb, key text, kind text, fallback jsonb, path text
) returns jsonb language plpgsql immutable set search_path = pg_catalog as $$
declare value jsonb := obj -> key;
begin
  if value is null or value = 'null'::jsonb then value := fallback; end if;
  if value is null or jsonb_typeof(value) is distinct from kind then
    raise exception using errcode = '22023', message = 'invalid_tracker_state at ' || path || '.' || key;
  end if;
  if kind = 'number' and abs((value #>> '{}')::numeric) > 1.7976931348623157e308 then
    raise exception using errcode = '22023', message = 'invalid_tracker_state at ' || path || '.' || key;
  end if;
  return value;
end;
$$;

create or replace function private.v3_record(value jsonb, kind text, path text)
returns jsonb language plpgsql immutable set search_path = pg_catalog as $$
declare
  result jsonb := value;
  key text;
  member jsonb;
  members jsonb := '[]';
  ordinal bigint;
  id_value jsonb;
begin
  if jsonb_typeof(value) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'invalid_tracker_state at ' || path;
  end if;
  foreach key in array case kind
    when 'pokemon' then array['name']
    when 'fossil' then array['location', 'pokemonName']
    when 'item' then array['name', 'location']
    else array['location'] end loop
    if result ? key then
      if result -> key = 'null'::jsonb then result := result - key;
      else perform private.v3_field(result, key, 'string', null, path); end if;
    end if;
  end loop;
  if kind in ('pokemon', 'fossil') then
    key := case when kind = 'pokemon' then 'id' else 'pokemonId' end;
    id_value := result -> key;
    if id_value is null or id_value = 'null'::jsonb or id_value = '""'::jsonb then
      id_value := 'null';
    elsif jsonb_typeof(id_value) = 'string' and (id_value #>> '{}') ~ '^[0-9]+$' then
      id_value := to_jsonb((id_value #>> '{}')::numeric);
    end if;
    if id_value <> 'null'::jsonb and
      (jsonb_typeof(id_value) <> 'number' or (id_value #>> '{}')::numeric <= 0) then
      raise exception using errcode = '22023', message = 'invalid_tracker_state at ' || path || '.' || key;
    end if;
    result := jsonb_set(result, array[key], id_value);
    if id_value <> 'null'::jsonb then perform private.v3_field(result, key, 'number', null, path); end if;
  end if;
  if kind = 'pokemon' then
    return result || jsonb_build_object('nickname', private.v3_field(result, 'nickname', 'string', '""', path));
  end if;
  result := result || jsonb_build_object('locationSlug', coalesce(nullif(result -> 'locationSlug', 'null'), 'null'::jsonb));
  if result -> 'locationSlug' <> 'null'::jsonb then
    perform private.v3_field(result, 'locationSlug', 'string', null, path);
  end if;
  if kind in ('link', 'graveyard') then
    perform private.v3_field(result, 'id', 'string', null, path);
    for member, ordinal in select x.value, x.ordinality from jsonb_array_elements(
      private.v3_field(result, 'members', 'array', '[]', path)
    ) with ordinality x loop
      members := members || jsonb_build_array(private.v3_record(member, 'pokemon', path || '.members[' || (ordinal - 1) || ']'));
    end loop;
    result := result || jsonb_build_object('members', members);
    if result ? 'fossilSlugs' then
      result := jsonb_set(result, '{fossilSlugs}', private.v3_field(result, 'fossilSlugs', 'array', '[]', path));
      if exists (select 1 from jsonb_array_elements(result -> 'fossilSlugs') x where jsonb_typeof(x) <> 'string') then
        raise exception using errcode = '22023', message = 'invalid_tracker_state at ' || path || '.fossilSlugs';
      end if;
    end if;
    if kind = 'graveyard' or result ? 'isLost' then
      result := result || jsonb_build_object('isLost', private.v3_field(result, 'isLost', 'boolean',
        to_jsonb(jsonb_array_length(members) > 0 and not exists (
          select 1 from jsonb_array_elements(members) m where btrim(m ->> 'nickname') <> ''
        )), path));
    end if;
  else
    result := result || jsonb_build_object('inBag', private.v3_field(result, 'inBag', 'boolean', 'false', path));
    key := case when kind = 'fossil' then 'revived' else 'used' end;
    result := result || jsonb_build_object(key, private.v3_field(result, key, 'boolean', 'false', path));
    if kind = 'fossil' then
      result := result || jsonb_build_object('fossilId', private.v3_field(result, 'fossilId', 'string', '""', path));
    elsif result ? 'id' then
      perform private.v3_field(result, 'id', 'string', null, path);
    end if;
  end if;
  return result;
end;
$$;

create or replace function private.canonical_tracker_state_v3(state jsonb, player_count integer, created_ms numeric)
returns jsonb language plpgsql immutable set search_path = pg_catalog as $$
declare
  result jsonb := state;
  key text;
  entry jsonb;
  cap jsonb;
  slot jsonb;
  output jsonb;
  nested jsonb;
  stats jsonb;
  ordinal bigint;
  inner_ordinal bigint;
  path text;
begin
  if jsonb_typeof(state) is distinct from 'object' or player_count is null or player_count not between 1 and 3 then
    raise exception using errcode = '22023', message = 'invalid_tracker_state at $';
  end if;
  if state ?| array['playerNames', 'rulesetId'] then
    raise exception using errcode = '22023', message = 'invalid_tracker_state at $.relational_metadata';
  end if;
  foreach key in array array['team', 'box', 'graveyard'] loop
    output := '[]';
    for entry, ordinal in select x.value, x.ordinality from jsonb_array_elements(private.v3_field(state, key, 'array', '[]', '$')) with ordinality x loop
      output := output || jsonb_build_array(private.v3_record(entry, case when key = 'graveyard' then 'graveyard' else 'link' end, '$.' || key || '[' || (ordinal - 1) || ']'));
    end loop;
    result := jsonb_set(result, array[key], output);
  end loop;
  if not private.tracker_link_ids_are_valid(result) then
    raise exception using errcode = '22023', message = 'invalid_tracker_state at $.link_ids';
  end if;
  foreach key in array array['fossils', 'items'] loop
    output := '[]';
    slot := private.v3_field(state, key, 'array', '[]', '$');
    for ordinal in 0..greatest(player_count, jsonb_array_length(slot)) - 1 loop
      path := '$.' || key || '[' || ordinal || ']';
      entry := coalesce(nullif(slot -> ordinal::integer, 'null'), '[]'::jsonb);
      if jsonb_typeof(entry) <> 'array' or (ordinal >= player_count and entry <> '[]'::jsonb) then
        raise exception using errcode = '22023', message = 'invalid_tracker_state at ' || path;
      end if;
      if ordinal >= player_count then continue; end if;
      nested := '[]';
      for cap, inner_ordinal in select x.value, x.ordinality from jsonb_array_elements(entry) with ordinality x loop
        nested := nested || jsonb_build_array(private.v3_record(cap, case when key = 'fossils' then 'fossil' else 'item' end, path || '[' || (inner_ordinal - 1) || ']'));
      end loop;
      output := output || jsonb_build_array(nested);
    end loop;
    result := jsonb_set(result, array[key], output);
  end loop;
  stats := private.v3_field(state, 'stats', 'object', '{}', '$');
  foreach key in array array['runs', 'best', 'legendaryEncounters'] loop
    stats := stats || jsonb_build_object(key, private.v3_field(stats, key, 'number', case when key = 'runs' then '1'::jsonb else '0'::jsonb end, '$.stats'));
  end loop;
  foreach key in array array['top4Items', 'deaths', 'sumDeaths'] loop
    slot := private.v3_field(stats, key, 'array', '[]', '$.stats');
    output := '[]';
    for ordinal in 0..greatest(player_count, jsonb_array_length(slot)) - 1 loop
      entry := coalesce(nullif(slot -> ordinal::integer, 'null'), '0'::jsonb);
      if jsonb_typeof(entry) <> 'number' or (ordinal >= player_count and entry <> '0'::jsonb) then
        raise exception using errcode = '22023', message = 'invalid_tracker_state at $.stats.' || key || '[' || ordinal || ']';
      end if;
      perform private.v3_field(jsonb_build_object('value', entry), 'value', 'number', null, '$.stats.' || key || '[' || ordinal || ']');
      if ordinal < player_count then output := output || jsonb_build_array(entry); end if;
    end loop;
    stats := jsonb_set(stats, array[key], output);
  end loop;
  result := jsonb_set(result, '{stats}', stats);
  foreach key in array array['legendaryTrackerEnabled', 'nicknamesEnabled', 'hardcoreModeEnabled', 'infiniteFossilsEnabled'] loop
    result := result || jsonb_build_object(key, private.v3_field(state, key, 'boolean', to_jsonb(key in ('legendaryTrackerEnabled', 'nicknamesEnabled')), '$'));
  end loop;
  result := result || jsonb_build_object('megaStoneSpriteStyle', private.v3_field(state, 'megaStoneSpriteStyle', 'string', '"item"', '$'));
  if result ->> 'megaStoneSpriteStyle' not in ('item', 'pokemon') then
    raise exception using errcode = '22023', message = 'invalid_tracker_state at $.megaStoneSpriteStyle';
  end if;
  result := result || jsonb_build_object('runStartedAt', private.v3_field(state, 'runStartedAt', 'number', to_jsonb(created_ms), '$'));
  if state ->> 'rivalCensorMode' in ('off', 'showLevels', 'on') then
    result := result || jsonb_build_object('rivalCensorMode', state -> 'rivalCensorMode');
  else
    result := result || jsonb_build_object('rivalCensorMode', case when state -> 'rivalCensorEnabled' = 'false'::jsonb then 'off' else 'on' end);
  end if;
  result := result - 'rivalCensorEnabled';
  -- Frozen defaults: later rule changes must not change this migration.
  result := result || jsonb_build_object('rules', private.v3_field(state, 'rules', 'array', '["Pro Route/Gebiet darf nur das erste Pokémon gefangen werden. Dieses Pokémon ist mit dem Pokémon des Partners verbunden.", "Pokémon, die bereits gefangen/encountered wurden (oder deren Evolutionsreihe) zählen nicht als Routen Pokémon und dürfen gererolled werden. Es gibt max. 2 weitere Versuche.", "Geschenkte/Statische Pokémon & Fossile gelten nicht als Gebietspokémon und dürfen verwendet werden (auch wenn bereits gefangen, auch mit Partner verbunden). Identische Statics & Fossile dürfen nur einmal verwendet werden.", "Wenn ein Pokémon beim Fangversuch flieht/stirbt, zählt das Gebiet als verloren. Der Seelenpartner muss freigelassen werden.", "Jedes Pokémon erhält einen Spitznamen, den der Seelenpartner auswählt.", "Besiegte Pokémon gelten als verstorben und müssen so wie ihr Seelenpartner in eine Grab-Box. (Wenn bereits im Kampf, Verwendung bis zum Ende)", "Pokémon, Items, und Trainer sind gerandomized.", "Der Bonusshop ist gerandomized, jedes Item darf max. 1 mal gekauft werden.", "Das Level-Cap darf nicht überschritten werden (1 Pokémon auf höherem Level, restliche auf niedrigerem wenn vorhanden). Überlevelte Pokémon sowie ihr Seelenpartner dürfen nicht verwendet werden, bis der Level-Cap wieder ansteigt.", "Sonderbonbons dürfen direkt VOR Arenaleiter/Top-4/Champion/Rivalen verwendet werden. Sie dürfen außerdem verwendet werden um Pokémon auf das Level-Cap der letzten Arena zu bringen.", "Kampffolge wird auf ''Folgen'' gestellt.", "Gegenstände im Kampf nur, wenn der Gegner auch einen verwendet. In der Top 4 max. 20 Items außerhalb von Kämpfen", "Shiny Pokémon dürfen immer gefangen und nach belieben ausgetauscht werden.", "Challenge verloren, wenn das komplette Team eines Spielers besiegt wurde.", "Challenge geschafft, wenn der Champ der Region besiegt wurde.", "Challenge startet sobald man die ersten Pokébälle erhalten hat.", "Kein Googlen während Arena/Top-4/Rivalen/Boss-Kämpfen", "Max. 2 legendäre Pokémon pro Team"]'::jsonb, '$'));
  if exists (select 1 from jsonb_array_elements(result -> 'rules') x where jsonb_typeof(x) <> 'string') then
    raise exception using errcode = '22023', message = 'invalid_tracker_state at $.rules';
  end if;
  foreach key in array array['levelCaps', 'rivalCaps'] loop
    output := '[]';
    for cap, ordinal in select x.value, x.ordinality from jsonb_array_elements(private.v3_field(state, key, 'array', '[]', '$')) with ordinality x loop
      path := '$.' || key || '[' || (ordinal - 1) || ']';
      if jsonb_typeof(cap) <> 'object' then
        raise exception using errcode = '22023', message = 'invalid_tracker_state at ' || path;
      end if;
      perform private.v3_field(cap, 'id', 'number', null, path);
      cap := cap || jsonb_build_object('level', private.v3_field(cap, 'level', 'string', '""', path));
      if key = 'levelCaps' then cap := cap || jsonb_build_object('arena', private.v3_field(cap, 'arena', 'string', '""', path));
      else
        cap := cap || jsonb_build_object('location', private.v3_field(cap, 'location', 'string', '""', path));
        if jsonb_typeof(cap -> 'rival') = 'object' then
          perform private.v3_field(cap -> 'rival', 'key', 'string', null, path || '.rival');
          entry := private.v3_field(cap -> 'rival', 'options', 'object', null, path || '.rival');
          perform private.v3_field(entry, 'male', 'string', null, path || '.rival.options');
          perform private.v3_field(entry, 'female', 'string', null, path || '.rival.options');
        else cap := cap || jsonb_build_object('rival', private.v3_field(cap, 'rival', 'string', '""', path)); end if;
        cap := cap || jsonb_build_object('revealed', private.v3_field(cap, 'revealed', 'boolean', 'false', path));
      end if;
      cap := cap || jsonb_build_object('done', private.v3_field(cap, 'done', 'boolean', 'false', path));
      output := output || jsonb_build_array(cap);
    end loop;
    result := jsonb_set(result, array[key], output);
  end loop;
  return result;
end;
$$;

-- Validation is intentionally independent of legacy conversion: no defaults,
-- nickname inference, numeric coercion or field deletion on the write path.
create or replace function private.tracker_state_v3_is_valid(state jsonb)
returns boolean language plpgsql immutable security definer set search_path = pg_catalog as $$
declare
  key text;
  entry jsonb;
  member jsonb;
  slot jsonb;
  value jsonb;
  stats jsonb;
  player_count integer;
begin
  if jsonb_typeof(state) is distinct from 'object'
    or state ?| array['playerNames', 'rulesetId', 'rivalCensorEnabled']
    or not private.tracker_link_ids_are_valid(state) then return false; end if;
  foreach key in array array['legendaryTrackerEnabled', 'nicknamesEnabled', 'hardcoreModeEnabled', 'infiniteFossilsEnabled'] loop
    perform private.v3_field(state, key, 'boolean', null, '$');
  end loop;
  perform private.v3_field(state, 'rivalCensorMode', 'string', null, '$');
  perform private.v3_field(state, 'megaStoneSpriteStyle', 'string', null, '$');
  if state ->> 'rivalCensorMode' not in ('off', 'showLevels', 'on')
    or state ->> 'megaStoneSpriteStyle' not in ('item', 'pokemon') then return false; end if;
  perform private.v3_field(state, 'runStartedAt', 'number', null, '$');
  value := private.v3_field(state, 'rules', 'array', null, '$');
  if exists (select 1 from jsonb_array_elements(value) x where jsonb_typeof(x) <> 'string') then return false; end if;
  foreach key in array array['team', 'box', 'graveyard'] loop
    for entry in select x from jsonb_array_elements(private.v3_field(state, key, 'array', null, '$')) x loop
      if not entry ? 'locationSlug' then return false; end if;
      if entry -> 'locationSlug' <> 'null'::jsonb then perform private.v3_field(entry, 'locationSlug', 'string', null, '$'); end if;
      if entry ? 'location' then perform private.v3_field(entry, 'location', 'string', null, '$'); end if;
      if entry ? 'fossilSlugs' then
        value := private.v3_field(entry, 'fossilSlugs', 'array', null, '$');
        if exists (select 1 from jsonb_array_elements(value) x where jsonb_typeof(x) <> 'string') then return false; end if;
      end if;
      if key = 'graveyard' or entry ? 'isLost' then perform private.v3_field(entry, 'isLost', 'boolean', null, '$'); end if;
      for member in select x from jsonb_array_elements(private.v3_field(entry, 'members', 'array', null, '$')) x loop
        if jsonb_typeof(member) is distinct from 'object' or not member ? 'id' then return false; end if;
        if member -> 'id' <> 'null'::jsonb then
          value := private.v3_field(member, 'id', 'number', null, '$');
          if (value #>> '{}')::numeric <= 0 then return false; end if;
        end if;
        perform private.v3_field(member, 'nickname', 'string', null, '$');
        if member ? 'name' then perform private.v3_field(member, 'name', 'string', null, '$'); end if;
      end loop;
    end loop;
  end loop;
  player_count := jsonb_array_length(private.v3_field(state, 'fossils', 'array', null, '$'));
  if player_count not between 1 and 3 then return false; end if;
  foreach key in array array['fossils', 'items'] loop
    value := private.v3_field(state, key, 'array', null, '$');
    if jsonb_array_length(value) <> player_count then return false; end if;
    for slot in select x from jsonb_array_elements(value) x loop
      if jsonb_typeof(slot) <> 'array' then return false; end if;
      for entry in select x from jsonb_array_elements(slot) x loop
        if jsonb_typeof(entry) <> 'object' or not entry ? 'locationSlug' then return false; end if;
        if entry -> 'locationSlug' <> 'null'::jsonb then perform private.v3_field(entry, 'locationSlug', 'string', null, '$'); end if;
        if entry ? 'location' then perform private.v3_field(entry, 'location', 'string', null, '$'); end if;
        perform private.v3_field(entry, 'inBag', 'boolean', null, '$');
        if key = 'fossils' then
          perform private.v3_field(entry, 'fossilId', 'string', null, '$');
          perform private.v3_field(entry, 'revived', 'boolean', null, '$');
          if not entry ? 'pokemonId' then return false; end if;
          if entry -> 'pokemonId' <> 'null'::jsonb then
            value := private.v3_field(entry, 'pokemonId', 'number', null, '$');
            if (value #>> '{}')::numeric <= 0 then return false; end if;
          end if;
          if entry ? 'pokemonName' then perform private.v3_field(entry, 'pokemonName', 'string', null, '$'); end if;
        else
          perform private.v3_field(entry, 'used', 'boolean', null, '$');
          if entry ? 'id' then perform private.v3_field(entry, 'id', 'string', null, '$'); end if;
          if entry ? 'name' then perform private.v3_field(entry, 'name', 'string', null, '$'); end if;
        end if;
      end loop;
    end loop;
  end loop;
  stats := private.v3_field(state, 'stats', 'object', null, '$');
  foreach key in array array['runs', 'best', 'legendaryEncounters'] loop
    perform private.v3_field(stats, key, 'number', null, '$.stats');
  end loop;
  foreach key in array array['top4Items', 'deaths', 'sumDeaths'] loop
    value := private.v3_field(stats, key, 'array', null, '$.stats');
    if jsonb_array_length(value) <> player_count then return false; end if;
    for entry in select x from jsonb_array_elements(value) x loop
      perform private.v3_field(jsonb_build_object('value', entry), 'value', 'number', null, '$.stats');
    end loop;
  end loop;
  foreach key in array array['levelCaps', 'rivalCaps'] loop
    for entry in select x from jsonb_array_elements(private.v3_field(state, key, 'array', null, '$')) x loop
      if jsonb_typeof(entry) <> 'object' then return false; end if;
      perform private.v3_field(entry, 'id', 'number', null, '$');
      perform private.v3_field(entry, 'level', 'string', null, '$');
      perform private.v3_field(entry, 'done', 'boolean', null, '$');
      if key = 'levelCaps' then perform private.v3_field(entry, 'arena', 'string', null, '$');
      else
        perform private.v3_field(entry, 'location', 'string', null, '$');
        perform private.v3_field(entry, 'revealed', 'boolean', null, '$');
        if jsonb_typeof(entry -> 'rival') = 'object' then
          perform private.v3_field(entry -> 'rival', 'key', 'string', null, '$');
          value := private.v3_field(entry -> 'rival', 'options', 'object', null, '$');
          perform private.v3_field(value, 'male', 'string', null, '$');
          perform private.v3_field(value, 'female', 'string', null, '$');
        else perform private.v3_field(entry, 'rival', 'string', null, '$'); end if;
      end if;
    end loop;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create or replace function private.migrate_tracker_states_v3()
returns void language plpgsql set search_path = pg_catalog as $$
declare row record; migrated jsonb;
begin
  -- Prevent a concurrent old-client save from being overwritten by an earlier
  -- snapshot while upgrading. Metadata fixes and state conversion are atomic.
  lock table public.trackers, public.tracker_states in share row exclusive mode;
  for row in select s.*, cardinality(t.player_names) as player_count, extract(epoch from t.created_at) * 1000 as created_ms
    from public.tracker_states s join public.trackers t on t.id = s.tracker_id where s.schema_version < 3
  loop
    begin
      migrated := private.canonical_tracker_state_v3(row.state, row.player_count, row.created_ms);
    exception when others then
      raise exception 'Tracker %: %', row.tracker_id, sqlerrm using errcode = '22023';
    end;
    update public.tracker_states set state = migrated, schema_version = 3, revision = revision + 1, updated_at = now()
    where tracker_id = row.tracker_id;
  end loop;
end;
$$;

select private.migrate_tracker_states_v3();

alter table public.tracker_states alter column schema_version set default 3;
alter table public.tracker_states drop constraint if exists tracker_state_v3_valid;
alter table public.tracker_states add constraint tracker_state_v3_valid
  check (schema_version = 3 and private.tracker_state_v3_is_valid(state));

create or replace function private.check_tracker_player_arrays()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare tracker uuid; state jsonb; player_count integer; key text;
begin
  if tg_table_name = 'trackers' then tracker := new.id;
  else tracker := new.tracker_id; end if;
  -- Serialize state and metadata checks for concurrent writers of one tracker.
  perform 1 from public.trackers where id = tracker for update;
  select s.state, cardinality(t.player_names) into state, player_count
    from public.trackers t join public.tracker_states s on s.tracker_id = t.id where t.id = tracker;
  if not found then return null; end if;
  foreach key in array array['fossils', 'items'] loop
    if jsonb_array_length(state -> key) <> player_count then
      raise exception 'Tracker %: invalid_tracker_state at $.%', tracker, key using errcode = '23514';
    end if;
  end loop;
  foreach key in array array['top4Items', 'deaths', 'sumDeaths'] loop
    if jsonb_array_length(state -> 'stats' -> key) <> player_count then
      raise exception 'Tracker %: invalid_tracker_state at $.stats.%', tracker, key using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;
drop trigger if exists tracker_state_player_arrays on public.tracker_states;
create constraint trigger tracker_state_player_arrays after insert or update on public.tracker_states
  deferrable initially deferred for each row execute function private.check_tracker_player_arrays();
drop trigger if exists tracker_metadata_player_arrays on public.trackers;
create constraint trigger tracker_metadata_player_arrays after update on public.trackers
  deferrable initially deferred for each row execute function private.check_tracker_player_arrays();

revoke all on function private.v3_field(jsonb, text, text, jsonb, text) from public;
revoke all on function private.v3_record(jsonb, text, text) from public;
revoke all on function private.canonical_tracker_state_v3(jsonb, integer, numeric) from public;
revoke all on function private.tracker_state_v3_is_valid(jsonb) from public;
revoke all on function private.check_tracker_player_arrays() from public;
revoke all on function private.migrate_tracker_states_v3() from public;

grant execute on function private.tracker_state_v3_is_valid(jsonb) to authenticated, service_role;

create or replace function public.update_tracker_state(
  p_tracker_id uuid,
  p_expected_revision bigint,
  p_state jsonb
)
returns public.tracker_states
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  updated_state public.tracker_states;
begin
  if not private.is_tracker_writer(p_tracker_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'tracker_write_access_required';
  end if;
  if jsonb_typeof(p_state) <> 'object'
    or p_state ?| array['playerNames', 'rulesetId']
    or not private.tracker_state_v3_is_valid(p_state)
  then
    raise exception using errcode = '22023', message = 'invalid_tracker_state';
  end if;

  update public.tracker_states
  set state = p_state,
      schema_version = 3,
      revision = revision + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where tracker_id = p_tracker_id
    and revision = p_expected_revision
  returning * into updated_state;

  if updated_state is null then
    raise sqlstate 'PT409' using message = 'state_revision_conflict';
  end if;
  return updated_state;
end;
$$;

create or replace function public.create_tracker(
  p_title text,
  p_player_names text[],
  p_game_version_id text,
  p_all_pokemon_and_items boolean,
  p_ruleset_id text,
  p_initial_state jsonb,
  p_invites jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  new_tracker_id uuid;
  invite jsonb;
  invite_email text;
  invite_role public.tracker_role;
  invite_user_id uuid;
  seen_emails text[] := '{}';
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if nullif(btrim(p_title), '') is null
    or cardinality(p_player_names) not between 1 and 3
    or exists (select 1 from unnest(p_player_names) as name where nullif(btrim(name), '') is null)
    or nullif(btrim(p_game_version_id), '') is null
    or not private.tracker_state_v3_is_valid(p_initial_state)
    or p_initial_state ?| array['playerNames', 'rulesetId']
    or jsonb_typeof(p_invites) <> 'array'
  then
    raise exception using errcode = '22023', message = 'invalid_tracker_input';
  end if;

  insert into public.trackers (
    title, player_names, created_by, game_version_id,
    all_pokemon_and_items, ruleset_id
  )
  values (
    btrim(p_title),
    array(select btrim(name) from unnest(p_player_names) as name),
    caller_id,
    btrim(p_game_version_id),
    coalesce(p_all_pokemon_and_items, false),
    nullif(btrim(p_ruleset_id), '')
  )
  returning id into new_tracker_id;

  insert into public.tracker_members (tracker_id, user_id, role)
  values (new_tracker_id, caller_id, 'owner');

  for invite in select value from jsonb_array_elements(p_invites)
  loop
    invite_email := lower(btrim(invite ->> 'email'));
    if invite_email = '' or invite_email = any(seen_emails) then
      raise exception using errcode = '22023', message = 'invalid_or_duplicate_invite';
    end if;
    seen_emails := array_append(seen_emails, invite_email);

    begin
      invite_role := (invite ->> 'role')::public.tracker_role;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'invalid_invite_role';
    end;
    if invite_role not in ('editor', 'guest') then
      raise exception using errcode = '22023', message = 'invalid_invite_role';
    end if;

    select app_user.id into invite_user_id
    from auth.users as app_user
    where lower(app_user.email) = invite_email
    limit 1;
    if invite_user_id is null then
      raise exception using errcode = 'P0001', message = 'invite_user_not_found';
    end if;
    if invite_user_id = caller_id then
      raise exception using errcode = '22023', message = 'owner_cannot_be_invited';
    end if;

    insert into public.tracker_members (tracker_id, user_id, role)
    values (new_tracker_id, invite_user_id, invite_role);
  end loop;

  insert into public.tracker_states (tracker_id, state, updated_by)
  values (new_tracker_id, p_initial_state, caller_id);

  return new_tracker_id;
end;
$$;

