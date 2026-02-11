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
          updated_at?: string;
        };
      };
    };
  };
}
