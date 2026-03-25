# Karmio — Build Plan

> कर्मण्येवाधिकारस्ते — Your right is to action alone, never to its fruits.

## Vision

Karmio is a career co-pilot for **every career path** — from a 2nd-year nursing student seeking their first internship to a 10-year finance veteran targeting VP roles. One intelligent platform replaces 5 job search tools.

## Architecture

```
Frontend (Next.js Pages) → API Routes (/api/*) → Supabase (PostgreSQL + Auth)
                            ↑ Zod validation
                            ↑ Rate-limit headers
                            ↑ Cache headers (stale-while-revalidate)
```

- **Frontend NEVER talks to the database directly**
- All communication flows through API routes
- Cache sits between API and database
- Rate limiter sits before API logic
- Any layer can be swapped without affecting others

## Phases

### Phase 1: Auth + Onboarding + Landing Page ← CURRENT

| Component | Status | Files |
|---|---|---|
| Middleware (JWT-only, no DB queries) | 🟡 In progress | `middleware.ts` |
| useAuth hook (TanStack Query) | 🟡 In progress | `hooks/useAuth.ts` |
| Auth API routes (login, signup, me) | 🟡 In progress | `api/auth/` |
| Auth pages (premium UI redesign) | 🟡 In progress | `auth-pages/` |
| Onboarding (20+ fields, internships, global) | 🟡 In progress | `onboarding/` |
| Landing page (premium redesign) | 🟡 In progress | `page.tsx` |
| Validation schemas | 🟡 In progress | `lib/validation/schemas.ts` |
| Design system (globals.css, tailwind) | 🟡 In progress | `styles/`, `tailwind.config.js` |

### Phase 2: Dashboard + Job Feed

| Component | Status | Files |
|---|---|---|
| Job feed with filters | ⬜ Not started | `dashboard/jobs/` |
| Today's curated matches | ⬜ Not started | `api/jobs/today/` |
| Job detail with parsed JD | ⬜ Not started | `api/jobs/[id]/` |
| Dashboard home + daily briefing | ⬜ Not started | `dashboard/home/` |
| Pipeline board (Kanban) | ⬜ Not started | `dashboard/jobs/pipeline/` |
| Application tracking | ⬜ Not started | `api/applications/` |

### Phase 3: AI Resume Engine

| Component | Status | Files |
|---|---|---|
| AI resume tailoring | ⬜ Not started | `api/resumes/generate/` |
| Resume comparison view | ⬜ Not started | `components/resumes/` |
| DOCX + PDF builder | ⬜ Not started | `lib/resume-generator/` |
| Cover letter generation | ⬜ Not started | `api/resumes/[id]/cover-letter/` |
| Project vault | ⬜ Not started | `api/profile/projects/` |

### Phase 4: Networking + Interview Prep

| Component | Status | Files |
|---|---|---|
| Contact management | ⬜ Not started | `api/network/contacts/` |
| AI message crafter | ⬜ Not started | `api/network/messages/` |
| Follow-up reminders | ⬜ Not started | `api/network/follow-ups/` |
| Interview prep modules | ⬜ Not started | `dashboard/prep/` |

### Phase 5: Analytics + Payments

| Component | Status | Files |
|---|---|---|
| Analytics dashboard | ⬜ Not started | `api/analytics/` |
| Stripe integration | ⬜ Not started | `api/subscription/` |
| Tier gating enforcement | ⬜ Not started | `lib/payments/tier-gate.ts` |

### Phase 6: Workers + Infrastructure

| Component | Status | Files |
|---|---|---|
| Job fetcher cron (Greenhouse, Lever, USAJobs) | ⬜ Not started | `workers/job-fetcher/` |
| Dedup processor | ⬜ Not started | `workers/dedup-processor/` |
| Email sender (Resend) | ⬜ Not started | `workers/email-sender/` |
| Cache warmer | ⬜ Not started | `workers/cache-warmer/` |

## Job Sources (Free, Legal)

| Source | API | Sectors Covered |
|---|---|---|
| Greenhouse | `boards-api.greenhouse.io` (free, public) | All — Goldman, Mayo Clinic, Pfizer use it |
| Lever | `api.lever.co` (free, public) | All — cross-industry |
| Ashby | Public API | Mostly startups |
| USAJobs | `api.usa.gov` (free, official) | All US government jobs |
| Adzuna | Free tier (250 req/day) | Multi-sector, global |
| Jooble | Free API | Aggregator, multi-sector |
| Company career pages | Custom scrapers | Targeted high-value employers |

## Performance Targets (from spec)

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.0s |
| Time to Interactive | < 2.0s |
| Initial JS bundle | < 200KB gzipped |
| API response (cached) | < 50ms |
| API response (uncached) | < 300ms |
| AI generation | < 5s |
