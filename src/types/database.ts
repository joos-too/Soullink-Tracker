export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          display_name_requires_update: boolean;
          firebase_uid: string | null;
          id: string;
          last_login_at: string;
          multi_locale_search: boolean;
          use_generation_sprites: boolean;
          use_sprites_in_team_table: boolean;
          wiki_id: string | null;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          display_name_requires_update?: boolean;
          firebase_uid?: string | null;
          id: string;
          last_login_at?: string;
          multi_locale_search?: boolean;
          use_generation_sprites?: boolean;
          use_sprites_in_team_table?: boolean;
          wiki_id?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          display_name_requires_update?: boolean;
          firebase_uid?: string | null;
          id?: string;
          last_login_at?: string;
          multi_locale_search?: boolean;
          use_generation_sprites?: boolean;
          use_sprites_in_team_table?: boolean;
          wiki_id?: string | null;
        };
        Relationships: [];
      };
      rulesets: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          owner_id: string;
          rules: string[];
          tags: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id: string;
          name: string;
          owner_id: string;
          rules: string[];
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          rules?: string[];
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rulesets_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_members: {
        Row: {
          added_at: string;
          role: Database["public"]["Enums"]["tracker_role"];
          settings: Json;
          tracker_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          role: Database["public"]["Enums"]["tracker_role"];
          settings?: Json;
          tracker_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          role?: Database["public"]["Enums"]["tracker_role"];
          settings?: Json;
          tracker_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_members_tracker_id_fkey";
            columns: ["tracker_id"];
            isOneToOne: false;
            referencedRelation: "trackers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_states: {
        Row: {
          revision: number;
          schema_version: number;
          state: Json;
          summary: Json;
          tracker_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          revision?: number;
          schema_version?: number;
          state: Json;
          summary?: Json;
          tracker_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          revision?: number;
          schema_version?: number;
          state?: Json;
          summary?: Json;
          tracker_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_states_tracker_id_fkey";
            columns: ["tracker_id"];
            isOneToOne: true;
            referencedRelation: "trackers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_states_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trackers: {
        Row: {
          all_pokemon_and_items: boolean;
          created_at: string;
          created_by: string;
          game_version_id: string;
          id: string;
          is_public: boolean;
          player_names: string[];
          ruleset_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          all_pokemon_and_items?: boolean;
          created_at?: string;
          created_by: string;
          game_version_id: string;
          id?: string;
          is_public?: boolean;
          player_names: string[];
          ruleset_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          all_pokemon_and_items?: boolean;
          created_at?: string;
          created_by?: string;
          game_version_id?: string;
          id?: string;
          is_public?: boolean;
          player_names?: string[];
          ruleset_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trackers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_tracker: {
        Args: {
          p_all_pokemon_and_items: boolean;
          p_game_version_id: string;
          p_initial_state: Json;
          p_invites?: Json;
          p_player_names: string[];
          p_ruleset_id: string;
          p_title: string;
        };
        Returns: string;
      };
      delete_tracker: { Args: { p_tracker_id: string }; Returns: undefined };
      invite_tracker_member: {
        Args: {
          p_email: string;
          p_role: Database["public"]["Enums"]["tracker_role"];
          p_tracker_id: string;
        };
        Returns: {
          added_at: string;
          role: Database["public"]["Enums"]["tracker_role"];
          settings: Json;
          tracker_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "tracker_members";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      list_tracker_members: {
        Args: { p_tracker_id: string };
        Returns: {
          added_at: string;
          display_name: string;
          email: string;
          role: Database["public"]["Enums"]["tracker_role"];
          user_id: string;
        }[];
      };
      remove_tracker_member: {
        Args: { p_tracker_id: string; p_user_id: string };
        Returns: undefined;
      };
      set_tracker_visibility: {
        Args: { p_is_public: boolean; p_tracker_id: string };
        Returns: {
          all_pokemon_and_items: boolean;
          created_at: string;
          created_by: string;
          game_version_id: string;
          id: string;
          is_public: boolean;
          player_names: string[];
          ruleset_id: string | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "trackers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_tracker_state: {
        Args: {
          p_expected_revision: number;
          p_state: Json;
          p_tracker_id: string;
        };
        Returns: {
          revision: number;
          schema_version: number;
          state: Json;
          summary: Json;
          tracker_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "tracker_states";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      tracker_role: "owner" | "editor" | "guest";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      tracker_role: ["owner", "editor", "guest"],
    },
  },
} as const;
