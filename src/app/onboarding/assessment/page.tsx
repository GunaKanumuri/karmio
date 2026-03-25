'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Career fields with icons
const CAREER_FIELDS = [
  { id: 'tech', name: 'Technology', icon: '💻', examples: 'Software, Data, DevOps' },
  { id: 'finance', name: 'Finance', icon: '📊', examples: 'Banking, Investment, Accounting' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', examples: 'Clinical, Research, Admin' },
  { id: 'marketing', name: 'Marketing', icon: '📣', examples: 'Brand, Digital, Content' },
  { id: 'design', name: 'Design', icon: '🎨', examples: 'Product, UX, Graphic' },
  { id: 'operations', name: 'Operations', icon: '⚙️', examples: 'Supply Chain, Strategy' },
  { id: 'sales', name: 'Sales', icon: '🤝', examples: 'B2B, Enterprise, SDR' },
  { id: 'legal', name: 'Legal', icon: '⚖️', examples: 'Corporate, IP, Compliance' },
  { id: 'hr', name: 'People Ops', icon: '👥', examples: 'Recruiting, HR, L&D' },
  { id: 'product', name: 'Product', icon: '🚀', examples: 'PM, PO, Strategy' },
  { id: 'engineering', name: 'Engineering', icon: '🔧', examples: 'Mechanical, Civil, EE' },
  { id: 'other', name: 'Other', icon: '✨', examples: 'Tell us more' },
];

// Career stages
const CAREER_STAGES = [
  { id: 'student', name: 'Student', desc: 'Looking for internships or first job' },
  { id: 'early', name: 'Early Career', desc: '0 to 3 years of experience' },
  { id: 'mid', name: 'Mid Career', desc: '3 to 8 years of experience' },
  { id: 'senior', name: 'Senior', desc: '8+ years of experience' },
  { id: 'executive', name: 'Executive', desc: 'Director, VP, or C-level' },
];

// Job types
const JOB_TYPES = [
  { id: 'fulltime', name: 'Full-time', icon: '📅' },
  { id: 'parttime', name: 'Part-time', icon: '⏰' },
  { id: 'contract', name: 'Contract', icon: '📝' },
  { id: 'internship', name: 'Internship', icon: '🎓' },
];

// Company types
const COMPANY_TYPES = [
  { id: 'startup', name: 'Startup', desc: 'Fast-paced, equity upside' },
  { id: 'growth', name: 'Growth Stage', desc: 'Scaling, Series B+' },
  { id: 'enterprise', name: 'Enterprise', desc: 'Established, stable' },
  { id: 'agency', name: 'Agency', desc: 'Client work, variety' },
  { id: 'nonprofit', name: 'Nonprofit', desc: 'Mission-driven' },
  { id: 'government', name: 'Government', desc: 'Public sector, stability' },
];

export default function AssessmentPage() {
  const [step, setStep] = useState(1);
  const [careerField, setCareerField] = useState<string | null>(null);
  const [careerStage, setCareerStage] = useState<string | null>(null);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [companyTypes, setCompanyTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const toggleJobType = (id: string) => {
    setJobTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleCompanyType = (id: string) => {
    setCompanyTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const canContinue = () => {
    if (step === 1) return !!careerField;
    if (step === 2) return !!careerStage;
    if (step === 3) return jobTypes.length > 0;
    if (step === 4) return companyTypes.length > 0;
    return false;
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    // Final step: save and continue
    setSaving(true);
    setError('');

    try {
      // Create target profile with assessment data
      const profileData = {
        target_profiles: [{
          profile_name: CAREER_FIELDS.find(f => f.id === careerField)?.name || 'My Career',
          career_field: careerField,
          career_stage: careerStage,
          job_types: jobTypes,
          company_types: companyTypes,
          is_primary: true,
        }],
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || 'Could not save. Please try again.');
        setSaving(false);
        return;
      }

      router.push('/onboarding/profile-setup');
    } catch {
      setError('Connection error. Please try again.');
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.push('/onboarding/location');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-surface-100 dark:bg-surface-800">
        <div
          className="h-full bg-karmio-500 transition-all duration-500"
          style={{ width: `${33 + (step / 4) * 33}%` }}
        />
      </div>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-karmio-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-semibold text-surface-900 dark:text-white">Karmio</span>
        </Link>
        <div className="text-sm text-surface-500">Step 2 of 3</div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 overflow-auto">
        <div className="w-full max-w-2xl">
          {/* Step 1: Career Field */}
          {step === 1 && (
            <div className="animate-slide-up">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-semibold text-surface-900 dark:text-white mb-3">What field are you in?</h1>
                <p className="text-surface-600 dark:text-surface-400">
                  This helps us find jobs that match your background.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {CAREER_FIELDS.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => setCareerField(field.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      careerField === field.id
                        ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20'
                        : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-white dark:bg-surface-900'
                    }`}
                    data-testid={`field-${field.id}`}
                  >
                    <span className="text-2xl mb-2 block">{field.icon}</span>
                    <span className="font-medium text-surface-900 dark:text-white block">{field.name}</span>
                    <span className="text-xs text-surface-500">{field.examples}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Career Stage */}
          {step === 2 && (
            <div className="animate-slide-up">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-semibold text-surface-900 dark:text-white mb-3">Where are you in your career?</h1>
                <p className="text-surface-600 dark:text-surface-400">
                  This helps us show jobs at the right level.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {CAREER_STAGES.map((stage, i) => (
                  <button
                    key={stage.id}
                    onClick={() => setCareerStage(stage.id)}
                    className={`w-full p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                      careerStage === stage.id
                        ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20'
                        : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-white dark:bg-surface-900'
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                    data-testid={`stage-${stage.id}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                      careerStage === stage.id
                        ? 'bg-karmio-500 text-white'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <span className="font-medium text-surface-900 dark:text-white block">{stage.name}</span>
                      <span className="text-sm text-surface-500">{stage.desc}</span>
                    </div>
                    {careerStage === stage.id && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="ml-auto text-karmio-500">
                        <circle cx="12" cy="12" r="10" fill="currentColor" />
                        <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Job Types */}
          {step === 3 && (
            <div className="animate-slide-up">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-semibold text-surface-900 dark:text-white mb-3">What type of work?</h1>
                <p className="text-surface-600 dark:text-surface-400">
                  Select all that apply.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {JOB_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => toggleJobType(type.id)}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                      jobTypes.includes(type.id)
                        ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20'
                        : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-white dark:bg-surface-900'
                    }`}
                    data-testid={`jobtype-${type.id}`}
                  >
                    <span className="text-3xl mb-3 block">{type.icon}</span>
                    <span className="font-medium text-surface-900 dark:text-white">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Company Types */}
          {step === 4 && (
            <div className="animate-slide-up">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-semibold text-surface-900 dark:text-white mb-3">What kind of company?</h1>
                <p className="text-surface-600 dark:text-surface-400">
                  Select all that interest you.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {COMPANY_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => toggleCompanyType(type.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      companyTypes.includes(type.id)
                        ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20'
                        : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-white dark:bg-surface-900'
                    }`}
                    data-testid={`company-${type.id}`}
                  >
                    <span className="font-medium text-surface-900 dark:text-white block mb-1">{type.name}</span>
                    <span className="text-xs text-surface-500">{type.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 mb-6 animate-fade-in">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="btn btn-secondary px-6"
              data-testid="assessment-back"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canContinue() || saving}
              className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="assessment-continue"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : step < 4 ? (
                'Continue'
              ) : (
                'Complete assessment'
              )}
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-all ${
                  s === step
                    ? 'bg-karmio-500 scale-125'
                    : s < step
                    ? 'bg-karmio-300'
                    : 'bg-surface-200 dark:bg-surface-700'
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
