import { z } from 'zod';

// ─── Auth ───
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long'),
});

// ─── Applications ───
export const createApplicationSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  target_profile_id: z.string().uuid().optional(),
  match_score: z.number().min(0).max(100).optional(),
  status: z.enum(['saved', 'resume_ready', 'applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer', 'rejected', 'no_response']).default('applied'),
});

export const updateApplicationSchema = z.object({
  id: z.string().uuid('Application ID is required'),
  status: z.enum(['saved', 'resume_ready', 'applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer', 'rejected', 'no_response']).optional(),
  notes: z.string().max(5000).optional(),
  rejection_reason: z.string().max(2000).optional(),
  _delete: z.boolean().optional(),
});

// ─── Profile ───
export const updateProfileSchema = z.object({
  full_name: z.string().max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  linkedin_url: z.string().max(200).optional().nullable(),
  github_url: z.string().max(200).optional().nullable(),
  portfolio_url: z.string().max(200).optional().nullable(),
  visa_status: z.enum(['opt', 'stem_opt', 'h1b', 'green_card', 'citizen', 'other', '']).optional().nullable(),
  country: z.enum(['US', 'IN']).optional(),
  current_location: z.string().max(100).optional().nullable(),
  target_locations: z.array(z.string().max(100)).optional(),
  onboarding_complete: z.boolean().optional(),
  target_profile: z.object({
    profile_name: z.string().max(100),
    target_titles: z.array(z.string().max(100)).optional(),
    priority_skills: z.array(z.string().max(50)).optional(),
    is_primary: z.boolean().optional(),
  }).optional(),
  experiences: z.array(z.object({
    id: z.string().uuid().optional(),
    company: z.string().max(100),
    title: z.string().max(100),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    bullets: z.array(z.string().max(500)).optional(),
    technologies: z.array(z.string().max(50)).optional(),
    is_current: z.boolean().optional(),
  })).optional(),
  projects: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().max(200),
    description: z.string().max(2000).optional(),
    technologies: z.array(z.string().max(50)).optional(),
    contributions: z.string().max(1000).optional(),
    results: z.string().max(1000).optional(),
    github_link: z.string().max(200).optional().nullable(),
    project_type: z.enum(['university', 'personal', 'team', 'professional']).optional(),
  })).optional(),
  education: z.array(z.object({
    id: z.string().uuid().optional(),
    institution: z.string().max(200),
    degree: z.string().max(100),
    field: z.string().max(100).optional(),
    graduation_date: z.string().optional().nullable(),
    gpa: z.union([z.string(), z.number()]).optional().nullable(),
  })).optional(),
  skills: z.array(z.union([
    z.string().max(50),
    z.object({
      skill_name: z.string().max(50),
      category: z.string().max(30).optional(),
      proficiency_level: z.number().min(1).max(5).optional(),
    }),
  ])).optional(),
}).passthrough(); // Allow extra fields for forward compat

// ─── Resume generation ───
export const generateResumeSchema = z.object({
  job_id: z.string().uuid('Job ID is required'),
  target_profile_id: z.string().uuid().optional(),
  action: z.string().optional(),
  resume_id: z.string().uuid().optional(),
});

// ─── Network ───
export const networkPostSchema = z.object({
  type: z.enum(['contact', 'message']).optional(),
  action: z.string().optional(),
  // Contact fields
  name: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  linkedin_url: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  // Message fields
  contact_id: z.string().uuid().optional(),
  contact_name: z.string().max(100).optional(),
  contact_title: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  tone: z.enum(['professional', 'casual', 'referral', 'technical']).optional(),
}).passthrough();

// ─── Helper to validate and return typed errors ───
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0];
  const field = firstError.path.join('.');
  const message = field ? `${field}: ${firstError.message}` : firstError.message;
  return { success: false, error: message };
}