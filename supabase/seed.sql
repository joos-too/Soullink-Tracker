-- Deterministic fixtures for local development and the staging deployment.
-- Never apply this file to production.
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
  use_generation_sprites = id = '10000000-0000-0000-0000-000000000003'::uuid,
  pokemon_image_style = case
    when id = '10000000-0000-0000-0000-000000000003'::uuid then 'sprites'::public.pokemon_image_style
    else 'mixed'::public.pokemon_image_style
  end,
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
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    'Full Hoenn Trio Layout Test',
    array['Alexandria', 'Bartholomew', 'Cassandra'],
    '10000000-0000-0000-0000-000000000001',
    '2026-10-30T00:00:00.000Z',
    'gen6_oras',
    false,
    true,
    'default_trio_ruleset'
  ),
  (
    '30000000-0000-0000-0000-000000000006',
    'Pokémon FireRed & LeafGreen Solo',
    array['Red'],
    '10000000-0000-0000-0000-000000000001',
    '2026-11-01T00:00:00.000Z',
    'gen3_frlg',
    false,
    false,
    'default_solo_ruleset_en'
  );

-- The editor and guest memberships exercise access control on the public Gen 1 tracker.
insert into public.tracker_members (tracker_id, user_id, role, settings)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', '{"rivalPreferences":{"blue":"male"}}'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'editor', '{}'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'guest', '{}'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'owner', '{}'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'owner', '{}'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'owner', '{}'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'owner', '{}'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'owner', '{"rivalPreferences":{"blue":"male"}}');

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
      "id": "835afe65-d3ab-52f1-839f-7bda2d5908f9",
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
      "id": "acf54c01-fbee-5e71-8c19-743d2d2cdb3e",
      "locationSlug": "kanto-route-2",
      "members": [
        {
          "id": 15,
          "nickname": "Driller"
        },
        {
          "id": 13,
          "nickname": "Stinger"
        }
      ]
    },
    {
      "id": "a8be2328-9786-5b0d-8dab-1877ecbdbf2c",
      "locationSlug": "viridian-forest",
      "members": [
        {
          "id": 25,
          "nickname": "Sparky"
        },
        {
          "id": 75,
          "nickname": "Roller"
        }
      ]
    }
  ],
  "box": [
    {
      "id": "99f7e35e-cdd4-598a-8e15-9351b0ade1e6",
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
      "id": "fbd732c3-ed1f-5462-826c-4116536e0694",
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
      "id": "5ed3f105-13d6-5bd0-83a4-1634847db2ab",
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
      ],
      "isLost": false
    },
    {
      "id": "dfe7eb61-89da-5a13-8c0e-79136436deae",
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
      ],
      "isLost": false
    },
    {
      "id": "2e1773bb-8a2e-52d2-84f1-38a640aa917e",
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
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      }
    ],
    [
      {
        "fossilId": "dome-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "old-amber",
        "location": "",
        "locationSlug": "pewter-city",
        "inBag": false,
        "revived": false,
        "pokemonId": null
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
    3,
    8,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    $state${
  "team": [
    {
      "id": "a114adf8-02d5-5cb0-8280-34abf1378268",
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
      "id": "dcc076f5-4b9e-5962-86f2-d34f4d5c7f51",
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
      "id": "aa4d7003-686c-5da3-86e1-cb32318fa912",
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
      "id": "4985675a-26d5-5043-863b-03b6f8b2255a",
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
      "id": "532b505f-cc79-5962-8a38-4a3e0cbc7bee",
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
      "id": "0229e55d-9ca1-5536-8dfc-3b6fa15ffbf0",
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
      ],
      "isLost": false
    },
    {
      "id": "50b4e968-5168-50c5-829d-51017a5830f4",
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
      ],
      "isLost": false
    },
    {
      "id": "37c7e1e8-d482-581d-86a9-06459b52c653",
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
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "old-amber",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "oreburgh-city",
        "inBag": false,
        "revived": false,
        "pokemonId": null
      }
    ],
    [
      {
        "fossilId": "armor-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "dome-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false,
        "pokemonId": null
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
    3,
    5,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    $state${
  "team": [
    {
      "id": "7abc342e-f525-5a10-89e2-d8e9c8fb09b7",
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
      "id": "5a7f06b5-1c3b-5a8a-8bb9-f65eefdfb51a",
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
      "id": "c4596ef8-631a-5986-8c26-da3d4f7c0975",
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
      "id": "e3e2e445-c694-56f9-85b3-2f0daa47cb61",
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
      "id": "a645c369-90ce-5546-8dfc-f10bbc0bedb6",
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
      "id": "c22cb33f-d3e1-5427-8215-90c06dcb5f0e",
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
      "id": "f9f7249b-6518-5062-8012-0094fc05be8e",
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
      ],
      "isLost": false
    },
    {
      "id": "f90a271c-edd5-5664-889e-1be5b28c7624",
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
      ],
      "isLost": false
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
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false,
        "pokemonId": null
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
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "dome-fossil",
        "location": "",
        "locationSlug": "nacrene-city",
        "inBag": false,
        "revived": false,
        "pokemonId": null
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
    3,
    11,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    $state${
  "team": [
    {
      "id": "add39f46-4b18-5130-8acf-a12f1f4b9a58",
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
      "id": "50ca419d-0449-5fd2-87b2-25f69a41b7fd",
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
      "id": "e3371cb5-31f2-5887-8307-8238fc047cb5",
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
      "id": "4564a527-ba2d-5faa-8814-9fc5ed5afe7d",
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
      "id": "962f05b6-2cf2-59e1-80d2-3dcc43ba6e39",
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
      "id": "c330f445-f3de-59d0-8936-51c7da44b4a4",
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
      "id": "2b1bd1b7-57e3-5ef3-8a86-e20c2b5f171f",
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
      ],
      "isLost": false
    },
    {
      "id": "11279edf-dc09-5454-86d4-5542b96a1ac4",
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
      ],
      "isLost": false
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
        "revived": false,
        "pokemonId": null
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
        "revived": false,
        "pokemonId": null
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
        "revived": false,
        "pokemonId": null
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
    3,
    3,
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    $state${
  "team": [
    {
      "id": "19b35b9e-2640-541f-8a8d-b94fbabb3e1b",
      "locationSlug": "hoenn-route-101",
      "members": [
        {
          "id": 252,
          "nickname": "Canopy"
        },
        {
          "id": 255,
          "nickname": "Kindling"
        },
        {
          "id": 258,
          "nickname": "Puddles"
        }
      ]
    },
    {
      "id": "afbe2e3a-b810-5355-8074-21368e2a996d",
      "locationSlug": "hoenn-route-102",
      "members": [
        {
          "id": 263,
          "nickname": "Longstripe"
        },
        {
          "id": 270,
          "nickname": "Lily Dancer"
        },
        {
          "id": 273,
          "nickname": "Acorn Knight"
        }
      ]
    },
    {
      "id": "e2f9eb1e-4a78-5ec0-83e0-3770419a4692",
      "locationSlug": "hoenn-route-104",
      "members": [
        {
          "id": 276,
          "nickname": "Swiftwing"
        },
        {
          "id": 278,
          "nickname": "Harbor Gull"
        },
        {
          "id": 280,
          "nickname": "Daydream"
        }
      ]
    },
    {
      "id": "99bc214a-9712-5316-8add-7511119695b8",
      "locationSlug": "petalburg-woods",
      "members": [
        {
          "id": 285,
          "nickname": "Portobello"
        },
        {
          "id": 290,
          "nickname": "Cicada"
        },
        {
          "id": 293,
          "nickname": "Whisper"
        }
      ]
    },
    {
      "id": "7c1dd229-9773-5430-8d3a-4d53c5f63290",
      "locationSlug": "hoenn-route-116",
      "members": [
        {
          "id": 296,
          "nickname": "Haymaker"
        },
        {
          "id": 299,
          "nickname": "True North"
        },
        {
          "id": 300,
          "nickname": "Moonbeam"
        }
      ]
    },
    {
      "id": "c9dad5f7-0d27-5c59-89fa-f62b287bdc3f",
      "locationSlug": "granite-cave",
      "members": [
        {
          "id": 304,
          "nickname": "Ironclad"
        },
        {
          "id": 307,
          "nickname": "Meditator"
        },
        {
          "id": 309,
          "nickname": "High Voltage"
        }
      ]
    }
  ],
  "box": [
    {
      "id": "7531e917-de65-5017-8189-6c29d67fe8f8",
      "locationSlug": "dewford-town",
      "members": [
        {
          "id": 129,
          "nickname": "Splashdown"
        },
        {
          "id": 72,
          "nickname": "Jelly"
        },
        {
          "id": 320,
          "nickname": "Big Blue"
        }
      ]
    },
    {
      "id": "2174eb92-c584-5fd9-8e9e-677fb52227ae",
      "locationSlug": "hoenn-route-106",
      "members": [
        {
          "id": 74,
          "nickname": "Pebble"
        },
        {
          "id": 66,
          "nickname": "Flexington"
        },
        {
          "id": 41,
          "nickname": "Echo"
        }
      ]
    },
    {
      "id": "d56a32c5-6283-5ba0-8463-fb8c14729caa",
      "locationSlug": "hoenn-route-109",
      "members": [
        {
          "id": 116,
          "nickname": "Seabiscuit"
        },
        {
          "id": 120,
          "nickname": "Starlight"
        },
        {
          "id": 98,
          "nickname": "Pincers"
        }
      ]
    },
    {
      "id": "c59f8f70-f553-5aa0-8f47-c852be134907",
      "locationSlug": "slateport-city",
      "members": [
        {
          "id": 88,
          "nickname": "Sludge"
        },
        {
          "id": 100,
          "nickname": "Boombox"
        },
        {
          "id": 81,
          "nickname": "Polarity"
        }
      ]
    },
    {
      "id": "d8bce136-4e4e-5ff5-8157-96912d8ded93",
      "locationSlug": "hoenn-route-110",
      "members": [
        {
          "id": 311,
          "nickname": "Positive"
        },
        {
          "id": 312,
          "nickname": "Negative"
        },
        {
          "id": 316,
          "nickname": "Gummy"
        }
      ]
    },
    {
      "id": "ac7128af-8bfd-5835-8ce5-80a063effea3",
      "locationSlug": "new-mauville",
      "members": [
        {
          "id": 82,
          "nickname": "Magnetron"
        },
        {
          "id": 101,
          "nickname": "Countdown"
        },
        {
          "id": 125,
          "nickname": "Livewire"
        }
      ]
    },
    {
      "id": "f73db451-1229-5c52-8099-4a75067d73c0",
      "locationSlug": "hoenn-route-111",
      "members": [
        {
          "id": 322,
          "nickname": "Cinderback"
        },
        {
          "id": 328,
          "nickname": "Trapdoor"
        },
        {
          "id": 331,
          "nickname": "Prickles"
        }
      ]
    },
    {
      "id": "94b71ef6-090b-5d3f-8b6a-50658582663d",
      "locationSlug": "fiery-path",
      "members": [
        {
          "id": 218,
          "nickname": "Molten"
        },
        {
          "id": 324,
          "nickname": "Smokestack"
        },
        {
          "id": 109,
          "nickname": "Fumes"
        }
      ]
    },
    {
      "id": "ee0ec6fb-9835-5706-821f-93542024f136",
      "locationSlug": "hoenn-route-113",
      "members": [
        {
          "id": 327,
          "nickname": "Dizzy"
        },
        {
          "id": 227,
          "nickname": "Steelwing"
        },
        {
          "id": 333,
          "nickname": "Cloud Nine"
        }
      ]
    },
    {
      "id": "a98be7f4-3bf2-5082-805a-e64cd71e6b12",
      "locationSlug": "meteor-falls",
      "members": [
        {
          "id": 337,
          "nickname": "Lunatone Prime"
        },
        {
          "id": 338,
          "nickname": "Solrock Prime"
        },
        {
          "id": 35,
          "nickname": "Moonstone"
        }
      ]
    },
    {
      "id": "9f5e2417-1265-5a36-8460-0c1110a2cd52",
      "locationSlug": "hoenn-route-114",
      "members": [
        {
          "id": 183,
          "nickname": "Bubblegum"
        },
        {
          "id": 270,
          "nickname": "Waterlily"
        },
        {
          "id": 335,
          "nickname": "Viper"
        }
      ]
    },
    {
      "id": "d04967f0-0e86-527b-8b3d-7c689613ba52",
      "locationSlug": "hoenn-route-117",
      "members": [
        {
          "id": 315,
          "nickname": "Roselia"
        },
        {
          "id": 313,
          "nickname": "Firefly"
        },
        {
          "id": 314,
          "nickname": "Glowworm"
        }
      ]
    },
    {
      "id": "818cb284-10cf-59fe-8f9c-228536e0de45",
      "locationSlug": "safari-zone",
      "members": [
        {
          "id": 214,
          "nickname": "Hercules"
        },
        {
          "id": 127,
          "nickname": "Vicegrip"
        },
        {
          "id": 111,
          "nickname": "Rhino"
        }
      ]
    },
    {
      "id": "76c83160-1256-58d2-8172-dad6312f319f",
      "locationSlug": "hoenn-route-119",
      "members": [
        {
          "id": 352,
          "nickname": "Camouflage"
        },
        {
          "id": 357,
          "nickname": "Banana Tree"
        },
        {
          "id": 351,
          "nickname": "Forecast"
        }
      ]
    },
    {
      "id": "61bbe677-ca7a-541e-894b-dd54f1b8604b",
      "locationSlug": "hoenn-route-120",
      "members": [
        {
          "id": 359,
          "nickname": "Nightfall"
        },
        {
          "id": 343,
          "nickname": "Clay Doll"
        },
        {
          "id": 352,
          "nickname": "Invisible"
        }
      ]
    },
    {
      "id": "5c2dc018-6a9d-5360-8fcf-c92411daf8cf",
      "locationSlug": "mt-pyre",
      "members": [
        {
          "id": 353,
          "nickname": "Marionette"
        },
        {
          "id": 355,
          "nickname": "Nightlight"
        },
        {
          "id": 37,
          "nickname": "Foxfire"
        }
      ]
    },
    {
      "id": "d7ec06fd-1d15-5ec0-8e37-710ce7186cb8",
      "locationSlug": "shoal-cave",
      "members": [
        {
          "id": 363,
          "nickname": "Snowball"
        },
        {
          "id": 361,
          "nickname": "Shiver"
        },
        {
          "id": 225,
          "nickname": "Delivery"
        }
      ]
    },
    {
      "id": "b3dbf4f6-1457-5269-8f33-a648bbcaa76b",
      "locationSlug": "victory-road",
      "members": [
        {
          "id": 371,
          "nickname": "Comet"
        },
        {
          "id": 304,
          "nickname": "Plate Mail"
        },
        {
          "id": 302,
          "nickname": "Gemstone"
        }
      ]
    }
  ],
  "graveyard": [
    {
      "id": "a4097d0f-444f-54ba-8ce4-3ff34137367f",
      "locationSlug": "rusturf-tunnel",
      "deathPlayerIndex": 0,
      "members": [
        {
          "id": 293,
          "nickname": "Loudmouth"
        },
        {
          "id": 41,
          "nickname": "Sonar"
        },
        {
          "id": 74,
          "nickname": "Rocky"
        }
      ],
      "isLost": false
    },
    {
      "id": "584808cf-854b-5c65-8c55-c73ed7d3a408",
      "locationSlug": "hoenn-route-112",
      "deathPlayerIndex": 1,
      "members": [
        {
          "id": 66,
          "nickname": "Uppercut"
        },
        {
          "id": 236,
          "nickname": "Spinner"
        },
        {
          "id": 307,
          "nickname": "Zen"
        }
      ],
      "isLost": false
    },
    {
      "id": "d57699bb-8488-598f-8b9a-45c8907152f3",
      "locationSlug": "jagged-pass",
      "deathPlayerIndex": 2,
      "members": [
        {
          "id": 325,
          "nickname": "Bouncer"
        },
        {
          "id": 322,
          "nickname": "Ember"
        },
        {
          "id": 327,
          "nickname": "Spiral"
        }
      ],
      "isLost": false
    },
    {
      "id": "1894b150-fa71-52f3-8fc9-57bea7555f57",
      "locationSlug": "hoenn-route-115",
      "deathPlayerIndex": 0,
      "members": [
        {
          "id": 333,
          "nickname": "Cotton"
        },
        {
          "id": 279,
          "nickname": "Scoop"
        },
        {
          "id": 227,
          "nickname": "Razor"
        }
      ],
      "isLost": false
    },
    {
      "id": "d4089150-df2f-5de8-8332-e0c2a2dd10a8",
      "locationSlug": "desert-underpass",
      "deathPlayerIndex": 1,
      "members": [
        {
          "id": 328,
          "nickname": "Sandsnare"
        },
        {
          "id": 343,
          "nickname": "Ancient"
        },
        {
          "id": 51,
          "nickname": "Triplets"
        }
      ],
      "isLost": false
    },
    {
      "id": "48fac44e-c145-5f41-849a-20007de23c5a",
      "locationSlug": "abandoned-ship",
      "deathPlayerIndex": 2,
      "members": [
        {
          "id": 170,
          "nickname": "Lantern"
        },
        {
          "id": 90,
          "nickname": "Pearl"
        },
        {
          "id": 116,
          "nickname": "Drifter"
        }
      ],
      "isLost": false
    },
    {
      "id": "322c4365-5a2c-5646-8c97-c889601f9869",
      "locationSlug": "seafloor-cavern",
      "deathPlayerIndex": 0,
      "members": [
        {
          "id": 369,
          "nickname": "Relic"
        },
        {
          "id": 222,
          "nickname": "Coral"
        },
        {
          "id": 366,
          "nickname": "Clam"
        }
      ],
      "isLost": false
    },
    {
      "id": "29524407-2bab-5c14-8ab1-6da0e3e9a7e9",
      "locationSlug": "sky-pillar",
      "deathPlayerIndex": 1,
      "members": [
        {
          "id": 334,
          "nickname": "Nimbus"
        },
        {
          "id": 344,
          "nickname": "Totem"
        },
        {
          "id": 356,
          "nickname": "Cyclops"
        }
      ],
      "isLost": false
    },
    {
      "id": "aa7922cc-41cb-5c92-8fce-08f57113fd7a",
      "locationSlug": "mossdeep-city",
      "isLost": true,
      "members": [
        {
          "id": 337,
          "nickname": ""
        },
        {
          "id": 338,
          "nickname": ""
        },
        {
          "id": 121,
          "nickname": ""
        }
      ]
    },
    {
      "id": "8566838b-e346-5211-8c36-42f32b31dd4d",
      "locationSlug": "ever-grande-city",
      "isLost": true,
      "members": [
        {
          "id": 374,
          "nickname": ""
        },
        {
          "id": 371,
          "nickname": ""
        },
        {
          "id": 304,
          "nickname": ""
        }
      ]
    }
  ],
  "rules": [
    "Only the first encounter in each area may be caught.",
    "Every encounter is linked across all three players.",
    "A fainted Pokémon sends the complete trio to the graveyard.",
    "No player may exceed the current level cap."
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
      "done": true
    },
    {
      "id": 5,
      "arena": "gym_5",
      "level": "30/28",
      "done": true
    },
    {
      "id": 6,
      "arena": "gym_6",
      "level": "35/33",
      "done": true
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
    "runs": 12,
    "best": 6,
    "top4Items": [
      7,
      5,
      8
    ],
    "deaths": [
      3,
      3,
      2
    ],
    "sumDeaths": [
      18,
      21,
      16
    ],
    "legendaryEncounters": 24
  },
  "legendaryTrackerEnabled": true,
  "rivalCensorMode": "showLevels",
  "hardcoreModeEnabled": true,
  "nicknamesEnabled": true,
  "infiniteFossilsEnabled": true,
  "megaStoneSpriteStyle": "item",
  "fossils": [
    [
      {
        "fossilId": "root-fossil",
        "location": "",
        "locationSlug": "rustboro-city",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "root-fossil",
        "location": "",
        "locationSlug": "meteor-falls",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "claw-fossil",
        "location": "",
        "locationSlug": "mirage-tower",
        "inBag": false,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "old-amber",
        "location": "",
        "locationSlug": "devon-corporation",
        "inBag": true,
        "revived": true,
        "pokemonId": 142
      },
      {
        "fossilId": "skull-fossil",
        "location": "",
        "locationSlug": "granite-cave",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "cover-fossil",
        "location": "",
        "locationSlug": "shoal-cave",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      }
    ],
    [
      {
        "fossilId": "claw-fossil",
        "location": "",
        "locationSlug": "rustboro-city",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "claw-fossil",
        "location": "",
        "locationSlug": "desert-underpass",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "root-fossil",
        "location": "",
        "locationSlug": "mirage-tower",
        "inBag": false,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "dome-fossil",
        "location": "",
        "locationSlug": "devon-corporation",
        "inBag": true,
        "revived": true,
        "pokemonId": 140
      },
      {
        "fossilId": "plume-fossil",
        "location": "",
        "locationSlug": "granite-cave",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "jaw-fossil",
        "location": "",
        "locationSlug": "shoal-cave",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      }
    ],
    [
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "rustboro-city",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "meteor-falls",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "old-amber",
        "location": "",
        "locationSlug": "mirage-tower",
        "inBag": false,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "sail-fossil",
        "location": "",
        "locationSlug": "devon-corporation",
        "inBag": true,
        "revived": true,
        "pokemonId": 698
      },
      {
        "fossilId": "armor-fossil",
        "location": "",
        "locationSlug": "granite-cave",
        "inBag": true,
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "cover-fossil",
        "location": "",
        "locationSlug": "shoal-cave",
        "inBag": true,
        "revived": false,
        "pokemonId": null
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
        "id": "fire-stone",
        "location": "",
        "locationSlug": "fiery-path",
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
        "id": "thunder-stone",
        "location": "",
        "locationSlug": "new-mauville",
        "inBag": true,
        "used": false
      },
      {
        "id": "leaf-stone",
        "location": "",
        "locationSlug": "fortree-city",
        "inBag": false,
        "used": false
      },
      {
        "id": "moon-stone",
        "location": "",
        "locationSlug": "meteor-falls",
        "inBag": true,
        "used": false
      },
      {
        "id": "sun-stone",
        "location": "",
        "locationSlug": "mossdeep-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "dusk-stone",
        "location": "",
        "locationSlug": "mt-pyre",
        "inBag": true,
        "used": false
      },
      {
        "id": "item:sceptilite",
        "location": "",
        "locationSlug": "route-120",
        "inBag": true,
        "used": false
      },
      {
        "id": "item:absolite",
        "location": "",
        "locationSlug": "safari-zone",
        "inBag": false,
        "used": false
      }
    ],
    [
      {
        "id": "fire-stone",
        "location": "",
        "locationSlug": "fiery-path",
        "inBag": false,
        "used": true
      },
      {
        "id": "water-stone",
        "location": "",
        "locationSlug": "sootopolis-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "water-stone",
        "location": "",
        "locationSlug": "abandoned-ship",
        "inBag": true,
        "used": false
      },
      {
        "id": "thunder-stone",
        "location": "",
        "locationSlug": "new-mauville",
        "inBag": true,
        "used": true
      },
      {
        "id": "leaf-stone",
        "location": "",
        "locationSlug": "fortree-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "shiny-stone",
        "location": "",
        "locationSlug": "shoal-cave",
        "inBag": true,
        "used": false
      },
      {
        "id": "dawn-stone",
        "location": "",
        "locationSlug": "victory-road",
        "inBag": false,
        "used": false
      },
      {
        "id": "item:kings-rock",
        "location": "",
        "locationSlug": "mossdeep-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "item:blazikenite",
        "location": "",
        "locationSlug": "fallarbor-town",
        "inBag": true,
        "used": false
      },
      {
        "id": "item:manectite",
        "location": "",
        "locationSlug": "route-110",
        "inBag": true,
        "used": false
      }
    ],
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
        "inBag": false,
        "used": true
      },
      {
        "id": "thunder-stone",
        "location": "",
        "locationSlug": "new-mauville",
        "inBag": true,
        "used": false
      },
      {
        "id": "leaf-stone",
        "location": "",
        "locationSlug": "fortree-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "moon-stone",
        "location": "",
        "locationSlug": "meteor-falls",
        "inBag": true,
        "used": true
      },
      {
        "id": "sun-stone",
        "location": "",
        "locationSlug": "mossdeep-city",
        "inBag": true,
        "used": false
      },
      {
        "id": "item:oval-stone",
        "location": "",
        "locationSlug": "day-care",
        "inBag": true,
        "used": false
      },
      {
        "id": "item:metal-coat",
        "location": "",
        "locationSlug": "new-mauville",
        "inBag": false,
        "used": false
      },
      {
        "id": "item:swampertite",
        "location": "",
        "locationSlug": "route-123",
        "inBag": true,
        "used": false
      },
      {
        "id": "item:altarianite",
        "location": "",
        "locationSlug": "lilycove-city",
        "inBag": true,
        "used": false
      }
    ]
  ],
  "runStartedAt": 1793318400000
}$state$::jsonb,
    3,
    12,
    '10000000-0000-0000-0000-000000000001'
  );

-- Solo fixture: one member per encounter and one column for player data.
insert into public.tracker_states (tracker_id, state, schema_version, revision, updated_by)
values (
  '30000000-0000-0000-0000-000000000006',
  $state${
  "team": [
    {
      "id": "f3b6dd44-0b8a-5b8b-887a-17671ebba4d2",
      "locationSlug": "kanto-route-1",
      "members": [
        {
          "id": 16,
          "nickname": "Gust"
        }
      ]
    },
    {
      "id": "78623b02-fc35-51a3-8e77-d6e17077c8b1",
      "locationSlug": "kanto-route-2",
      "members": [
        {
          "id": 10,
          "nickname": "Crawler"
        }
      ]
    },
    {
      "id": "c0ef44aa-6ace-5089-8ad3-099ff11c1baa",
      "locationSlug": "viridian-forest",
      "members": [
        {
          "id": 25,
          "nickname": "Sparky"
        }
      ]
    }
  ],
  "box": [
    {
      "id": "9397b583-b0e7-5d84-8689-98630c76312e",
      "locationSlug": "kanto-route-3",
      "members": [
        {
          "id": 12,
          "nickname": "Flutter"
        }
      ]
    },
    {
      "id": "41883814-eecd-558d-8b34-5452a9f344b9",
      "locationSlug": "kanto-route-4",
      "members": [
        {
          "id": 129,
          "nickname": "Splashy"
        }
      ]
    }
  ],
  "graveyard": [
    {
      "id": "9b669404-dcff-53e9-812c-9b341ab123f1",
      "locationSlug": "mt-moon",
      "members": [
        {
          "id": 74,
          "nickname": "Boulder"
        }
      ],
      "deathPlayerIndex": 0,
      "isLost": false
    },
    {
      "id": "2647dff7-1cf4-5556-87b2-cefa9c6cf249",
      "locationSlug": "rock-tunnel",
      "members": [
        {
          "id": 66,
          "nickname": "Flex"
        }
      ],
      "deathPlayerIndex": 0,
      "isLost": false
    },
    {
      "id": "f6ebde97-570c-5ed3-8e54-40a17b5278f8",
      "locationSlug": "pokemon-tower",
      "members": [
        {
          "id": 92,
          "nickname": ""
        }
      ],
      "isLost": true
    }
  ],
  "rules": [
    "Only the first Pokémon encountered on each route/area may be caught.",
    "Pokémon that have already been caught/encountered (or are in the same evolution line) do not count as route Pokémon and may be rerolled. Maximum 2 additional attempts.",
    "Gift/static Pokémon and fossils do not count as area Pokémon and may be used. Identical statics and fossils may only be used once.",
    "If a Pokémon flees or faints during the catch attempt, the area is lost.",
    "Every Pokémon receives a nickname.",
    "Defeated Pokémon are considered dead and must be placed in a grave box.",
    "Pokémon, items, and trainers are randomized.",
    "The bonus shop is randomized; each item may only be purchased once.",
    "The level cap must not be exceeded (1 Pokémon may match the upper level, the rest must match the lower if existing). Overleveled Pokémon may not be used until the level cap increases again.",
    "Rare Candy may be used directly BEFORE Gym Leader/Elite Four/Champion/Rival fights. They may also be used to bring Pokémon up to the level cap of the last gym.",
    "Battle style is set to 'Shift'.",
    "Items in battle may only be used if the opponent also uses one. In the Pokémon League, a maximum of 20 items may be used outside of battles.",
    "Shiny Pokémon may always be caught.",
    "The challenge is lost when the entire team of one player is defeated.",
    "The challenge is completed when the Champion of the region has been defeated.",
    "The challenge starts as soon as you receive your first Poké Balls.",
    "No Googling during Gym/Elite Four/Rival/Boss fights.",
    "Maximum of 2 legendary Pokémon in your team."
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
      "done": false
    },
    {
      "id": 5,
      "arena": "gym_5",
      "level": "43/39",
      "done": false
    },
    {
      "id": 6,
      "arena": "gym_6",
      "level": "43/38",
      "done": false
    },
    {
      "id": 7,
      "arena": "gym_7",
      "level": "47/42",
      "done": false
    },
    {
      "id": 8,
      "arena": "gym_8",
      "level": "50/45",
      "done": false
    },
    {
      "id": 9,
      "arena": "elite_four_lorelei",
      "level": "54/52",
      "done": false
    },
    {
      "id": 10,
      "arena": "elite_four_bruno",
      "level": "56/54",
      "done": false
    },
    {
      "id": 11,
      "arena": "elite_four_agatha",
      "level": "58/56",
      "done": false
    },
    {
      "id": 12,
      "arena": "elite_four_lance",
      "level": "60/58",
      "done": false
    },
    {
      "id": 13,
      "arena": "champion_blue",
      "level": "63/61",
      "done": false
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
      "done": false,
      "revealed": false
    },
    {
      "id": 5,
      "location": "silph_co",
      "rival": "blue",
      "level": "40/38",
      "done": false,
      "revealed": false
    },
    {
      "id": 6,
      "location": "route_22",
      "rival": "blue",
      "level": "53/47",
      "done": false,
      "revealed": false
    }
  ],
  "stats": {
    "runs": 2,
    "best": 3,
    "top4Items": [
      0
    ],
    "deaths": [
      2
    ],
    "sumDeaths": [
      5
    ],
    "legendaryEncounters": 0
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
        "revived": false,
        "pokemonId": null
      },
      {
        "fossilId": "helix-fossil",
        "location": "",
        "locationSlug": "",
        "inBag": true,
        "revived": false,
        "pokemonId": null
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
    ]
  ],
  "runStartedAt": 1793491200000
}$state$::jsonb,
  3,
  1,
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
