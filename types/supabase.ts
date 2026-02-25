export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      city_sections: {
        Row: {
          id: string;
          step_id: string;
          section_type: string;
          content: string;
          place_rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          step_id: string;
          section_type: string;
          content?: string;
          place_rating?: number | null;
        };
        Update: {
          step_id?: string;
          section_type?: string;
          content?: string;
          place_rating?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      book_sections: {
        Row: {
          id: string;
          step_id: string;
          texte: string;
          photos: string[];
          police_titre: "serif" | "sans";
          police_sous_titre: "serif" | "sans";
          gras: boolean;
          italique: boolean;
          layout: "single" | "grid2" | "grid3";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          step_id: string;
          texte?: string;
          photos?: string[];
          police_titre?: "serif" | "sans";
          police_sous_titre?: "serif" | "sans";
          gras?: boolean;
          italique?: boolean;
          layout?: "single" | "grid2" | "grid3";
        };
        Update: {
          step_id?: string;
          texte?: string;
          photos?: string[];
          police_titre?: "serif" | "sans";
          police_sous_titre?: "serif" | "sans";
          gras?: boolean;
          italique?: boolean;
          layout?: "single" | "grid2" | "grid3";
          updated_at?: string;
        };
        Relationships: [];
      };
      itinerary: {
        Row: {
          id: string;
          step_id: string;
          nom: string;
          lat: number;
          lng: number;
          ordre: number;
          date_prevue: string | null;
          date_depart: string | null;
          description_culture: string;
          budget_prevu: number;
          nuitee_type: "van" | "passage" | "airbnb" | null;
          budget_culture: number;
          budget_nourriture: number;
          budget_nuitee: number;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          step_id: string;
          nom: string;
          lat: number;
          lng: number;
          ordre?: number;
          date_prevue?: string | null;
          date_depart?: string | null;
          description_culture?: string;
          budget_prevu?: number;
          nuitee_type?: "van" | "passage" | "airbnb" | null;
          budget_culture?: number;
          budget_nourriture?: number;
          budget_nuitee?: number;
          photo_url?: string | null;
        };
        Update: {
          step_id?: string;
          nom?: string;
          lat?: number;
          lng?: number;
          ordre?: number;
          date_prevue?: string | null;
          date_depart?: string | null;
          description_culture?: string;
          budget_prevu?: number;
          nuitee_type?: "van" | "passage" | "airbnb" | null;
          budget_culture?: number;
          budget_nourriture?: number;
          budget_nuitee?: number;
          photo_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
