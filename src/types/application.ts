// === APPLICATION TYPES ===
export type ApplicationStatus =
  | 'saved' | 'resume_ready' | 'applied' | 'hr_screen'
  | 'technical' | 'behavioral' | 'final'
  | 'offer' | 'rejected' | 'no_response';

export interface IApplication {
  id: string;
  user_id: string;
  job_id: string;
  target_profile_id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  resume_recipe_id: string | null;
  match_score: number;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

// === NETWORK TYPES ===
export type ConnectionStatus = 'pending' | 'connected' | 'responded' | 'no_response';
export type MessageTone = 'professional' | 'casual' | 'referral' | 'technical';

export interface IContact {
  id: string;
  application_id: string;
  user_id: string;
  name: string;
  title: string;
  linkedin_url: string | null;
  email: string | null;
  connection_status: ConnectionStatus;
  last_contacted_at: string | null;
  notes: string | null;
}

export interface IMessage {
  id: string;
  contact_id: string;
  user_id: string;
  tone: MessageTone;
  content: string;
  sent_at: string | null;
  got_response: boolean;
}

export interface IFollowUp {
  id: string;
  application_id: string;
  user_id: string;
  due_date: string;
  type: 'networking' | 'recruiter' | 'general';
  day_number: number;
  is_completed: boolean;
  completed_at: string | null;
}

// === SUBSCRIPTION TYPES ===
export interface ISubscription {
  tier: 'free' | 'popular' | 'pro';
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage: {
    applications_this_week: number;
    resumes_this_week: number;
    messages_this_week: number;
    limits: {
      applications: number | null;
      resumes: number | null;
      messages: number | null;
    };
  };
}

// === API TYPES ===
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    action?: string;
    retryable?: boolean;
  };
  meta?: {
    page?: number;
    total?: number;
    cursor?: string;
    cached?: boolean;
  };
}
