# Karmio — Architecture Decisions

## ADR-001: Next.js Monolith (No Separate Backend)

**Date:** March 2026  
**Status:** Accepted

**Context:** Should we separate frontend and backend into different services?

**Decision:** Keep Next.js monolith. API routes ARE the backend.

**Rationale:**
- Next.js App Router naturally separates frontend (`page.tsx`) from backend (`route.ts`)
- Single deployment on Vercel = zero DevOps overhead
- Shared TypeScript types between frontend and backend
- A separate Express/Fastify server adds: CORS config, separate deployment, separate hosting cost
- The spec explicitly uses this pattern: "Frontend communicates with backend ONLY through API routes"

**Consequence:** All data access flows through `/api/*` routes. No component ever imports from `lib/supabase/` directly (except the auth browser client for session management).

---

## ADR-002: Frontend ↔ Backend Communication via API Only

**Date:** March 2026  
**Status:** Accepted

**Context:** Some onboarding pages were calling Supabase directly from client components.

**Decision:** ALL data operations go through API routes. Frontend never touches the database.

**Rationale:**
- API routes enforce validation (Zod), rate limiting, auth checks, and caching in one place
- If we swap Supabase for another DB, only `lib/supabase/` changes — zero frontend changes
- Server-side code can use the service role key for admin operations
- Consistent error handling and response envelope

**Exception:** `supabase.auth.signInWithOAuth()` must run in the browser (redirect flow). This is the only allowed direct Supabase call from frontend.

---

## ADR-003: Supabase for Database + Auth (No Separate Auth Service)

**Date:** March 2026  
**Status:** Accepted

**Context:** Should we use Auth0, Clerk, or Firebase Auth instead?

**Decision:** Supabase Auth handles everything — email/password, Google OAuth, Apple OAuth.

**Rationale:**
- Supabase Auth is free and included with the database
- Row-Level Security (RLS) policies tie directly to auth.users — one system
- JWTs are HttpOnly cookies via `@supabase/ssr` — secure by default
- No vendor lock-in concerns — standard PostgreSQL underneath

---

## ADR-004: TanStack Query for Server State (Not Zustand for Everything)

**Date:** March 2026  
**Status:** Accepted

**Context:** The codebase had `zustand` as a dependency but wasn't using it for server state.

**Decision:** TanStack Query for all server data (auth, jobs, resumes, etc.). Zustand only for local UI state if needed.

**Rationale:**
- Server state (data from API) ≠ client state (UI toggles, form values)
- TanStack Query provides: caching, stale-while-revalidate, background refetch, cache invalidation
- Eliminates manual `useState` + `useEffect` + `loading` patterns
- Spec defines exact stale/cache times per data type — TanStack Query implements this natively

---

## ADR-005: Keep `auth-pages/` Path (Not Route Groups for Auth)

**Date:** March 2026  
**Status:** Accepted

**Context:** Spec suggests `(auth)/` route group. Current code uses `auth-pages/`.

**Decision:** Keep `auth-pages/` as the URL path. Route groups `()` are invisible in URLs — they're just for layout sharing. Since auth pages have no shared layout (no sidebar, no topbar), a route group adds zero value.

**Consequence:** Auth URLs remain `/auth-pages/login`, `/auth-pages/signup`, etc. Clean and explicit.

---

## ADR-006: Job Sources — Free APIs Only for V1

**Date:** March 2026  
**Status:** Accepted

**Context:** Should we scrape LinkedIn, Indeed, Glassdoor for comprehensive coverage?

**Decision:** V1 uses only free, legal APIs: Greenhouse, Lever, USAJobs, Adzuna (free tier), Jooble.

**Rationale:**
- LinkedIn/Indeed aggressively block scrapers — legal risk, IP bans, ToS violations
- Greenhouse and Lever are NOT tech-only — Goldman Sachs, Mayo Clinic, Pfizer, Harvard all use them
- USAJobs covers all US government positions across every sector
- Adzuna and Jooble are aggregators covering nursing, finance, legal, education
- Can expand to paid APIs (Indeed Publisher, LinkedIn Partner) when revenue supports it

**Trade-off:** Some niche employers (small hospitals, local law firms) won't be covered initially. Users can suggest companies via `POST /api/jobs/suggest-company`.

---

## ADR-007: Global Career Support from Day 1

**Date:** March 2026  
**Status:** Accepted

**Context:** Original spec targeted software engineers. Should we limit the initial scope?

**Decision:** Onboarding supports 20+ career fields, internships through executive level. Job matching and AI tailoring work for any field.

**Rationale:**
- The core product (resume tailoring, application tracking, networking) is career-agnostic
- Limiting to tech only means rebuilding the assessment later
- Students in healthcare, bioinformatics, finance deserve the same tools
- The AI resume tailoring engine works on any job description — it's field-agnostic

**Trade-off:** Non-tech job coverage depends on which employers use Greenhouse/Lever. We prioritize adding employer lists per career field in the job worker.

---

## ADR-008: Geographic Scope — US + India for V1

**Date:** March 2026  
**Status:** Accepted, with future expansion planned

**Context:** User wants global support, but payment, job sources, and visa logic are country-specific.

**Decision:** V1 supports US and India. Expand to UK, Canada, Germany, etc. in V2.

**Rationale:**
- Each country needs: localized job sources, salary format, currency, payment gateway, visa logic
- US + India covers the two largest English-speaking job markets
- Stripe supports both (USD and INR)
- Adding more countries is additive (new geo config entries), not architectural

---

## ADR-009: Motivational Onboarding UX

**Date:** March 2026  
**Status:** Accepted

**Context:** Standard onboarding feels like a chore. Completion rates drop at step 2-3.

**Decision:** Every onboarding step shows:
1. **"Why this matters"** — concrete stat or benefit
2. **"Unlocking"** — what this answer activates
3. **Animated confirmation** — immediate positive feedback
4. **Profile strength meter** — gamification of completeness

**Rationale:**
- Users who complete onboarding get dramatically better matches
- Making each step feel like career-building increases completion rate
- The "unlocking" concept creates a sense of investment
