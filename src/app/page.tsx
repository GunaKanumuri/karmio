import Link from 'next/link';

function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-karmio-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Karmio</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/auth-pages/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors px-3 py-1.5">
            Log in
          </Link>
          <Link href="/auth-pages/signup" className="text-sm font-medium text-white bg-karmio-500 hover:bg-karmio-600 px-4 py-1.5 rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Now supporting 30+ career fields globally
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.15] text-balance">
          From your first internship<br />to your <span className="text-karmio-500">dream job</span>
        </h1>

        <p className="mt-5 text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
          One platform replaces your job board, resume writer, networking tracker,
          and pipeline manager. Works for tech, healthcare, finance, and every career in between.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link href="/auth-pages/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-karmio-500 hover:bg-karmio-600 text-white text-sm font-medium rounded-lg transition-colors">
            Get started — it&apos;s free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
          <Link href="/auth-pages/login" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Sign in
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          {[
            { value: '30+', label: 'Career fields' },
            { value: '500+', label: 'Companies tracked' },
            { value: 'Free', label: 'Forever tier' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
      ),
      title: 'AI-Tailored Resumes',
      desc: 'Our AI rewrites your resume for each job — keywords, structure, and impact bullets optimized for ATS systems.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
      ),
      title: 'Smart Job Matching',
      desc: 'Verified roles from real company career pages. Match scores, quality gates, and salary data at a glance.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
      ),
      title: 'Network Intelligence',
      desc: 'AI-crafted outreach messages, follow-up reminders, and contact management for relationship building.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
      ),
      title: 'Pipeline Tracking',
      desc: 'Kanban board from saved → applied → interview → offer. Never lose track of where you stand.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
      ),
      title: 'Every Career Path',
      desc: 'Tech, healthcare, finance, bioinformatics, law, education — from 2nd year internships to C-suite.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
      ),
      title: 'Analytics & Insights',
      desc: 'Weekly trends, response rates, skill gaps, and personalized recommendations to improve results.',
    },
  ];

  return (
    <section className="py-16 px-6 bg-white dark:bg-zinc-950 border-y border-zinc-200 dark:border-zinc-800">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-zinc-500 mt-2 text-sm max-w-md mx-auto">
            Built for the modern job search. Every feature gives you an unfair advantage.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="card p-5 group hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center text-karmio-500 mb-3">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CareerFieldsSection() {
  const fields = [
    'Software Engineering', 'Data Science', 'Healthcare / Nursing', 'Finance / Accounting',
    'Bioinformatics', 'Product Management', 'UX Design', 'Marketing', 'Law / Legal',
    'Civil Engineering', 'Public Health', 'Education', 'Consulting', 'Cybersecurity',
    'Environmental Science', 'Human Resources',
  ];

  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Built for your career</h2>
          <p className="text-zinc-500 mt-2 text-sm">Not just tech. We support every field.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {fields.map(f => (
            <span key={f} className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Get started',
      features: ['3 applications / week', '1 AI resume', 'Basic job matching', 'Pipeline tracking'],
      cta: 'Get started free',
      highlight: false,
    },
    {
      name: 'Popular',
      price: '$9',
      period: '/mo',
      desc: 'For active job seekers',
      features: ['25 applications / week', '25 AI resumes', 'Cover letter generation', '100 network contacts', 'Interview prep', 'Analytics'],
      cta: 'Start free trial',
      highlight: true,
    },
    {
      name: 'Pro',
      price: '$15',
      period: '/mo',
      desc: 'For power users',
      features: ['Unlimited applications', 'Unlimited resumes', 'Multi-profile targeting', 'Priority support', 'API access'],
      cta: 'Start free trial',
      highlight: false,
    },
  ];

  return (
    <section className="py-16 px-6 bg-white dark:bg-zinc-950 border-y border-zinc-200 dark:border-zinc-800">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Simple pricing</h2>
          <p className="text-zinc-500 mt-2 text-sm">Start free. Upgrade when ready. Cancel anytime.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.name} className={`card p-5 relative ${plan.highlight ? 'border-karmio-500 ring-1 ring-karmio-500' : ''}`}>
              {plan.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white bg-karmio-500 px-2.5 py-0.5 rounded-full">
                  Most popular
                </span>
              )}
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{plan.desc}</p>
              <div className="mt-3 mb-4">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{plan.price}</span>
                <span className="text-sm text-zinc-400 ml-1">{plan.period}</span>
              </div>
              <Link href="/auth-pages/signup" className={`block w-full text-center py-2 rounded-lg text-sm font-medium transition-colors ${plan.highlight
                  ? 'bg-karmio-500 text-white hover:bg-karmio-600'
                  : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}>
                {plan.cta}
              </Link>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2" className="mt-0.5 flex-shrink-0"><path d="M3 8l3 3 7-7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-karmio-500 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm text-zinc-500">© {new Date().getFullYear()} Karmio</span>
        </div>
        <p className="text-xs text-zinc-400 italic">
          कर्मण्येवाधिकारस्ते — Your right is to action alone
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <CareerFieldsSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
