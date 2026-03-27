export interface IResumeRecipe {
  id: string;
  user_id: string;
  job_id: string;
  target_profile_id: string | null;
  selected_project_ids: string[];
  enhanced_summary: string;
  enhanced_bullets: Record<string, string[]>; // experience_id → bullets
  keywords_matched: string[];
  keywords_missing: string[];
  match_score: number;
  cover_letter_text: string | null;
  format: 'docx' | 'pdf' | 'latex';
  page_count: number;
  version: number;
  is_archived: boolean;
  created_at: string;
  // Joined
  job_postings?: {
    id: string;
    title: string;
    company_name: string;
    location: string;
  };
}

export interface ITailorResult {
  enhanced_summary: string;
  enhanced_bullets: Record<string, string[]>;
  keywords_matched: string[];
  keywords_missing: string[];
  match_score: number;
  cover_letter_text?: string;
}

export interface IATSAnalysis {
  score: number; // 0-100
  keywords_found: string[];
  keywords_missing: string[];
  suggestions: string[];
}