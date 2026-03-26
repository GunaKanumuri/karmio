export type SourceType = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'usajobs' | 'naukri' | 'freshteam' | 'other';
export type RemoteType = 'onsite' | 'hybrid' | 'remote';
export type SponsorshipStatus = 'yes' | 'no' | 'unknown';

export interface IParsedJD {
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  education_requirements: string[];
  experience_years: { min: number; max: number | null };
  keywords: string[];
}

export interface IJobPosting {
  id: string;
  company_name: string;
  company_logo_url: string | null;
  title: string;
  description_raw: string;
  description_parsed: IParsedJD | null;
  location: string;
  remote_type: RemoteType;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  source_url: string;
  source_type: SourceType;
  ats_board_url: string | null;
  dedup_hash: string;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  realness_score: number;
  sponsorship_status: SponsorshipStatus;
  experience_years_min: number | null;
  experience_years_max: number | null;
  country: string;
}

export interface IJobSource {
  id: string;
  job_id: string;
  platform: string;
  platform_url: string;
  first_seen_at: string;
}

export interface IJobCardData extends IJobPosting {
  match_score: number;
  matched_profile: string;
  sources: IJobSource[];
}

export interface IJobFilters {
  search?: string;
  location?: string;
  remote_type?: RemoteType[];
  sponsorship?: SponsorshipStatus[];
  experience_max?: number;
  salary_min?: number;
  company_size?: string[];
  posted_within?: '1h' | '2h' | '4h' | '1d' | '2d' | '7d';
  realness_min?: number;
  profile_id?: string;
  sort_by?: 'match' | 'date' | 'realness';
  cursor?: string;
  limit?: number;
}