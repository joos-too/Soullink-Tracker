import type { GameVersion } from "@/types";

// reused Data Objects across game versions
const GEN2_LEVELCAPS = [
  {
    id: 1,
    arena: "gym_1",
    level: "9/7",
  },
  {
    id: 2,
    arena: "gym_2",
    level: "16/14",
  },
  {
    id: 3,
    arena: "gym_3",
    level: "20/18",
  },
  {
    id: 4,
    arena: "gym_4",
    level: "25/23",
  },
  {
    id: 5,
    arena: "gym_5",
    level: "30/27",
  },
  {
    id: 6,
    arena: "gym_6",
    level: "35/30",
  },
  {
    id: 7,
    arena: "gym_7",
    level: "31/29",
  },
  {
    id: 8,
    arena: "gym_8",
    level: "40/37",
  },
  {
    id: 9,
    arena: "elite_four_will",
    level: "42/41",
  },
  {
    id: 10,
    arena: "elite_four_koga",
    level: "44/43",
  },
  {
    id: 11,
    arena: "elite_four_bruno",
    level: "46/43",
  },
  {
    id: 12,
    arena: "elite_four_karen",
    level: "47/45",
  },
  {
    id: 13,
    arena: "champion_lance",
    level: "50/46",
  },
];
const GEN2_RIVALCAPS = [
  {
    id: 1,
    location: "azalea_town",
    rival: "silver",
    level: "16/14",
  },
  {
    id: 2,
    location: "burned_tower",
    rival: "silver",
    level: "22/20",
  },
  {
    id: 3,
    location: "goldenrod_tunnel",
    rival: "silver",
    level: "32/30",
  },
  {
    id: 4,
    location: "victory_road",
    rival: "silver",
    level: "38/35",
  },
];

export const GAME_VERSIONS: Record<string, GameVersion> = {
  gen1_rb: {
    id: "gen1_rb",
    badgeSet: "gen1/rby",
    badge: {
      segments: [
        {
          badgeSegmentName: "red",
          bgColor: "#ff6b6b",
          textColor: "#000000",
          borderColor: "#5c0000",
        },
        {
          badgeSegmentName: "blue",
          bgColor: "#1d89e4",
          textColor: "#000000",
          borderColor: "#053b78",
        },
      ],
    },
    selectionColors: {
      red: {
        bgColor: "#f44236",
        textColor: "#ffffff",
        borderColor: "#f44236",
      },
      blue: {
        bgColor: "#1d89e4",
        textColor: "#ffffff",
        borderColor: "#1d89e4",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "14/12",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "21/18",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "24/21",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "29/24",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "43/39",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "43/38",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "47/42",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "50/45",
      },
      {
        id: 9,
        arena: "elite_four_lorelei",
        level: "56/54",
      },
      {
        id: 10,
        arena: "elite_four_bruno",
        level: "58/56",
      },
      {
        id: 11,
        arena: "elite_four_agatha",
        level: "60/58",
      },
      {
        id: 12,
        arena: "elite_four_lance",
        level: "62/60",
      },
      {
        id: 13,
        arena: "champion_blue",
        level: "65/63",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "route_22",
        rival: "blue",
        level: "9/8",
      },
      {
        id: 2,
        location: "cerulean_city",
        rival: "blue",
        level: "18/17",
      },
      {
        id: 3,
        location: "s_s_anne",
        rival: "blue",
        level: "20/19",
      },
      {
        id: 4,
        location: "pokemon_tower",
        rival: "blue",
        level: "25/23",
      },
      {
        id: 5,
        location: "silph_co",
        rival: "blue",
        level: "40/38",
      },
      {
        id: 6,
        location: "route_22",
        rival: "blue",
        level: "53/50",
      },
    ],
  },
  gen1_y: {
    id: "gen1_y",
    badgeSet: "gen1/rby",
    badge: {
      segments: [
        {
          badgeSegmentName: "yellow",
          bgColor: "#ffff00",
          textColor: "#000000",
          borderColor: "#766a00",
        },
      ],
    },
    selectionColors: {
      yellow: {
        bgColor: "#ffbe00",
        textColor: "#ffffff",
        borderColor: "#ffbe00",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "12/10",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "21/18",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "28/28",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "32/30",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "50/48",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "50/50",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "54/50",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "55/53",
      },
      {
        id: 9,
        arena: "elite_four_lorelei",
        level: "56/54",
      },
      {
        id: 10,
        arena: "elite_four_bruno",
        level: "58/56",
      },
      {
        id: 11,
        arena: "elite_four_agatha",
        level: "60/58",
      },
      {
        id: 12,
        arena: "elite_four_lance",
        level: "62/60",
      },
      {
        id: 13,
        arena: "champion_blue",
        level: "65/63",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "route_22",
        rival: "blue",
        level: "9/8",
      },
      {
        id: 2,
        location: "cerulean_city",
        rival: "blue",
        level: "18/17",
      },
      {
        id: 3,
        location: "s_s_anne",
        rival: "blue",
        level: "20/19",
      },
      {
        id: 4,
        location: "pokemon_tower",
        rival: "blue",
        level: "25/23",
      },
      {
        id: 5,
        location: "silph_co",
        rival: "blue",
        level: "40/38",
      },
      {
        id: 6,
        location: "route_22",
        rival: "blue",
        level: "53/50",
      },
    ],
  },
  gen2_gs: {
    id: "gen2_gs",
    badgeSet: "gen2/gsc",
    badge: {
      segments: [
        {
          badgeSegmentName: "gold",
          bgColor: "#d3af37",
          textColor: "#000000",
          borderColor: "#786200",
        },
        {
          badgeSegmentName: "silver",
          bgColor: "#b0bfc6",
          textColor: "#000000",
          borderColor: "#5a686e",
        },
      ],
    },
    selectionColors: {
      gold: {
        bgColor: "#d3af37",
        textColor: "#ffffff",
        borderColor: "#d3af37",
      },
      silver: {
        bgColor: "#b0bfc6",
        textColor: "#ffffff",
        borderColor: "#b0bfc6",
      },
    },
    levelCaps: GEN2_LEVELCAPS,
    rivalCaps: GEN2_RIVALCAPS,
  },
  gen2_c: {
    id: "gen2_c",
    badgeSet: "gen2/gsc",
    badge: {
      segments: [
        {
          badgeSegmentName: "crystal",
          bgColor: "#87cefa",
          textColor: "#000000",
          borderColor: "#064973",
        },
      ],
    },
    selectionColors: {
      crystal: {
        bgColor: "#4dd0e2",
        textColor: "#ffffff",
        borderColor: "#4dd0e2",
      },
    },
    levelCaps: GEN2_LEVELCAPS,
    rivalCaps: GEN2_RIVALCAPS,
  },
  gen3_rusa: {
    id: "gen3_rusa",
    badgeSet: "gen3/rusaem",
    defaultRivalPreferences: { brendan_may: "female" },
    badge: {
      segments: [
        {
          badgeSegmentName: "ruby",
          bgColor: "#bf0109",
          textColor: "#ffffff",
          borderColor: "#490004",
        },
        {
          badgeSegmentName: "sapphire",
          bgColor: "#3862ae",
          textColor: "#ffffff",
          borderColor: "#072660",
        },
      ],
    },
    selectionColors: {
      ruby: {
        bgColor: "#cf0304",
        textColor: "#ffffff",
        borderColor: "#cf0304",
      },
      sapphire: {
        bgColor: "#3c3696",
        textColor: "#ffffff",
        borderColor: "#3c3696",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "15/14",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "18/17",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "23/20",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "28/26",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "31/30",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "33/32",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "42",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "43/42",
      },
      {
        id: 9,
        arena: "elite_four_sidney",
        level: "49/48",
      },
      {
        id: 10,
        arena: "elite_four_phoebe",
        level: "51/50",
      },
      {
        id: 11,
        arena: "elite_four_glacia",
        level: "53/52",
      },
      {
        id: 12,
        arena: "elite_four_drake",
        level: "55/54",
      },
      {
        id: 13,
        arena: "champion_steven",
        level: "58/56",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "mauville_city",
        rival: "wally",
        level: "16",
      },
      {
        id: 2,
        location: "route_110",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "20/18",
      },
      {
        id: 3,
        location: "route_119",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "31/29",
      },
      {
        id: 4,
        location: "lilycove_city",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "34/32",
      },
      {
        id: 5,
        location: "victory_road",
        rival: "wally",
        level: "45/41",
      },
    ],
  },
  gen3_em: {
    id: "gen3_em",
    badgeSet: "gen3/rusaem",
    defaultRivalPreferences: { brendan_may: "female" },
    badge: {
      segments: [
        {
          badgeSegmentName: "emerald",
          bgColor: "#017f3f",
          textColor: "#ffffff",
          borderColor: "#033d1d",
        },
      ],
    },
    selectionColors: {
      emerald: {
        bgColor: "#078347",
        textColor: "#ffffff",
        borderColor: "#078347",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "15/12",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "19/16",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "24/22",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "29/26",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "31/29",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "33/31",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "42",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "46/43",
      },
      {
        id: 9,
        arena: "elite_four_sidney",
        level: "49/48",
      },
      {
        id: 10,
        arena: "elite_four_phoebe",
        level: "51/50",
      },
      {
        id: 11,
        arena: "elite_four_glacia",
        level: "53/52",
      },
      {
        id: 12,
        arena: "elite_four_drake",
        level: "55/54",
      },
      {
        id: 13,
        arena: "champion_wallace",
        level: "58/56",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "mauville_city",
        rival: "wally",
        level: "16",
      },
      {
        id: 2,
        location: "rustboro_city",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "15/13",
      },
      {
        id: 3,
        location: "route_110",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "20/18",
      },
      {
        id: 4,
        location: "route_119",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "31/29",
      },
      {
        id: 5,
        location: "lilycove_city",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "34/32",
      },
      {
        id: 6,
        location: "victory_road",
        rival: "wally",
        level: "45/41",
      },
    ],
  },
  gen3_frlg: {
    id: "gen3_frlg",
    badgeSet: "gen1/rby",
    badge: {
      segments: [
        {
          badgeSegmentName: "fire_red",
          bgColor: "#dd7521",
          textColor: "#000000",
          borderColor: "#930707",
        },
        {
          badgeSegmentName: "leaf_green",
          bgColor: "#b9d101",
          textColor: "#000000",
          borderColor: "#738205",
        },
      ],
    },
    selectionColors: {
      fire_red: {
        bgColor: "#f44236",
        textColor: "#ffffff",
        borderColor: "#f44236",
      },
      leaf_green: {
        bgColor: "#4cb050",
        textColor: "#ffffff",
        borderColor: "#4cb050",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "14/12",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "21/18",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "24/21",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "29/24",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "43/39",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "43/38",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "47/42",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "50/45",
      },
      {
        id: 9,
        arena: "elite_four_lorelei",
        level: "54/52",
      },
      {
        id: 10,
        arena: "elite_four_bruno",
        level: "56/54",
      },
      {
        id: 11,
        arena: "elite_four_agatha",
        level: "58/56",
      },
      {
        id: 12,
        arena: "elite_four_lance",
        level: "60/58",
      },
      {
        id: 13,
        arena: "champion_blue",
        level: "63/61",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "route_22",
        rival: "blue",
        level: "9/8",
      },
      {
        id: 1,
        location: "cerulean_city",
        rival: "blue",
        level: "18/17",
      },
      {
        id: 2,
        location: "s_s_anne",
        rival: "blue",
        level: "20/19",
      },
      {
        id: 3,
        location: "pokemon_tower",
        rival: "blue",
        level: "25/23",
      },
      {
        id: 4,
        location: "silph_co",
        rival: "blue",
        level: "40/38",
      },
      {
        id: 5,
        location: "route_22",
        rival: "blue",
        level: "53/47",
      },
    ],
  },
  gen4_dp: {
    id: "gen4_dp",
    badgeSet: "gen4/dppt",
    badge: {
      segments: [
        {
          badgeSegmentName: "diamond",
          bgColor: "#00bcd5",
          textColor: "#ffffff",
          borderColor: "#007c8b",
        },
        {
          badgeSegmentName: "pearl",
          bgColor: "#aa47bc",
          textColor: "#ffffff",
          borderColor: "#6e2e78",
        },
      ],
    },
    selectionColors: {
      diamond: {
        bgColor: "#00bcd5",
        textColor: "#ffffff",
        borderColor: "#00bcd5",
      },
      pearl: {
        bgColor: "#aa47bc",
        textColor: "#ffffff",
        borderColor: "#aa47bc",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "14/12",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "22/19",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "30/27",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "30/27",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "36/34",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "39/36",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "42/40",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "49/47",
      },
      {
        id: 9,
        arena: "elite_four_aaron",
        level: "57/54",
      },
      {
        id: 10,
        arena: "elite_four_bertha",
        level: "59/56",
      },
      {
        id: 11,
        arena: "elite_four_flint",
        level: "61/58",
      },
      {
        id: 12,
        arena: "elite_four_lucian",
        level: "63/60",
      },
      {
        id: 13,
        arena: "champion_cynthia",
        level: "66/63",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "route_209",
        rival: "barry",
        level: "9/7",
      },
      {
        id: 2,
        location: "hearthome_city",
        rival: "barry",
        level: "21/20",
      },
      {
        id: 3,
        location: "pastoria_city",
        rival: "barry",
        level: "28/26",
      },
      {
        id: 4,
        location: "canalive_city",
        rival: "barry",
        level: "35/32",
      },
      {
        id: 5,
        location: "pokemon_league",
        rival: "barry",
        level: "53/51",
      },
    ],
  },
  gen4_pt: {
    id: "gen4_pt",
    badgeSet: "gen4/dppt",
    badge: {
      segments: [
        {
          badgeSegmentName: "platinum",
          bgColor: "#aabbd1",
          textColor: "#000000",
          borderColor: "#6f5454",
        },
      ],
    },
    selectionColors: {
      platinum: {
        bgColor: "#c9c1b6",
        textColor: "#ffffff",
        borderColor: "#c9c1b6",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "14/12",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "22/20",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "26/24",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "32/29",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "37/34",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "41/38",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "44/42",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "50/48",
      },
      {
        id: 9,
        arena: "elite_four_aaron",
        level: "53/51",
      },
      {
        id: 10,
        arena: "elite_four_bertha",
        level: "55/53",
      },
      {
        id: 11,
        arena: "elite_four_flint",
        level: "57/55",
      },
      {
        id: 12,
        arena: "elite_four_lucian",
        level: "59/56",
      },
      {
        id: 13,
        arena: "champion_cynthia",
        level: "62/58",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "route_209",
        rival: "barry",
        level: "9/7",
      },
      {
        id: 2,
        location: "hearthome_city",
        rival: "barry",
        level: "27/25",
      },
      {
        id: 3,
        location: "pastoria_city",
        rival: "barry",
        level: "36/34",
      },
      {
        id: 4,
        location: "canalive_city",
        rival: "barry",
        level: "38/37",
      },
      {
        id: 5,
        location: "pokemon_league",
        rival: "barry",
        level: "51/49",
      },
    ],
  },
  gen4_hgss: {
    id: "gen4_hgss",
    badgeSet: "gen2/gsk",
    badge: {
      segments: [
        {
          badgeSegmentName: "heart_gold",
          bgColor: "#eedd82",
          textColor: "#000000",
          borderColor: "#877b37",
        },
        {
          badgeSegmentName: "soul_silver",
          bgColor: "#b9d3ee",
          textColor: "#3f566f",
          borderColor: "#3f566f",
        },
      ],
    },
    selectionColors: {
      heart_gold: {
        bgColor: "#d3af37",
        textColor: "#ffffff",
        borderColor: "#d3af37",
      },
      soul_silver: {
        bgColor: "#b0bfc6",
        textColor: "#ffffff",
        borderColor: "#b0bfc6",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "13/9",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "17/15",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "19/17",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "25/23",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "31/29",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "35/30",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "34/32",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "41/38",
      },
      {
        id: 9,
        arena: "elite_four_will",
        level: "42/41",
      },
      {
        id: 10,
        arena: "elite_four_koga",
        level: "44/43",
      },
      {
        id: 11,
        arena: "elite_four_bruno",
        level: "46/43",
      },
      {
        id: 12,
        arena: "elite_four_karen",
        level: "47/45",
      },
      {
        id: 13,
        arena: "champion_lance",
        level: "50/49",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "azalea_town",
        rival: "silver",
        level: "18/16",
      },
      {
        id: 2,
        location: "burned_tower",
        rival: "silver",
        level: "22/20",
      },
      {
        id: 3,
        location: "goldenrod_tunnel",
        rival: "silver",
        level: "34/32",
      },
      {
        id: 4,
        location: "victory_road",
        rival: "silver",
        level: "40/38",
      },
    ],
  },
  gen5_bw: {
    id: "gen5_bw",
    badgeSet: "gen5/bw",
    badge: {
      segments: [
        {
          badgeSegmentName: "black",
          bgColor: "#000000",
          textColor: "#ffffff",
          borderColor: "#000000",
        },
        {
          badgeSegmentName: "white",
          bgColor: "#ffffff",
          textColor: "#000000",
          borderColor: "#000000",
        },
      ],
    },
    selectionColors: {
      black: {
        bgColor: "#424242",
        textColor: "#ffffff",
        borderColor: "#424242",
      },
      white: {
        bgColor: "#eeeeee",
        textColor: "#000000",
        borderColor: "#eeeeee",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "14/12",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "20/18",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "23/21",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "27/25",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "31/29",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "35/33",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "39/37",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "43/41",
      },
      {
        id: 9,
        arena: "elite_four_shauntal",
        level: "50/48",
      },
      {
        id: 10,
        arena: "elite_four_grimsley",
        level: "50/48",
      },
      {
        id: 11,
        arena: "elite_four_caitlin",
        level: "50/48",
      },
      {
        id: 12,
        arena: "elite_four_marshal",
        level: "50/48",
      },
      {
        id: 13,
        arena: "champion_n",
        level: "52/50",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "accumula_town",
        rival: "n",
        level: "7",
      },
      {
        id: 2,
        location: "route_2",
        rival: "bianca",
        level: "7/6",
      },
      {
        id: 3,
        location: "striation_city",
        rival: "cheren",
        level: "8",
      },
      {
        id: 5,
        location: "route_3",
        rival: "cheren",
        level: "14/12",
      },
      {
        id: 4,
        location: "nacrene_city",
        rival: "n",
        level: "13",
      },
      {
        id: 6,
        location: "route_4",
        rival: "bianca",
        level: "20/18",
      },
      {
        id: 7,
        location: "route_4",
        rival: "cheren",
        level: "22/20",
      },
      {
        id: 8,
        location: "nimbasa_city",
        rival: "n",
        level: "22",
      },
      {
        id: 9,
        location: "route_5",
        rival: "cheren",
        level: "26/24",
      },
      {
        id: 10,
        location: "driftveil_city",
        rival: "bianca",
        level: "28/26",
      },
      {
        id: 11,
        location: "chargestone_cave",
        rival: "n",
        level: "28",
      },
      {
        id: 12,
        location: "twist_mountain",
        rival: "cheren",
        level: "35/33",
      },
      {
        id: 13,
        location: "route_8",
        rival: "bianca",
        level: "40/38",
      },
      {
        id: 14,
        location: "route_10",
        rival: "cheren",
        level: "45/43",
      },
    ],
  },
  gen5_b2w2: {
    id: "gen5_b2w2",
    badgeSet: "gen5/b2w2",
    badge: {
      segments: [
        {
          badgeSegmentName: "black_2",
          bgColor: "#000000",
          textColor: "#bbe7ff",
          borderColor: "#3f566f",
        },
        {
          badgeSegmentName: "white_2",
          bgColor: "#ffffff",
          textColor: "#dd151b",
          borderColor: "#ed1c24",
        },
      ],
    },
    selectionColors: {
      black_2: {
        bgColor: "#424242",
        textColor: "#ffffff",
        borderColor: "#424242",
      },
      white_2: {
        bgColor: "#eeeeee",
        textColor: "#000000",
        borderColor: "#eeeeee",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "13/11",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "18/16",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "24/22",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "30/28",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "33/31",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "39/37",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "48/46",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "51/49",
      },
      {
        id: 9,
        arena: "elite_four_shauntal",
        level: "58/56",
      },
      {
        id: 10,
        arena: "elite_four_grimsley",
        level: "58/56",
      },
      {
        id: 11,
        arena: "elite_four_caitlin",
        level: "58/56",
      },
      {
        id: 12,
        arena: "elite_four_marshal",
        level: "58/56",
      },
      {
        id: 13,
        arena: "champion_iris",
        level: "59/57",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "floccesy_ranch",
        rival: "hugh",
        level: "8",
      },
      {
        id: 2,
        location: "undella_town",
        rival: "hugh",
        level: "41/39",
      },
      {
        id: 3,
        location: "victory_road",
        rival: "hugh",
        level: "57/55",
      },
    ],
  },
  gen6_xy: {
    id: "gen6_xy",
    badgeSet: "gen6/xy",
    defaultRivalPreferences: { calem_serena: "female" },
    badge: {
      segments: [
        {
          badgeSegmentName: "x",
          bgColor: "#dff3f4",
          textColor: "#005e9b",
          borderColor: "#005e9b",
        },
        {
          badgeSegmentName: "y",
          bgColor: "#e9b2bf",
          textColor: "#871223",
          borderColor: "#871223",
        },
      ],
    },
    selectionColors: {
      x: {
        bgColor: "#325ca6",
        textColor: "#ffffff",
        borderColor: "#325ca6",
      },
      y: {
        bgColor: "#d41235",
        textColor: "#ffffff",
        borderColor: "#d41235",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "12/10",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "25",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "32/29",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "34/31",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "37/35",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "42/39",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "48/45",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "59/56",
      },
      {
        id: 9,
        arena: "elite_four_wikstrom",
        level: "65/63",
      },
      {
        id: 10,
        arena: "elite_four_malva",
        level: "65/63",
      },
      {
        id: 11,
        arena: "elite_four_drasna",
        level: "65/63",
      },
      {
        id: 12,
        arena: "elite_four_siebold",
        level: "65/63",
      },
      {
        id: 13,
        arena: "champion_diantha",
        level: "68/66",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "route_5",
        rival: "tierno",
        level: "12",
      },
      {
        id: 2,
        location: "route_7",
        rival: "tierno",
        level: "16/14",
      },
      {
        id: 3,
        location: "route_7",
        rival: "trevor",
        level: "16/14",
      },
      {
        id: 6,
        location: "tower_of_mastery",
        rival: {
          key: "calem_serena",
          options: {
            male: "calem",
            female: "serena",
          },
        },
        level: "30/28",
      },
      {
        id: 7,
        location: "coumarine_city",
        rival: {
          key: "calem_serena",
          options: {
            male: "calem",
            female: "serena",
          },
        },
        level: "33/31",
      },
      {
        id: 8,
        location: "route_14",
        rival: {
          key: "calem_serena",
          options: {
            male: "calem",
            female: "serena",
          },
        },
        level: "37/35",
      },
      {
        id: 9,
        location: "anistar_city",
        rival: {
          key: "calem_serena",
          options: {
            male: "calem",
            female: "serena",
          },
        },
        level: "46/44",
      },
      {
        id: 10,
        location: "route_19",
        rival: "shauna",
        level: "51/49",
      },
      {
        id: 11,
        location: "route_19",
        rival: "trevor",
        level: "51/49",
      },
      {
        id: 12,
        location: "route_19",
        rival: "tierno",
        level: "52/49",
      },
      {
        id: 13,
        location: "victory_road",
        rival: {
          key: "calem_serena",
          options: {
            male: "calem",
            female: "serena",
          },
        },
        level: "61/59",
      },
    ],
  },
  gen6_oras: {
    id: "gen6_oras",
    badgeSet: "gen3/rusaem",
    defaultRivalPreferences: { brendan_may: "female" },
    badge: {
      segments: [
        {
          badgeSegmentName: "omega_ruby",
          bgColor: "#bf0109",
          textColor: "#f8f688",
          borderColor: "#4f1734",
        },
        {
          badgeSegmentName: "alpha_sapphire",
          bgColor: "#3862ae",
          textColor: "#f8f688",
          borderColor: "#0a1535",
        },
      ],
    },
    selectionColors: {
      omega_ruby: {
        bgColor: "#cf0304",
        textColor: "#ffffff",
        borderColor: "#cf0304",
      },
      alpha_sapphire: {
        bgColor: "#3c3696",
        textColor: "#ffffff",
        borderColor: "#3c3696",
      },
    },
    levelCaps: [
      {
        id: 1,
        arena: "gym_1",
        level: "14/12",
      },
      {
        id: 2,
        arena: "gym_2",
        level: "16/14",
      },
      {
        id: 3,
        arena: "gym_3",
        level: "21/19",
      },
      {
        id: 4,
        arena: "gym_4",
        level: "28/26",
      },
      {
        id: 5,
        arena: "gym_5",
        level: "30/28",
      },
      {
        id: 6,
        arena: "gym_6",
        level: "35/33",
      },
      {
        id: 7,
        arena: "gym_7",
        level: "45",
      },
      {
        id: 8,
        arena: "gym_8",
        level: "46/44",
      },
      {
        id: 9,
        arena: "elite_four_sidney",
        level: "52/50",
      },
      {
        id: 10,
        arena: "elite_four_phoebe",
        level: "53/51",
      },
      {
        id: 11,
        arena: "elite_four_glacia",
        level: "54/52",
      },
      {
        id: 12,
        arena: "elite_four_drake",
        level: "55/53",
      },
      {
        id: 13,
        arena: "champion_steven",
        level: "59/57",
      },
    ],
    rivalCaps: [
      {
        id: 1,
        location: "route_110",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "20/18",
      },
      {
        id: 2,
        location: "mauville_city",
        rival: "wally",
        level: "17",
      },
      {
        id: 3,
        location: "route_119",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "33/31",
      },
      {
        id: 4,
        location: "lilycove_city",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "38/37",
      },
      {
        id: 5,
        location: "victory_road",
        rival: "wally",
        level: "48/46",
      },
      {
        id: 6,
        location: "route_103",
        rival: {
          key: "brendan_may",
          options: {
            male: "brendan",
            female: "may",
          },
        },
        level: "50/48",
      },
    ],
  },
};
