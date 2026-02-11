/**
 * Types pour Van-Life Journal
 * Une Step = une ville/étape du voyage (état Prévu + optionnellement Visité)
 */

export interface ContenuVoyage {
  /** URLs ou chemins des photos uploadées */
  photos: string[];
  /** Anecdote / pensée du moment */
  anecdote?: string;
  /** Dépenses réelles sur place (€) */
  depenses_reelles?: number;
}

/** Options de typo pour une section Book */
export type PoliceTitre = "serif" | "sans";
export type PoliceSousTitre = "serif" | "sans";
export interface BookSectionStyle {
  police_titre?: PoliceTitre;
  police_sous_titre?: PoliceSousTitre;
  gras?: boolean;
  italique?: boolean;
  layout?: "single" | "grid2" | "grid3";
}

/** Section Book par ville (mock / Supabase) */
export interface BookSection {
  step_id: string;
  photos: string[];
  texte: string;
  style?: BookSectionStyle;
}

/** Type de nuitée : van (gratuit), passage (pas de nuit), airbnb (payant) */
export type NuiteeType = "van" | "passage" | "airbnb";

export interface Step {
  id: string;
  nom: string;
  coordonnees: { lat: number; lng: number };
  /** Date d'arrivée (ex. ISO ou YYYY-MM-DD) */
  date_prevue: string;
  /** Date de départ (van/airbnb) – nuitées = départ - arrivée */
  date_depart?: string | null;
  /** Nombre de nuitées (calculé ou stocké) */
  nuitees?: number;
  /** Infos culturelles (état "Prévu") */
  description_culture: string;
  /** Budget estimé en € */
  budget_prevu: number;
  /** Type de nuitée : van, passage, airbnb */
  nuitee_type?: NuiteeType | null;
  /** Budget prévisionnel culture (€) */
  budget_culture?: number;
  /** Budget prévisionnel nourriture (€) */
  budget_nourriture?: number;
  /** Budget nuitée (€) – uniquement pour AirBnb */
  budget_nuitee?: number;
  /** Données "Visité" : photos, anecdote, dépenses réelles */
  contenu_voyage: ContenuVoyage;
}

export type Etape = Step;
