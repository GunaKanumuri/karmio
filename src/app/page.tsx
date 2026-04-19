import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-surface-950">
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Pricing />
      <Footer />
    </main>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-surface-950/80 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-karmio-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-surface-900 dark:text-white">Karmio</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/auth-pages/login" className="text-sm font-medium text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link href="/auth-pages/signup" className="text-sm font-medium bg-karmio-500 text-white px-5 py-2.5 rounded-lg hover:bg-karmio-600 transition-colors" data-testid="cta-signup">
            Get started free
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-karmio-50 dark:bg-karmio-900/30 border border-karmio-200 dark:border-karmio-800 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-sm font-medium text-karmio-700 dark:text-karmio-300">Now with verified jobs from 100+ companies</span>
        </div>

        <h1 className="font-serif text-5xl md:text-6xl text-surface-900 dark:text-white leading-tight mb-6 animate-slide-up">
          Your career deserves<br />
          <span className="text-karmio-500">more than job boards</span>
        </h1>

        <p className="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
          Karmio brings together job discovery, resume tailoring, and application tracking in one focused workspace. 
          No more switching between five different tools. Just progress.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <Link href="/auth-pages/signup" className="w-full sm:w-auto px-8 py-4 bg-karmio-500 text-white text-base font-medium rounded-xl hover:bg-karmio-600 transition-colors" data-testid="hero-cta">
            Start your job search
          </Link>
          <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 text-base font-medium rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
            See how it works
          </Link>
        </div>

        <p className="text-sm text-surface-500 mt-6">Free forever for 5 applications per week. No credit card required.</p>
      </div>
    </section>
  );
}

function TrustBar() {
  const stats = [
    { value: '100+', label: 'Companies indexed' },
    { value: 'Free', label: 'No credit card required' },
    { value: 'US & IN', label: 'Markets supported' },
    { value: '2026', label: 'Early access' },
  ];

  return (
    <section className="py-12 border-y border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="text-2xl md:text-3xl font-semibold text-surface-900 dark:text-white">{stat.value}</div>
              <div className="text-sm text-surface-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      title: 'Verified job feed',
      description: 'Every listing comes directly from company career pages. We flag ghost jobs before you waste your time on applications that go nowhere.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      ),
      title: 'One-click tailored resumes',
      description: 'Our AI reads the job description and adjusts your resume to match what recruiters are looking for. Higher match scores, more callbacks.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
      title: 'Pipeline tracking',
      description: 'Drag applications through stages from saved to offer. Never lose track of where you stand with each company.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      title: 'Smart networking',
      description: 'Find the right people to reach out to. Get message templates that actually get responses, and reminders to follow up at the right time.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 20V10M18 20V4M6 20v-4" />
        </svg>
      ),
      title: 'Real analytics',
      description: 'See which job types are responding to your applications. Understand what is working and where to focus your energy.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
        </svg>
      ),
      title: 'Interview prep',
      description: 'Practice with company-specific questions. HR screens, technical rounds, behavioral questions. Walk in prepared.',
    },
  ];

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-surface-900 dark:text-white mb-4">
            Everything you need, nothing you do not
          </h2>
          <p className="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
            Built by people who have been through the job search grind. We kept what works and cut everything else.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:border-karmio-300 dark:hover:border-karmio-700 transition-colors animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center text-karmio-500 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-surface-600 dark:text-surface-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Tell us about your goals', desc: 'Career field, target roles, preferred locations. Takes about 3 minutes.' },
    { num: '02', title: 'Browse matched jobs', desc: 'We pull from verified sources and rank by how well they match your profile.' },
    { num: '03', title: 'Apply with tailored materials', desc: 'One click generates a custom resume and cover letter for each role.' },
    { num: '04', title: 'Track and iterate', desc: 'See what is working. Adjust your approach. Land interviews.' },
  ];

  return (
    <section className="py-24 px-6 bg-surface-50 dark:bg-surface-900 border-y border-surface-200 dark:border-surface-800">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-surface-900 dark:text-white mb-4">How it works</h2>
          <p className="text-lg text-surface-600 dark:text-surface-400">Four steps from signup to interview.</p>
        </div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-6 items-start animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-12 h-12 rounded-full bg-karmio-500 text-white flex items-center justify-center font-medium flex-shrink-0">
                {step.num}
              </div>
              <div className="pt-2">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">{step.title}</h3>
                <p className="text-surface-600 dark:text-surface-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'For getting started',
      features: ['5 applications per week', 'Basic job matching', 'Resume builder', '1 target profile'],
      cta: 'Get started',
      highlighted: false,
    },
    {
      name: 'Popular',
      price: '$9',
      period: '/month',
      description: 'For active job seekers',
      features: ['Unlimited applications', 'AI resume tailoring', 'Full analytics dashboard', 'Priority job alerts', '5 target profiles'],
      cta: 'Start free trial',
      highlighted: true,
    },
    {
      name: 'Pro',
      price: '$15',
      period: '/month',
      description: 'For serious career moves',
      features: ['Everything in Popular', 'Interview prep modules', 'Salary intelligence', 'Networking tools', 'Priority support'],
      cta: 'Start free trial',
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-surface-900 dark:text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-surface-600 dark:text-surface-400">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`p-8 rounded-2xl border animate-slide-up ${
                plan.highlighted
                  ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20'
                  : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900'
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {plan.highlighted && (
                <div className="inline-block px-3 py-1 rounded-full bg-karmio-500 text-white text-xs font-medium mb-4">Most popular</div>
              )}
              <h3 className="text-xl font-semibold text-surface-900 dark:text-white">{plan.name}</h3>
              <p className="text-surface-500 mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-semibold text-surface-900 dark:text-white">{plan.price}</span>
                <span className="text-surface-500">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3 text-surface-700 dark:text-surface-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 flex-shrink-0 mt-0.5">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth-pages/signup"
                className={`block text-center py-3 px-6 rounded-xl font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-karmio-500 text-white hover:bg-karmio-600'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-surface-200 dark:border-surface-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-karmio-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-semibold text-surface-900 dark:text-white">Karmio</span>
          </div>

          <div className="flex items-center gap-8 text-sm text-surface-500">
            <a href="#" className="hover:text-surface-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-surface-900 dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-surface-900 dark:hover:text-white transition-colors">Support</a>
          </div>

          <p className="text-sm text-surface-500">Built with purpose. © 2026</p>
        </div>
      </div>
    </footer>
  );
}
