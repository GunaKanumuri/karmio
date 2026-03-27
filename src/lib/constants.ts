// === TIER LIMITS ===
export const TIER_LIMITS = {
  free: {
    applications_per_week: 5,
    resumes_per_week: 5,
    messages_per_week: 5,
    cover_letters_per_week: 5,
    target_profiles: 1,
    resume_versions_kept: 5,
    export_formats: ['docx'] as const,
    has_calendar: false,
    has_daily_briefing: false,
    has_power_hour: false,
    has_interview_prep: false,
    has_warm_path: false,
    has_salary_intel: false,
    has_advanced_analytics: false,
    has_full_analytics: false,
    has_email_notifications: false,
    has_priority_alerts: false,
  },
  popular: {
    applications_per_week: null,
    resumes_per_week: null,
    messages_per_week: null,
    cover_letters_per_week: null,
    target_profiles: 2,
    resume_versions_kept: null,
    export_formats: ['docx', 'pdf', 'latex'] as const,
    has_calendar: true,
    has_daily_briefing: true,
    has_power_hour: true,
    has_interview_prep: false,
    has_warm_path: false,
    has_salary_intel: false,
    has_advanced_analytics: false,
    has_full_analytics: true,
    has_email_notifications: true,
    has_priority_alerts: false,
  },
  pro: {
    applications_per_week: null,
    resumes_per_week: null,
    messages_per_week: null,
    cover_letters_per_week: null,
    target_profiles: null,
    resume_versions_kept: null,
    export_formats: ['docx', 'pdf', 'latex'] as const,
    has_calendar: true,
    has_daily_briefing: true,
    has_power_hour: true,
    has_interview_prep: true,
    has_warm_path: true,
    has_salary_intel: true,
    has_advanced_analytics: true,
    has_full_analytics: true,
    has_email_notifications: true,
    has_priority_alerts: true,
  },
} as const;

// === RATE LIMITS ===
export const RATE_LIMITS = {
  free:    { browse: 60, ai_resume: 5, ai_message: 5, ai_cover: 5, ai_prep: 0, apply: 5, profile: 30, download: 10, window_browse: 60_000, window_ai: 604_800_000, window_auth: 900_000 },
  popular: { browse: 120, ai_resume: 30, ai_message: 20, ai_cover: 20, ai_prep: 0, apply: 100, profile: 60, download: 50, window_browse: 60_000, window_ai: 3_600_000, window_auth: 900_000 },
  pro:     { browse: 120, ai_resume: 60, ai_message: 40, ai_cover: 40, ai_prep: 20, apply: 100, profile: 60, download: 50, window_browse: 60_000, window_ai: 3_600_000, window_auth: 900_000 },
} as const;

// === AI BUDGET LIMITS ===
export const AI_DAILY_BUDGET = { free: 0.05, popular: 0.50, pro: 1.00 } as const;

// === PRICING (by country code) ===
export const PRICING: Record<string, { popular: PriceTier; pro: PriceTier }> = {
  US: {
    popular: { monthly: 12, yearly_monthly: 9, yearly_total: 108, currency: 'USD', symbol: '$' },
    pro:     { monthly: 20, yearly_monthly: 15, yearly_total: 180, currency: 'USD', symbol: '$' },
  },
  IN: {
    popular: { monthly: 199, yearly_monthly: 149, yearly_total: 1788, currency: 'INR', symbol: '₹' },
    pro:     { monthly: 399, yearly_monthly: 299, yearly_total: 3588, currency: 'INR', symbol: '₹' },
  },
  GB: {
    popular: { monthly: 10, yearly_monthly: 7, yearly_total: 84, currency: 'GBP', symbol: '£' },
    pro:     { monthly: 16, yearly_monthly: 12, yearly_total: 144, currency: 'GBP', symbol: '£' },
  },
  CA: {
    popular: { monthly: 15, yearly_monthly: 12, yearly_total: 144, currency: 'CAD', symbol: 'CA$' },
    pro:     { monthly: 25, yearly_monthly: 19, yearly_total: 228, currency: 'CAD', symbol: 'CA$' },
  },
  DE: {
    popular: { monthly: 11, yearly_monthly: 8, yearly_total: 96, currency: 'EUR', symbol: '€' },
    pro:     { monthly: 18, yearly_monthly: 14, yearly_total: 168, currency: 'EUR', symbol: '€' },
  },
  AU: {
    popular: { monthly: 18, yearly_monthly: 14, yearly_total: 168, currency: 'AUD', symbol: 'A$' },
    pro:     { monthly: 30, yearly_monthly: 23, yearly_total: 276, currency: 'AUD', symbol: 'A$' },
  },
  SG: {
    popular: { monthly: 15, yearly_monthly: 12, yearly_total: 144, currency: 'SGD', symbol: 'S$' },
    pro:     { monthly: 25, yearly_monthly: 19, yearly_total: 228, currency: 'SGD', symbol: 'S$' },
  },
  // Fallback for any unsupported country → USD pricing
  DEFAULT: {
    popular: { monthly: 12, yearly_monthly: 9, yearly_total: 108, currency: 'USD', symbol: '$' },
    pro:     { monthly: 20, yearly_monthly: 15, yearly_total: 180, currency: 'USD', symbol: '$' },
  },
};

interface PriceTier {
  monthly: number;
  yearly_monthly: number;
  yearly_total: number;
  currency: string;
  symbol: string;
}

// === APPLICATION STATUSES ===
export const APPLICATION_STATUSES = [
  { value: 'saved', label: 'Saved', color: 'gray' },
  { value: 'resume_ready', label: 'Resume ready', color: 'blue' },
  { value: 'applied', label: 'Applied', color: 'indigo' },
  { value: 'hr_screen', label: 'HR screen', color: 'purple' },
  { value: 'technical', label: 'Technical', color: 'amber' },
  { value: 'behavioral', label: 'Behavioral', color: 'orange' },
  { value: 'final', label: 'Final round', color: 'pink' },
  { value: 'offer', label: 'Offer', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'no_response', label: 'No response', color: 'slate' },
] as const;

// === MATCH / REALNESS WEIGHTS ===
export const MATCH_WEIGHTS = { skills: 0.40, experience: 0.25, education: 0.10, project_relevance: 0.15, title_match: 0.10 } as const;
export const REALNESS_WEIGHTS = { source_reliability: 0.35, freshness: 0.30, specificity: 0.20, company_signals: 0.15 } as const;

// === FOLLOW-UP SCHEDULE ===
export const FOLLOW_UP_SCHEDULE = [3, 7, 14, 21] as const;

// === MESSAGE TONES ===
export const MESSAGE_TONES = [
  { value: 'professional', label: 'Professional', description: 'Formal and respectful' },
  { value: 'casual', label: 'Casual / Friendly', description: 'Conversational, good for peers' },
  { value: 'referral', label: 'Referral request', description: 'Specific ask for an internal referral' },
  { value: 'technical', label: 'Technical', description: 'Lead with a technical insight' },
] as const;

// === GEOGRAPHIC CONFIG ===
export const GEO_CONFIG: Record<string, GeoConfig> = {
  US: {
    show_visa: true, salary_format: 'USD_ANNUAL', date_format: 'MM/DD/YYYY',
    job_sources: ['greenhouse', 'lever', 'ashby', 'workday'],
    show_sponsorship_filter: true, networking_style: 'linkedin_first',
    company_filters: ['startup', 'mid_market', 'enterprise', 'government'],
    currency: 'USD', locale: 'en-US',
  },
  IN: {
    show_visa: false, salary_format: 'INR_LPA', date_format: 'DD/MM/YYYY',
    job_sources: ['greenhouse', 'lever', 'naukri', 'freshteam', 'instahyre'],
    show_sponsorship_filter: false, networking_style: 'referral_heavy',
    company_filters: ['product', 'service', 'startup', 'mnc'],
    currency: 'INR', locale: 'en-IN',
  },
  GB: {
    show_visa: true, salary_format: 'GBP_ANNUAL', date_format: 'DD/MM/YYYY',
    job_sources: ['greenhouse', 'lever', 'workday'],
    show_sponsorship_filter: true, networking_style: 'linkedin_first',
    company_filters: ['startup', 'enterprise', 'agency'],
    currency: 'GBP', locale: 'en-GB',
  },
  CA: {
    show_visa: true, salary_format: 'CAD_ANNUAL', date_format: 'YYYY-MM-DD',
    job_sources: ['greenhouse', 'lever', 'workday'],
    show_sponsorship_filter: true, networking_style: 'linkedin_first',
    company_filters: ['startup', 'enterprise', 'government'],
    currency: 'CAD', locale: 'en-CA',
  },
  DE: {
    show_visa: true, salary_format: 'EUR_ANNUAL', date_format: 'DD.MM.YYYY',
    job_sources: ['greenhouse', 'lever', 'workday'],
    show_sponsorship_filter: true, networking_style: 'linkedin_first',
    company_filters: ['startup', 'mittelstand', 'enterprise'],
    currency: 'EUR', locale: 'de-DE',
  },
  AU: {
    show_visa: true, salary_format: 'AUD_ANNUAL', date_format: 'DD/MM/YYYY',
    job_sources: ['greenhouse', 'lever', 'workday'],
    show_sponsorship_filter: true, networking_style: 'linkedin_first',
    company_filters: ['startup', 'enterprise'],
    currency: 'AUD', locale: 'en-AU',
  },
  SG: {
    show_visa: true, salary_format: 'SGD_ANNUAL', date_format: 'DD/MM/YYYY',
    job_sources: ['greenhouse', 'lever'],
    show_sponsorship_filter: true, networking_style: 'linkedin_first',
    company_filters: ['startup', 'enterprise', 'mnc'],
    currency: 'SGD', locale: 'en-SG',
  },
  // Fallback for any unknown country
  DEFAULT: {
    show_visa: false, salary_format: 'USD_ANNUAL', date_format: 'YYYY-MM-DD',
    job_sources: ['greenhouse', 'lever'],
    show_sponsorship_filter: false, networking_style: 'linkedin_first',
    company_filters: ['startup', 'enterprise'],
    currency: 'USD', locale: 'en-US',
  },
};

interface GeoConfig {
  show_visa: boolean;
  salary_format: string;
  date_format: string;
  job_sources: string[];
  show_sponsorship_filter: boolean;
  networking_style: string;
  company_filters: string[];
  currency: string;
  locale: string;
}