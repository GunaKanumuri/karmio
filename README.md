# Karmio कर्म  - Action without attachment to results

**Your career co-pilot.** From your first internship to your dream job.

Karmio replaces 5 job search tools with one intelligent platform — verified jobs, AI-tailored resumes, smart networking, pipeline tracking, and interview prep. Works for every career: tech, healthcare, finance, research, law, and beyond.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment (copy and fill in your keys)
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Server State | TanStack Query (React Query) |
| Client State | Zustand (UI state only) |
| Styling | Tailwind CSS |
| Validation | Zod |
| AI | Anthropic Claude API |
| Payments | Stripe |
| Email | Resend |
| Drag & Drop | @hello-pangea/dnd |
| Charts | Chart.js + react-chartjs-2 |
| Resume Export | docx (Word), @react-pdf/renderer (PDF) |

## Architecture

```
Frontend (pages)  →  API routes (/api/*)  →  Supabase
                      ↑ Zod validation
                      ↑ Rate limiting
                      ↑ Cache headers
```

**Rule:** Frontend NEVER talks to the database directly. All data flows through `/api/*`.

## Project Structure

```
karmio/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── auth-pages/         # Login, signup, verify, callback
│   │   ├── onboarding/         # Location, assessment, profile setup
│   │   ├── dashboard/          # Main app (jobs, resumes, network, etc.)
│   │   ├── api/                # Backend API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── jobs/           # Job feed, search, details
│   │   │   ├── resumes/        # AI resume generation
│   │   │   ├── applications/   # Application tracking
│   │   │   ├── network/        # Contacts, messages, follow-ups
│   │   │   ├── profile/        # User profile management
│   │   │   ├── ai/             # AI endpoints
│   │   │   ├── payments/       # Stripe integration
│   │   │   └── admin/          # Admin endpoints
│   │   ├── page.tsx            # Landing page
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── ui/                 # Button, Card, Badge, Input, Modal, etc.
│   │   ├── layout/             # Sidebar, TopBar, MobileNav, AppShell
│   │   ├── jobs/               # JobCard, JobFilters, CompanyIntel
│   │   ├── resumes/            # ResumeEditor, ResumeComparison
│   │   ├── network/            # ContactCard, MessageCrafter
│   │   ├── dashboard/          # DailyBriefing, WeeklyChart
│   │   └── shared/             # Helpers, ErrorMessage, UpgradePrompt
│   ├── hooks/                  # useAuth, useJobs, useResume, etc.
│   ├── lib/
│   │   ├── supabase/           # client.ts, server.ts, admin.ts
│   │   ├── ai/                 # Resume tailor, message crafter
│   │   ├── validation/         # Zod schemas
│   │   ├── payments/           # Stripe, tier gating
│   │   ├── cache/              # Cache keys, invalidation
│   │   ├── rate-limit/         # Sliding window rate limiter
│   │   ├── geo/                # Locale config, currency
│   │   ├── resume-generator/   # DOCX/PDF builders
│   │   ├── matching/           # Skill matcher, scoring
│   │   └── constants.ts        # Tier limits, pricing, config
│   ├── types/                  # TypeScript interfaces
│   └── styles/                 # globals.css, design tokens
├── supabase/                   # Migrations, seed, edge functions
├── workers/                    # Cron: job-fetcher, dedup, email, cache
├── PLAN.md                     # Build phases and roadmap
├── DECISIONS.md                # Architecture decision records
└── docs/                       # Technical specification
```

## Environment Variables

```bash
# Public (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Private (server-only — never expose these)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
CRON_SECRET=random-secret-string
ADMIN_EMAILS=you@example.com
```

See `.env.example` for the full list with descriptions.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:migrate` | Push DB migrations to Supabase |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Reset database (destructive) |

## Deployment (Vercel)

1. **Push to GitHub** and import the repo in [vercel.com/new](https://vercel.com/new)
2. **Add all environment variables** from `.env.example` in Vercel → Settings → Environment Variables
3. **Set up Stripe webhook** — in Stripe Dashboard, create a webhook pointing to:
   `https://yourdomain.com/api/payments?webhook=true`
   Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
   Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`
4. **Cron job** runs automatically — `vercel.json` already schedules `/api/jobs/cron` every 2 hours.
   Make sure `CRON_SECRET` is set so the endpoint is protected.
5. **Run migrations** after first deploy:
   ```bash
   npm run db:migrate
   ```

## Career Fields Supported

Technology · Healthcare · Bioinformatics · Finance · Consulting · Marketing · Design · Law · Education · Research · Engineering · Public Policy · Data Science · DevOps · AI/ML · Pharmacy · Nursing · Operations · HR · and more.

## Career Stages

2nd year undergrad → 3rd year → final year → new grad → early career → mid career → senior → executive → career changer → returning to workforce

## Pricing

| | Free | Popular | Pro |
|---|---|---|---|
| US | $0/forever | $9/mo | $15/mo |
| India | ₹0/forever | ₹149/mo | ₹299/mo |

---

*कर्मण्येवाधिकारस्ते मा फलेषु कदाचन — Your right is to action alone, never to its fruits.*
