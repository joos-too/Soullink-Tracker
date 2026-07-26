-- Local development fixtures only. Never apply this file to staging or production.
begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'test@example.com',
    extensions.crypt('testpassword123', extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '2026-01-01 12:00:00+00', now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'editor@example.com',
    extensions.crypt('testpassword123', extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '2026-01-01 12:00:00+00', now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'guest@example.com',
    extensions.crypt('testpassword123', extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '2026-01-01 12:00:00+00', now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'unrelated@example.com',
    extensions.crypt('testpassword123', extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '2026-01-01 12:00:00+00', now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  ('20000000-0000-0000-0000-00000000000' || seed.ordinal)::uuid,
  seed.user_id,
  seed.user_id::text,
  jsonb_build_object('sub', seed.user_id::text, 'email', seed.email),
  'email',
  now(),
  now(),
  now()
from (
  values
    (1, '10000000-0000-0000-0000-000000000001'::uuid, 'test@example.com'),
    (2, '10000000-0000-0000-0000-000000000002'::uuid, 'editor@example.com'),
    (3, '10000000-0000-0000-0000-000000000003'::uuid, 'guest@example.com'),
    (4, '10000000-0000-0000-0000-000000000004'::uuid, 'unrelated@example.com')
) as seed(ordinal, user_id, email)
on conflict (provider_id, provider) do nothing;

update public.profiles
set
  display_name = case
    when id = '10000000-0000-0000-0000-000000000001'::uuid then 'Test Trainer'
    when id = '10000000-0000-0000-0000-000000000002'::uuid then 'Editor Erika'
    when id = '10000000-0000-0000-0000-000000000003'::uuid then 'Guest Gary'
    else 'Unrelated User'
  end,
  display_name_requires_update = false,
  multi_locale_search = id in (
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid
  ),
  use_generation_sprites = id = '10000000-0000-0000-0000-000000000001'::uuid,
  use_sprites_in_team_table = id = '10000000-0000-0000-0000-000000000001'::uuid,
  wiki_id = case
    when id = '10000000-0000-0000-0000-000000000001'::uuid then 'pokewiki'
      end;

insert into public.trackers (
  id,
  title,
  player_names,
  created_by,
  created_at,
  game_version_id,
  is_public,
  all_pokemon_and_items,
  ruleset_id
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'Pokémon Blue Soullink',
    array['Player 1', 'Player 2'],
    '10000000-0000-0000-0000-000000000001',
    '2026-02-27T00:00:00.000Z',
    'gen1_rb',
    true,
    false,
    'default_duo_ruleset'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Pokémon Platinum Soullink',
    array['Player 1', 'Player 2'],
    '10000000-0000-0000-0000-000000000001',
    '2026-09-13T00:00:00.000Z',
    'gen4_pt',
    false,
    false,
    'default_duo_ruleset'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Pokémon Black Soullink',
    array['Player 1', 'Player 2'],
    '10000000-0000-0000-0000-000000000001',
    '2026-09-18T00:00:00.000Z',
    'gen5_bw',
    false,
    false,
    'default_duo_ruleset'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    'Pokémon Alpha Sapphire Soullink',
    array['Player 1', 'Player 2'],
    '10000000-0000-0000-0000-000000000001',
    '2025-11-21T00:00:00.000Z',
    'gen6_oras',
    false,
    false,
    'default_duo_ruleset'
  );

-- The additional editor/guest rows and public Gen 1 tracker are Supabase-only
-- access-control fixtures. Tracker metadata and gameplay state mirror the
-- Firebase emulator fixtures.
insert into public.tracker_members (tracker_id, user_id, role, settings)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', '{"rivalPreferences":{"blue":"male"}}'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'editor', '{}'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'guest', '{}'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'owner', '{}'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'owner', '{}'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'owner', '{}');

insert into public.tracker_states (
  tracker_id,
  state,
  schema_version,
  revision,
  updated_by
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    $state${
  "team": [
    {
      "id": 1,
      "locationSlug": "kanto-route-1",
      "members": [
        {
          "id": 16,
          "nickname": "Gust"
        },
        {
          "id": 19,
          "nickname": "Ratty"
        }
      ]
    },
    {
      "id": 2,
      "locationSlug": "kanto-route-2",
      "members": [
        {
          "id": 10,
          "nickname": "Crawler"
        },
        {
          "id": 13,
          "nickname": "Stinger"
        }
      ]
    },
    {
      "id": 3,
      "locationSlug": "viridian-forest",
      "members": [
        {
          "id": 25,
          "nickname": "Sparky"
        },
        {
          "id": 27,
          "nickname": "Sandy"
        }
      ]
    }
  ],
  "box": [
    {
      "id": 4,
      "locationSlug": "kanto-route-3",
      "members": [
        {
          "id": 12,
          "nickname": "Flutter"
        },
        {
          "id": 14,
          "nickname": "Cocoon"
        }
      ]
    },
    {
      "id": 5,
      "locationSlug": "kanto-route-4",
      "members": [
        {
          "id": 129,
          "nickname": "Splashy"
        },
        {
          "id": 41,
          "nickname": "Fang"
        }
      ]
    }
  ],
  "graveyard": [
    {
      "id": 6,
      "locationSlug": "mt-moon",
      "members": [
        {
          "id": 74,
          "nickname": "Boulder"
        },
        {
          "id": 35,
          "nickname": "Moony"
        }
      ]
    },
    {
      "id": 7,
      "locationSlug": "rock-tunnel",
      "members": [
        {
          "id": 66,
          "nickname": "Flex"
        },
        {
          "id": 95,
          "nickname": "Slither"
        }
      ]
    },
    {
      "id": 8,
      "locationSlug": "pokemon-tower",
      "members": [
        {
          "id": 92,
          "nickname": ""
        },
        {
          "id": 104,
          "nickname": ""
        }
      ],
      "isLost": true
    }
  ],
  "rules": [
    "Pro Route/Gebiet darf nur das erste Pokémon gefangen werden. Dieses Pokémon ist mit dem Pokémon des Partners verbunden.",
    "Pokémon, die bereits gefangen/encountered wurden (oder deren Evolutionsreihe) zählen nicht als Routen Pokémon und dürfen gererolled werden. Es gibt max. 2 weitere Versuche.",
    "Geschenkte/Statische Pokémon & Fossile gelten nicht als Gebietspokémon und dürfen verwendet werden (auch wenn bereits gefangen, auch mit Partner verbunden). Identische Statics & Fossile dürfen nur einmal verwendet werden.",
    "Wenn ein Pokémon beim Fangversuch flieht/stirbt, zählt das Gebiet als verloren. Der Seelenpartner muss freigelassen werden.",
    "Jedes Pokémon erhält einen Spitznamen, den der Seelenpartner auswählt.",
    "Besiegte Pokémon gelten als verstorben und müssen so wie ihr Seelenpartner in eine Grab-Box. (Wenn bereits im Kampf, Verwendung bis zum Ende)",
    "Pokémon, Items, und Trainer sind gerandomized.",
    "Der Bonusshop ist gerandomized, jedes Item darf max. 1 mal gekauft werden.",
    "Das Level-Cap darf nicht überschritten werden (1 Pokémon auf höherem Level, restliche auf niedrigerem wenn vorhanden). Überlevelte Pokémon sowie ihr Seelenpartner dürfen nicht verwendet werden, bis der Level-Cap wieder ansteigt.",
    "Sonderbonbons dürfen direkt VOR Arenaleiter/Top-4/Champion/Rivalen verwendet werden. Sie dürfen außerdem verwendet werden um Pokémon auf das Level-Cap der letzten Arena zu bringen.",
    "Kampffolge wird auf 'Folgen' gestellt.",
    "Gegenstände im Kampf nur, wenn der Gegner auch einen verwendet. In der Top 4 max. 20 Items außerhalb von Kämpfen",
    "Shiny Pokémon dürfen immer gefangen und nach belieben ausgetauscht werden.",
    "Challenge verloren, wenn das komplette Team eines Spielers besiegt wurde.",
    "Challenge geschafft, wenn der Champ der Region besiegt wurde.",
    "Challenge startet sobald man die ersten Pokébälle erhalten hat.",
    "Kein Googlen während Arena/Top-4/Rivalen/Boss-Kämpfen",
    "Max. 2 legendäre Pokémon pro Team"
  ],
  "levelCaps": [
    {
      "id": 1,
      "arena": "gym_1",
      "level": "14/12",
      "done": true
    },
    {
      "id": 2,
      "arena": "gym_2",
      "level": "21/18",
      "done": true
    },
    {
      "id": 3,
      "arena": "gym_3",
      "level": "24/21",
      "done": true
    },
    {
      "id": 4,
      "arena": "gym_4",
      "level": "29/24",
      "done": true
    },
    {
      "id": 5,
      "arena": "gym_5",
      "level": "43/39",
      "done": true
    },
    {
      "id": 6,
      "arena": "gym_6",
      "level": "43/38",
      "done": true
    },
    {
      "id": 7,
      "arena": "gym_7",
      "level": "47/42",
      "done": true
    },
    {
      "id": 8,
      "arena": "gym_8",
      "level": "50/45",
      "done": true
    },
    {
      "id": 9,
      "arena": "elite_four_lorelei",
      "level": "56/54",
      "done": true
    },
    {
      "id": 10,
      "arena": "elite_four_bruno",
      "level": "58/56",
      "done": true
    },
    {
      "id": 11,
      "arena": "elite_four_agatha",
      "level": "60/58",
      "done": true
    },
    {
      "id": 12,
      "arena": "elite_four_lance",
      "level": "62/60",
      "done": true
    },
    {
      "id": 13,
      "arena": "champion_blue",
      "level": "65/63",
      "done": true
    }
  ],
  "rivalCaps": [
    {
      "id": 1,
      "location": "route_22",
      "rival": "blue",
      "level": "9/8",
      "done": true,
      "revealed": true
    },
    {
      "id": 2,
      "location": "cerulean_city",
      "rival": "blue",
      "level": "18/17",
      "done": true,
      "revealed": true
    },
    {
      "id": 3,
      "location": "s_s_anne",
      "rival": "blue",
      "level": "20/19",
      "done": true,
      "revealed": true
    },
    {
      "id": 4,
      "location": "pokemon_tower",
      "rival": "blue",
      "level": "25/23",
      "done": true,
      "revealed": true
    },
    {
      "id": 5,
      "location": "silph_co",
      "rival": "blue",
      "level": "40/38",
      "done": true,
      "revealed": true
    },
    {
      "id": 6,
      "location": "route_22",
      "rival": "blue",
      "level": "53/50",
      "done": true,
      "revealed": true
    }
  ],
  "stats": {
    "runs": 42,
    "best": 0,
    "top4Items": [
      0,
      0
    ],
    "deaths": [
      1,
      1
    ],
    "sumDeaths": [
      55,
      62
    ],
    "legendaryEncounters": 132
  },
  "legendaryTrackerEnabled": true,
  "rivalCensorMode": "off",
  "hardcoreModeEnabled": false,
  "nicknamesEnabled": true,
  "infiniteFossilsEnabled": false,
  "megaStoneSpriteStyle": "item",
  "fossils": [
    [
      {
        "fossilId": "old-amber",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      },
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      }
    ],
    [
      {
        "fossilId": "dome-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      },
      {
        "fossilId": "old-amber",
        "location": "",
        "locationSlug": "pewter-city",
        "inBag": false,
        "revived": false
      }
    ]
  ],
  "items": [
    [
      {
        "id": "fire-stone",
        "location": "",
        "locationSlug": "celadon-city",
        "inBag": true,
        "used": true
      },
      {
        "id": "water-stone",
        "location": "",
        "locationSlug": "celadon-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "thunder-stone",
        "location": "",
        "locationSlug": "celadon-city",
        "inBag": true,
        "used": true
      },
      {
        "id": "moon-stone",
        "location": "",
        "locationSlug": "pewter-city",
        "inBag": true,
        "used": false
      }
    ],
    [
      {
        "id": "leaf-stone",
        "location": "",
        "locationSlug": "celadon-city",
        "inBag": true,
        "used": true
      },
      {
        "id": "fire-stone",
        "location": "",
        "locationSlug": "cinnabar-island",
        "inBag": true,
        "used": false
      }
    ]
  ],
  "runStartedAt": 1772150400000
}$state$::jsonb,
    1,
    8,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    $state${
  "team": [
    {
      "id": 1,
      "locationSlug": "sinnoh-route-201",
      "members": [
        {
          "id": 387,
          "nickname": "Leafy"
        },
        {
          "id": 390,
          "nickname": "Blaze"
        }
      ]
    },
    {
      "id": 2,
      "locationSlug": "sinnoh-route-202",
      "members": [
        {
          "id": 396,
          "nickname": "Swoosh"
        },
        {
          "id": 399,
          "nickname": "Chompy"
        }
      ]
    },
    {
      "id": 3,
      "locationSlug": "sinnoh-route-204",
      "members": [
        {
          "id": 403,
          "nickname": "Sparky"
        },
        {
          "id": 406,
          "nickname": "Rosie"
        }
      ]
    }
  ],
  "box": [
    {
      "id": 4,
      "locationSlug": "valley-windworks",
      "members": [
        {
          "id": 417,
          "nickname": "Zippy"
        },
        {
          "id": 425,
          "nickname": "Balloon"
        }
      ]
    },
    {
      "id": 5,
      "locationSlug": "sinnoh-route-205",
      "members": [
        {
          "id": 436,
          "nickname": "Mirror"
        },
        {
          "id": 77,
          "nickname": "Ember"
        }
      ]
    }
  ],
  "graveyard": [
    {
      "id": 6,
      "locationSlug": "ravaged-path",
      "members": [
        {
          "id": 401,
          "nickname": "Cricket"
        },
        {
          "id": 427,
          "nickname": "Hoppy"
        }
      ]
    },
    {
      "id": 7,
      "locationSlug": "eterna-forest",
      "members": [
        {
          "id": 412,
          "nickname": "Cloak"
        },
        {
          "id": 420,
          "nickname": "Cherry"
        }
      ]
    },
    {
      "id": 8,
      "locationSlug": "lost-tower",
      "members": [
        {
          "id": 433,
          "nickname": ""
        },
        {
          "id": 434,
          "nickname": ""
        }
      ],
      "isLost": true
    }
  ],
  "rules": [
    "Pro Route/Gebiet darf nur das erste Pokémon gefangen werden. Dieses Pokémon ist mit dem Pokémon des Partners verbunden.",
    "Pokémon, die bereits gefangen/encountered wurden (oder deren Evolutionsreihe) zählen nicht als Routen Pokémon und dürfen gererolled werden. Es gibt max. 2 weitere Versuche.",
    "Geschenkte/Statische Pokémon & Fossile gelten nicht als Gebietspokémon und dürfen verwendet werden (auch wenn bereits gefangen, auch mit Partner verbunden). Identische Statics & Fossile dürfen nur einmal verwendet werden.",
    "Wenn ein Pokémon beim Fangversuch flieht/stirbt, zählt das Gebiet als verloren. Der Seelenpartner muss freigelassen werden.",
    "Jedes Pokémon erhält einen Spitznamen, den der Seelenpartner auswählt.",
    "Besiegte Pokémon gelten als verstorben und müssen so wie ihr Seelenpartner in eine Grab-Box. (Wenn bereits im Kampf, Verwendung bis zum Ende)",
    "Pokémon, Items, und Trainer sind gerandomized.",
    "Der Bonusshop ist gerandomized, jedes Item darf max. 1 mal gekauft werden.",
    "Das Level-Cap darf nicht überschritten werden (1 Pokémon auf höherem Level, restliche auf niedrigerem wenn vorhanden). Überlevelte Pokémon sowie ihr Seelenpartner dürfen nicht verwendet werden, bis der Level-Cap wieder ansteigt.",
    "Sonderbonbons dürfen direkt VOR Arenaleiter/Top-4/Champion/Rivalen verwendet werden. Sie dürfen außerdem verwendet werden um Pokémon auf das Level-Cap der letzten Arena zu bringen.",
    "Kampffolge wird auf 'Folgen' gestellt.",
    "Gegenstände im Kampf nur, wenn der Gegner auch einen verwendet. In der Top 4 max. 20 Items außerhalb von Kämpfen",
    "Shiny Pokémon dürfen immer gefangen und nach belieben ausgetauscht werden.",
    "Challenge verloren, wenn das komplette Team eines Spielers besiegt wurde.",
    "Challenge geschafft, wenn der Champ der Region besiegt wurde.",
    "Challenge startet sobald man die ersten Pokébälle erhalten hat.",
    "Kein Googlen während Arena/Top-4/Rivalen/Boss-Kämpfen",
    "Max. 2 legendäre Pokémon pro Team"
  ],
  "levelCaps": [
    {
      "id": 1,
      "arena": "gym_1",
      "level": "14/12",
      "done": true
    },
    {
      "id": 2,
      "arena": "gym_2",
      "level": "22/20",
      "done": true
    },
    {
      "id": 3,
      "arena": "gym_3",
      "level": "26/24",
      "done": true
    },
    {
      "id": 4,
      "arena": "gym_4",
      "level": "32/29",
      "done": true
    },
    {
      "id": 5,
      "arena": "gym_5",
      "level": "37/34",
      "done": true
    },
    {
      "id": 6,
      "arena": "gym_6",
      "level": "41/38",
      "done": true
    },
    {
      "id": 7,
      "arena": "gym_7",
      "level": "44/42",
      "done": true
    },
    {
      "id": 8,
      "arena": "gym_8",
      "level": "50/48",
      "done": true
    },
    {
      "id": 9,
      "arena": "elite_four_aaron",
      "level": "53/51",
      "done": false
    },
    {
      "id": 10,
      "arena": "elite_four_bertha",
      "level": "55/53",
      "done": false
    },
    {
      "id": 11,
      "arena": "elite_four_flint",
      "level": "57/55",
      "done": false
    },
    {
      "id": 12,
      "arena": "elite_four_lucian",
      "level": "59/56",
      "done": false
    },
    {
      "id": 13,
      "arena": "champion_cynthia",
      "level": "62/58",
      "done": false
    }
  ],
  "rivalCaps": [
    {
      "id": 1,
      "location": "route_209",
      "rival": "barry",
      "level": "9/7",
      "done": true,
      "revealed": true
    },
    {
      "id": 2,
      "location": "hearthome_city",
      "rival": "barry",
      "level": "27/25",
      "done": true,
      "revealed": true
    },
    {
      "id": 3,
      "location": "pastoria_city",
      "rival": "barry",
      "level": "36/34",
      "done": true,
      "revealed": true
    },
    {
      "id": 4,
      "location": "canalive_city",
      "rival": "barry",
      "level": "38/37",
      "done": true,
      "revealed": true
    },
    {
      "id": 5,
      "location": "pokemon_league",
      "rival": "barry",
      "level": "51/49",
      "done": true,
      "revealed": true
    }
  ],
  "stats": {
    "runs": 27,
    "best": 0,
    "top4Items": [
      0,
      0
    ],
    "deaths": [
      0,
      2
    ],
    "sumDeaths": [
      13,
      27
    ],
    "legendaryEncounters": 95
  },
  "legendaryTrackerEnabled": true,
  "rivalCensorMode": "off",
  "hardcoreModeEnabled": false,
  "nicknamesEnabled": true,
  "infiniteFossilsEnabled": false,
  "megaStoneSpriteStyle": "item",
  "fossils": [
    [
      {
        "fossilId": "skull-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      },
      {
        "fossilId": "old-amber",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      },
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "oreburgh-city",
        "inBag": false,
        "revived": false
      }
    ],
    [
      {
        "fossilId": "armor-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      },
      {
        "fossilId": "dome-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      }
    ]
  ],
  "items": [
    [
      {
        "id": "fire-stone",
        "location": "",
        "locationSlug": "veilstone-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "dawn-stone",
        "location": "",
        "locationSlug": "hearthome-city",
        "inBag": true,
        "used": true
      },
      {
        "id": "shiny-stone",
        "location": "",
        "locationSlug": "canalave-city",
        "inBag": false,
        "used": false
      },
      {
        "id": "water-stone",
        "location": "",
        "locationSlug": "solaceon-town",
        "inBag": true,
        "used": false
      },
      {
        "id": "dusk-stone",
        "location": "",
        "locationSlug": "eterna-city",
        "inBag": true,
        "used": false
      }
    ],
    [
      {
        "id": "leaf-stone",
        "location": "",
        "locationSlug": "floaroma-town",
        "inBag": true,
        "used": false
      },
      {
        "id": "thunder-stone",
        "location": "",
        "locationSlug": "sunyshore-city",
        "inBag": true,
        "used": true
      },
      {
        "id": "sun-stone",
        "location": "",
        "locationSlug": "pastoria-city",
        "inBag": false,
        "used": false
      }
    ]
  ],
  "runStartedAt": 1789257600000
}$state$::jsonb,
    1,
    5,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    $state${
  "team": [
    {
      "id": 1,
      "locationSlug": "unova-route-1",
      "members": [
        {
          "id": 501,
          "nickname": "Otterpop"
        },
        {
          "id": 498,
          "nickname": "Sizzle"
        }
      ]
    },
    {
      "id": 2,
      "locationSlug": "unova-route-2",
      "members": [
        {
          "id": 504,
          "nickname": "Scout"
        },
        {
          "id": 506,
          "nickname": "Buddy"
        }
      ]
    },
    {
      "id": 3,
      "locationSlug": "unova-route-3",
      "members": [
        {
          "id": 522,
          "nickname": "Sparky"
        },
        {
          "id": 509,
          "nickname": "Whiskers"
        }
      ]
    }
  ],
  "box": [
    {
      "id": 4,
      "locationSlug": "dreamyard",
      "members": [
        {
          "id": 517,
          "nickname": "Dreamy"
        },
        {
          "id": 519,
          "nickname": "Coo"
        }
      ]
    },
    {
      "id": 5,
      "locationSlug": "pinwheel-forest",
      "members": [
        {
          "id": 540,
          "nickname": "Leafy"
        },
        {
          "id": 543,
          "nickname": "Stinger"
        }
      ]
    },
    {
      "id": 6,
      "locationSlug": null,
      "fossilSlugs": [
        "old-amber",
        "skull-fossil"
      ],
      "members": [
        {
          "id": 142,
          "nickname": "Amber"
        },
        {
          "id": 408,
          "nickname": "Rocky"
        }
      ]
    }
  ],
  "graveyard": [
    {
      "id": 7,
      "locationSlug": "wellspring-cave",
      "members": [
        {
          "id": 524,
          "nickname": "Pebble"
        },
        {
          "id": 527,
          "nickname": "Sonar"
        }
      ]
    },
    {
      "id": 8,
      "locationSlug": "cold-storage",
      "members": [
        {
          "id": 582,
          "nickname": "Frosty"
        },
        {
          "id": 532,
          "nickname": "Lumber"
        }
      ]
    }
  ],
  "rules": [
    "Pro Route/Gebiet darf nur das erste Pokémon gefangen werden. Dieses Pokémon ist mit dem Pokémon des Partners verbunden.",
    "Pokémon, die bereits gefangen/encountered wurden (oder deren Evolutionsreihe) zählen nicht als Routen Pokémon und dürfen gererolled werden. Es gibt max. 2 weitere Versuche.",
    "Geschenkte/Statische Pokémon & Fossile gelten nicht als Gebietspokémon und dürfen verwendet werden (auch wenn bereits gefangen, auch mit Partner verbunden). Identische Statics & Fossile dürfen nur einmal verwendet werden.",
    "Wenn ein Pokémon beim Fangversuch flieht/stirbt, zählt das Gebiet als verloren. Der Seelenpartner muss freigelassen werden.",
    "Jedes Pokémon erhält einen Spitznamen, den der Seelenpartner auswählt.",
    "Besiegte Pokémon gelten als verstorben und müssen so wie ihr Seelenpartner in eine Grab-Box. (Wenn bereits im Kampf, Verwendung bis zum Ende)",
    "Pokémon, Items, und Trainer sind gerandomized.",
    "Der Bonusshop ist gerandomized, jedes Item darf max. 1 mal gekauft werden.",
    "Das Level-Cap darf nicht überschritten werden (1 Pokémon auf höherem Level, restliche auf niedrigerem wenn vorhanden). Überlevelte Pokémon sowie ihr Seelenpartner dürfen nicht verwendet werden, bis der Level-Cap wieder ansteigt.",
    "Sonderbonbons dürfen direkt VOR Arenaleiter/Top-4/Champion/Rivalen verwendet werden. Sie dürfen außerdem verwendet werden um Pokémon auf das Level-Cap der letzten Arena zu bringen.",
    "Kampffolge wird auf 'Folgen' gestellt.",
    "Gegenstände im Kampf nur, wenn der Gegner auch einen verwendet. In der Top 4 max. 20 Items außerhalb von Kämpfen",
    "Shiny Pokémon dürfen immer gefangen und nach belieben ausgetauscht werden.",
    "Challenge verloren, wenn das komplette Team eines Spielers besiegt wurde.",
    "Challenge geschafft, wenn der Champ der Region besiegt wurde.",
    "Challenge startet sobald man die ersten Pokébälle erhalten hat.",
    "Kein Googlen während Arena/Top-4/Rivalen/Boss-Kämpfen",
    "Max. 2 legendäre Pokémon pro Team"
  ],
  "levelCaps": [
    {
      "id": 1,
      "arena": "gym_1",
      "level": "14/12",
      "done": true
    },
    {
      "id": 2,
      "arena": "gym_2",
      "level": "20/18",
      "done": true
    },
    {
      "id": 3,
      "arena": "gym_3",
      "level": "23/21",
      "done": true
    },
    {
      "id": 4,
      "arena": "gym_4",
      "level": "27/25",
      "done": true
    },
    {
      "id": 5,
      "arena": "gym_5",
      "level": "31/29",
      "done": true
    },
    {
      "id": 6,
      "arena": "gym_6",
      "level": "35/33",
      "done": false
    },
    {
      "id": 7,
      "arena": "gym_7",
      "level": "39/37",
      "done": false
    },
    {
      "id": 8,
      "arena": "gym_8",
      "level": "43/41",
      "done": false
    },
    {
      "id": 9,
      "arena": "elite_four_shauntal",
      "level": "50/48",
      "done": false
    },
    {
      "id": 10,
      "arena": "elite_four_grimsley",
      "level": "50/48",
      "done": false
    },
    {
      "id": 11,
      "arena": "elite_four_caitlin",
      "level": "50/48",
      "done": false
    },
    {
      "id": 12,
      "arena": "elite_four_marshal",
      "level": "50/48",
      "done": false
    },
    {
      "id": 13,
      "arena": "champion_n",
      "level": "52/50",
      "done": false
    }
  ],
  "rivalCaps": [
    {
      "id": 1,
      "location": "accumula_town",
      "rival": "n",
      "level": "7",
      "done": true,
      "revealed": true
    },
    {
      "id": 2,
      "location": "route_2",
      "rival": "bianca",
      "level": "7/6",
      "done": true,
      "revealed": true
    },
    {
      "id": 3,
      "location": "striation_city",
      "rival": "cheren",
      "level": "8",
      "done": true,
      "revealed": true
    },
    {
      "id": 5,
      "location": "route_3",
      "rival": "cheren",
      "level": "14/12",
      "done": true,
      "revealed": true
    },
    {
      "id": 4,
      "location": "nacrene_city",
      "rival": "n",
      "level": "13",
      "done": true,
      "revealed": true
    },
    {
      "id": 6,
      "location": "route_4",
      "rival": "bianca",
      "level": "20/18",
      "done": true,
      "revealed": true
    },
    {
      "id": 7,
      "location": "route_4",
      "rival": "cheren",
      "level": "22/20",
      "done": true,
      "revealed": true
    },
    {
      "id": 8,
      "location": "nimbasa_city",
      "rival": "n",
      "level": "22",
      "done": false,
      "revealed": false
    },
    {
      "id": 9,
      "location": "route_5",
      "rival": "cheren",
      "level": "26/24",
      "done": false,
      "revealed": false
    },
    {
      "id": 10,
      "location": "driftveil_city",
      "rival": "bianca",
      "level": "28/26",
      "done": false,
      "revealed": false
    },
    {
      "id": 11,
      "location": "chargestone_cave",
      "rival": "n",
      "level": "28",
      "done": false,
      "revealed": false
    },
    {
      "id": 12,
      "location": "twist_mountain",
      "rival": "cheren",
      "level": "35/33",
      "done": false,
      "revealed": false
    },
    {
      "id": 13,
      "location": "route_8",
      "rival": "bianca",
      "level": "40/38",
      "done": false,
      "revealed": false
    },
    {
      "id": 14,
      "location": "route_10",
      "rival": "cheren",
      "level": "45/43",
      "done": false,
      "revealed": false
    }
  ],
  "stats": {
    "runs": 17,
    "best": 7,
    "top4Items": [
      0,
      0
    ],
    "deaths": [
      21,
      16
    ],
    "sumDeaths": [
      4,
      5
    ],
    "legendaryEncounters": 45
  },
  "legendaryTrackerEnabled": true,
  "rivalCensorMode": "on",
  "hardcoreModeEnabled": false,
  "nicknamesEnabled": true,
  "infiniteFossilsEnabled": false,
  "megaStoneSpriteStyle": "item",
  "fossils": [
    [
      {
        "fossilId": "cover-fossil",
        "location": "",
        "locationSlug": "nacrene-city",
        "inBag": false,
        "revived": false
      },
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      },
      {
        "fossilId": "old-amber",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": true,
        "pokemonId": 142
      }
    ],
    [
      {
        "fossilId": "plume-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false
      },
      {
        "fossilId": "dome-fossil",
        "location": "",
        "locationSlug": "nacrene-city",
        "inBag": false,
        "revived": false
      },
      {
        "fossilId": "skull-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": true,
        "pokemonId": 408
      }
    ]
  ],
  "items": [
    [
      {
        "id": "fire-stone",
        "location": "",
        "locationSlug": "nimbasa-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "water-stone",
        "location": "",
        "locationSlug": "driftveil-city",
        "inBag": true,
        "used": true
      },
      {
        "id": "dusk-stone",
        "location": "",
        "locationSlug": "mistralton-city",
        "inBag": false,
        "used": false
      }
    ],
    [
      {
        "id": "leaf-stone",
        "location": "",
        "locationSlug": "castelia-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "thunder-stone",
        "location": "",
        "locationSlug": "driftveil-city",
        "inBag": true,
        "used": true
      },
      {
        "id": "sun-stone",
        "location": "",
        "locationSlug": "nacrene-city",
        "inBag": false,
        "used": false
      },
      {
        "id": "moon-stone",
        "location": "",
        "locationSlug": "icirrus-city",
        "inBag": true,
        "used": false
      }
    ]
  ],
  "runStartedAt": 1789689600000
}$state$::jsonb,
    1,
    11,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    $state${
  "team": [
    {
      "id": 1,
      "locationSlug": "hoenn-route-101",
      "members": [
        {
          "id": 252,
          "nickname": "Gecko"
        },
        {
          "id": 255,
          "nickname": "Chicky"
        }
      ]
    },
    {
      "id": 2,
      "locationSlug": "hoenn-route-102",
      "members": [
        {
          "id": 263,
          "nickname": "Ziggy"
        },
        {
          "id": 270,
          "nickname": "Lilypad"
        }
      ]
    },
    {
      "id": 3,
      "locationSlug": "hoenn-route-104",
      "members": [
        {
          "id": 276,
          "nickname": "Swift"
        },
        {
          "id": 278,
          "nickname": "Gully"
        }
      ]
    }
  ],
  "box": [
    {
      "id": 4,
      "locationSlug": "petalburg-woods",
      "members": [
        {
          "id": 265,
          "nickname": "Squirmy"
        },
        {
          "id": 273,
          "nickname": "Acorn"
        }
      ]
    },
    {
      "id": 5,
      "locationSlug": "hoenn-route-116",
      "members": [
        {
          "id": 299,
          "nickname": "Compass"
        },
        {
          "id": 293,
          "nickname": "Whisper"
        }
      ]
    },
    {
      "id": 6,
      "locationSlug": null,
      "fossilSlugs": [
        "root-fossil",
        "claw-fossil"
      ],
      "members": [
        {
          "id": 345,
          "nickname": "Rooty"
        },
        {
          "id": 347,
          "nickname": "Claws"
        }
      ]
    }
  ],
  "graveyard": [
    {
      "id": 7,
      "locationSlug": "granite-cave",
      "members": [
        {
          "id": 296,
          "nickname": "Sumo"
        },
        {
          "id": 304,
          "nickname": "Ironclad"
        }
      ]
    },
    {
      "id": 8,
      "locationSlug": "hoenn-route-110",
      "members": [
        {
          "id": 309,
          "nickname": "Volt"
        },
        {
          "id": 316,
          "nickname": "Blob"
        }
      ]
    }
  ],
  "rules": [
    "Pro Route/Gebiet darf nur das erste Pokémon gefangen werden. Dieses Pokémon ist mit dem Pokémon des Partners verbunden.",
    "Pokémon, die bereits gefangen/encountered wurden (oder deren Evolutionsreihe) zählen nicht als Routen Pokémon und dürfen gererolled werden. Es gibt max. 2 weitere Versuche.",
    "Geschenkte/Statische Pokémon & Fossile gelten nicht als Gebietspokémon und dürfen verwendet werden (auch wenn bereits gefangen, auch mit Partner verbunden). Identische Statics & Fossile dürfen nur einmal verwendet werden.",
    "Wenn ein Pokémon beim Fangversuch flieht/stirbt, zählt das Gebiet als verloren. Der Seelenpartner muss freigelassen werden.",
    "Jedes Pokémon erhält einen Spitznamen, den der Seelenpartner auswählt.",
    "Besiegte Pokémon gelten als verstorben und müssen so wie ihr Seelenpartner in eine Grab-Box. (Wenn bereits im Kampf, Verwendung bis zum Ende)",
    "Pokémon, Items, und Trainer sind gerandomized.",
    "Der Bonusshop ist gerandomized, jedes Item darf max. 1 mal gekauft werden.",
    "Das Level-Cap darf nicht überschritten werden (1 Pokémon auf höherem Level, restliche auf niedrigerem wenn vorhanden). Überlevelte Pokémon sowie ihr Seelenpartner dürfen nicht verwendet werden, bis der Level-Cap wieder ansteigt.",
    "Sonderbonbons dürfen direkt VOR Arenaleiter/Top-4/Champion/Rivalen verwendet werden. Sie dürfen außerdem verwendet werden um Pokémon auf das Level-Cap der letzten Arena zu bringen.",
    "Kampffolge wird auf 'Folgen' gestellt.",
    "Gegenstände im Kampf nur, wenn der Gegner auch einen verwendet. In der Top 4 max. 20 Items außerhalb von Kämpfen",
    "Shiny Pokémon dürfen immer gefangen und nach belieben ausgetauscht werden.",
    "Challenge verloren, wenn das komplette Team eines Spielers besiegt wurde.",
    "Challenge geschafft, wenn der Champ der Region besiegt wurde.",
    "Challenge startet sobald man die ersten Pokébälle erhalten hat.",
    "Kein Googlen während Arena/Top-4/Rivalen/Boss-Kämpfen",
    "Max. 2 legendäre Pokémon pro Team"
  ],
  "levelCaps": [
    {
      "id": 1,
      "arena": "gym_1",
      "level": "14/12",
      "done": true
    },
    {
      "id": 2,
      "arena": "gym_2",
      "level": "16/14",
      "done": true
    },
    {
      "id": 3,
      "arena": "gym_3",
      "level": "21/19",
      "done": true
    },
    {
      "id": 4,
      "arena": "gym_4",
      "level": "28/26",
      "done": false
    },
    {
      "id": 5,
      "arena": "gym_5",
      "level": "30/28",
      "done": false
    },
    {
      "id": 6,
      "arena": "gym_6",
      "level": "35/33",
      "done": false
    },
    {
      "id": 7,
      "arena": "gym_7",
      "level": "45",
      "done": false
    },
    {
      "id": 8,
      "arena": "gym_8",
      "level": "46/44",
      "done": false
    },
    {
      "id": 9,
      "arena": "elite_four_sidney",
      "level": "52/50",
      "done": false
    },
    {
      "id": 10,
      "arena": "elite_four_phoebe",
      "level": "53/51",
      "done": false
    },
    {
      "id": 11,
      "arena": "elite_four_glacia",
      "level": "54/52",
      "done": false
    },
    {
      "id": 12,
      "arena": "elite_four_drake",
      "level": "55/53",
      "done": false
    },
    {
      "id": 13,
      "arena": "champion_steven",
      "level": "59/57",
      "done": false
    }
  ],
  "rivalCaps": [
    {
      "id": 1,
      "location": "route_110",
      "rival": {
        "key": "brendan_may",
        "options": {
          "male": "brendan",
          "female": "may"
        }
      },
      "level": "20/18",
      "done": true,
      "revealed": true
    },
    {
      "id": 2,
      "location": "mauville_city",
      "rival": "wally",
      "level": "17",
      "done": true,
      "revealed": true
    },
    {
      "id": 3,
      "location": "route_119",
      "rival": {
        "key": "brendan_may",
        "options": {
          "male": "brendan",
          "female": "may"
        }
      },
      "level": "33/31",
      "done": false,
      "revealed": false
    },
    {
      "id": 4,
      "location": "lilycove_city",
      "rival": {
        "key": "brendan_may",
        "options": {
          "male": "brendan",
          "female": "may"
        }
      },
      "level": "38/37",
      "done": false,
      "revealed": false
    },
    {
      "id": 5,
      "location": "victory_road",
      "rival": "wally",
      "level": "48/46",
      "done": false,
      "revealed": false
    },
    {
      "id": 6,
      "location": "route_103",
      "rival": {
        "key": "brendan_may",
        "options": {
          "male": "brendan",
          "female": "may"
        }
      },
      "level": "50/48",
      "done": false,
      "revealed": false
    }
  ],
  "stats": {
    "runs": 4,
    "best": 5,
    "top4Items": [
      0,
      0
    ],
    "deaths": [
      1,
      1
    ],
    "sumDeaths": [
      7,
      10
    ],
    "legendaryEncounters": 9
  },
  "legendaryTrackerEnabled": true,
  "rivalCensorMode": "on",
  "hardcoreModeEnabled": false,
  "nicknamesEnabled": true,
  "infiniteFossilsEnabled": false,
  "megaStoneSpriteStyle": "item",
  "fossils": [
    [
      {
        "fossilId": "jaw-fossil",
        "location": "",
        "locationSlug": "rustboro-city",
        "inBag": false,
        "revived": false
      },
      {
        "fossilId": "root-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": true,
        "pokemonId": 345
      }
    ],
    [
      {
        "fossilId": "sail-fossil",
        "location": "",
        "locationSlug": "rustboro-city",
        "inBag": false,
        "revived": false
      },
      {
        "fossilId": "claw-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": true,
        "pokemonId": 347
      },
      {
        "fossilId": "cover-fossil",
        "location": "",
        "locationSlug": "mauville-city",
        "inBag": false,
        "revived": false
      }
    ]
  ],
  "items": [
    [
      {
        "id": "fire-stone",
        "location": "",
        "locationSlug": "lavaridge-town",
        "inBag": true,
        "used": false
      },
      {
        "id": "water-stone",
        "location": "",
        "locationSlug": "slateport-city",
        "inBag": true,
        "used": true
      },
      {
        "id": "sun-stone",
        "location": "",
        "locationSlug": "mossdeep-city",
        "inBag": false,
        "used": false
      },
      {
        "id": "item:sceptilite",
        "location": "",
        "locationSlug": "fortree-city",
        "inBag": true,
        "used": false
      }
    ],
    [
      {
        "id": "leaf-stone",
        "location": "",
        "locationSlug": "fortree-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "thunder-stone",
        "location": "",
        "locationSlug": "mauville-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "moon-stone",
        "location": "",
        "locationSlug": "fallarbor-town",
        "inBag": true,
        "used": true
      },
      {
        "id": "item:blazikenite",
        "location": "",
        "locationSlug": "fallarbor-town",
        "inBag": true,
        "used": false
      },
      {
        "id": "item:altarianite",
        "location": "",
        "locationSlug": "lilycove-city",
        "inBag": false,
        "used": false
      }
    ]
  ],
  "runStartedAt": 1763683200000
}$state$::jsonb,
    1,
    3,
    '10000000-0000-0000-0000-000000000001'
  );

insert into public.rulesets (
  owner_id,
  id,
  name,
  description,
  rules,
  tags
)
values (
  '10000000-0000-0000-0000-000000000001',
  'local-custom-rules',
  'Local Custom Rules',
  'Deterministic custom ruleset for local development.',
  array['Only the first encounter per area may be caught.', 'Fainted Pokémon are lost.'],
  array['local', 'test']
);

commit;
