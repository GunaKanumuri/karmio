export type SubscriptionTier = 'free' | 'popular' | 'pro';
export type VisaStatus = 'opt' | 'stem_opt' | 'h1b' | 'green_card' | 'citizen' | 'other' | null;

// ISO 3166-1 alpha-2 country codes — no longer locked to US/IN
export type Country = string;

// Known supported countries with full locale configs
export const SUPPORTED_COUNTRIES = ['US', 'IN', 'GB', 'CA', 'DE', 'AU', 'SG', 'NL', 'IE', 'FR'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

export interface IUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  visa_status: VisaStatus;
  country: Country;
  current_location: string | null;
  target_locations: string[];
  target_countries: string[];
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
  target_profiles?: ITargetProfile[];
  weekly_usage?: any;
}

export interface ITargetProfile {
  id: string;
  user_id: string;
  profile_name: string;
  target_titles: string[];
  priority_skills: string[];
  is_primary: boolean;
  created_at: string;
}

export interface IExperience {
  id: string;
  user_id: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  bullets: string[];
  technologies: string[];
  is_current: boolean;
}

export interface IProject {
  id: string;
  user_id: string;
  title: string;
  description: string;
  technologies: string[];
  contributions: string;
  results: string;
  github_link: string | null;
  project_type: 'university' | 'personal' | 'team' | 'professional';
  created_at: string;
}

export interface IEducation {
  id: string;
  user_id: string;
  institution: string;
  degree: string;
  field: string;
  graduation_date: string;
  gpa: number | null;
}

export interface IUserSettings {
  id: string;
  user_id: string;
  reminder_times: string[];
  reminder_days: string[];
  email_digest: 'daily' | 'weekly' | 'off';
  job_alert_frequency: 'realtime' | 'daily' | 'weekly';
  default_resume_format: 'docx' | 'pdf';
  default_page_count: number;
  timezone: string;
}

export interface IWeeklyUsage {
  id: string;
  user_id: string;
  week_start: string;
  applications_count: number;
  resumes_generated: number;
  messages_generated: number;
  cover_letters_generated: number;
}