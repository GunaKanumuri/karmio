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
    applications_per_week: null, // unlimited
    resumes_per_week: null,
    messages_per_week: null,
    cover_letters_per_week: null,
    target_profiles: 2,
    resume_versions_kept: null, // all
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
    target_profiles: null, // unlimited
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
  free: { browse: 60, ai_resume: 5, ai_message: 5, ai_cover: 5, ai_prep: 0, apply: 5, profile: 30, download: 10, window_browse: 60_000, window_ai: 604_800_000, window_auth: 900_000 },
  popular: { browse: 120, ai_resume: 30, ai_message: 20, ai_cover: 20, ai_prep: 0, apply: 100, profile: 60, download: 50, window_browse: 60_000, window_ai: 3_600_000, window_auth: 900_000 },
  pro: { browse: 120, ai_resume: 60, ai_message: 40, ai_cover: 40, ai_prep: 20, apply: 100, profile: 60, download: 50, window_browse: 60_000, window_ai: 3_600_000, window_auth: 900_000 },
} as const;

// === AI BUDGET LIMITS (per user per day in USD) ===
export const AI_DAILY_BUDGET = { free: 0.05, popular: 0.50, pro: 1.00 } as const;

// === PRICING ===
export const PRICING = {
  US: {
    popular: { monthly: 12, yearly_monthly: 9, yearly_total: 108, currency: 'USD', symbol: '$' },
    pro: { monthly: 20, yearly_monthly: 15, yearly_total: 180, currency: 'USD', symbol: '$' },
  },
  IN: {
    popular: { monthly: 199, yearly_monthly: 149, yearly_total: 1788, currency: 'INR', symbol: '₹' },
    pro: { monthly: 399, yearly_monthly: 299, yearly_total: 3588, currency: 'INR', symbol: '₹' },
  },
} as const;

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

// === MATCH SCORE WEIGHTS ===
export const MATCH_WEIGHTS = {
  skills: 0.40,
  experience: 0.25,
  education: 0.10,
  project_relevance: 0.15,
  title_match: 0.10,
} as const;

// === REALNESS SCORE WEIGHTS ===
export const REALNESS_WEIGHTS = {
  source_reliability: 0.35,
  freshness: 0.30,
  specificity: 0.20,
  company_signals: 0.15,
} as const;

// === FOLLOW-UP SCHEDULE (days after application) ===
export const FOLLOW_UP_SCHEDULE = [3, 7, 14, 21] as const;

// === MESSAGE TONES ===
export const MESSAGE_TONES = [
  { value: 'professional', label: 'Professional', description: 'Formal and respectful, suitable for senior contacts' },
  { value: 'casual', label: 'Casual / Friendly', description: 'Conversational tone, good for peers' },
  { value: 'referral', label: 'Referral request', description: 'Specific ask for an internal referral' },
  { value: 'technical', label: 'Technical', description: 'Lead with a technical insight to show credibility' },
] as const;

// === GEOGRAPHIC CONFIG ===
export const GEO_CONFIG = {
  US: {
    show_visa: true,
    salary_format: 'USD_ANNUAL',
    date_format: 'MM/DD/YYYY',
    job_sources: ['greenhouse', 'lever', 'ashby', 'workday', 'usajobs'],
    show_sponsorship_filter: true,
    networking_style: 'linkedin_first',
    company_filters: ['startup', 'mid_market', 'enterprise', 'government'],
  },
  IN: {
    show_visa: false,
    salary_format: 'INR_LPA',
    date_format: 'DD/MM/YYYY',
    job_sources: ['naukri', 'freshteam', 'instahyre', 'greenhouse', 'lever'],
    show_sponsorship_filter: false,
    networking_style: 'referral_heavy',
    company_filters: ['product', 'service', 'startup', 'mnc'],
  },
} as const;
