'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { WhyHelper } from '@/components/shared/Helpers';

// ─── Types ───
interface ProjectForm {
  title: string; description: string; technologies: string;
  contributions: string; results: string; github_link: string;
  project_type: string;
}

interface FormData {
  full_name: string; phone: string; linkedin_url: string;
  github_url: string; portfolio_url: string; visa_status: string;
  current_location: string; target_locations: string;
}

const EMPTY_PROJECT: ProjectForm = {
  title: '', description: '', technologies: '', contributions: '',
  results: '', github_link: '', project_type: 'personal',
};

// ─── Helpers ───

/** Sanitize experience start_date: the DB column is NOT NULL, so fallback to a safe default */
function safeStartDate(dateStr: string | null | undefined): string {
  if (dateStr && /^\d{4}/.test(dateStr)) return dateStr;
  return '1970-01-01'; // fallback for unparseable dates
}

export default function ProfileSetupPage() {
  const [step, setStep] = useState<'upload' | 'form'>('upload');
  const [formData, setFormData] = useState<FormData>({
    full_name: '', phone: '', linkedin_url: '', github_url: '', portfolio_url: '',
    visa_status: '', current_location: '', target_locations: '',
  });
  const [projects, setProjects] = useState<ProjectForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const submittingRef = useRef(false); // debounce guard
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  // ─── Resume upload ───
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');

    try {
      const formPayload = new FormData();
      formPayload.append('resume', file);

      const res = await fetch('/api/profile/upload-resume', {
        method: 'POST',
        body: formPayload,
      });

      if (res.status === 401) {
        setUploadError('Your session has expired. Please sign in again.');
        setTimeout(() => router.replace('/auth-pages/login'), 1500);
        return;
      }

      const json = await res.json();

      if (json.success && json.data) {
        const parsed = json.data;
        setParsedData(parsed);

        setFormData(prev => ({
          full_name: parsed.full_name || prev.full_name,
          phone: parsed.phone || prev.phone,
          linkedin_url: parsed.linkedin_url || prev.linkedin_url,
          github_url: parsed.github_url || prev.github_url,
          portfolio_url: parsed.portfolio_url || prev.portfolio_url,
          visa_status: prev.visa_status,
          current_location: parsed.current_location || prev.current_location,
          target_locations: prev.target_locations,
        }));

        if (parsed.projects?.length > 0) {
          setProjects(parsed.projects.map((p: any) => ({
            title: p.title || '',
            description: p.description || '',
            technologies: Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.technologies || ''),
            contributions: p.contributions || '',
            results: p.results || '',
            github_link: p.github_link || '',
            project_type: p.project_type || 'personal',
          })));
        }

        setStep('form');
      } else {
        setUploadError(json.error?.message || 'Could not parse the file. Try a different format or fill manually.');
      }
    } catch {
      setUploadError('Upload failed — please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Project CRUD ───
  const addProject = useCallback(() => {
    setProjects(prev => [...prev, { ...EMPTY_PROJECT }]);
  }, []);

  const updateProject = useCallback((idx: number, field: string, value: string) => {
    setProjects(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }, []);

  const removeProject = useCallback((idx: number) => {
    setProjects(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ─── Submit: routes through /api/profile PUT with full error handling ───
  const handleSubmit = async () => {
    // Debounce: prevent double-submit
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      // 1. Validate auth
      if (!authUser) {
        setError('Your session has expired. Redirecting to sign in...');
        setTimeout(() => router.replace('/auth-pages/login'), 1500);
        return;
      }

      // 2. Basic client-side validation
      if (!formData.full_name.trim()) {
        setError('Full name is required.');
        return;
      }

      // 3. Build the payload for the unified /api/profile PUT
      const payload: Record<string, any> = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        linkedin_url: formData.linkedin_url.trim() || null,
        github_url: formData.github_url.trim() || null,
        portfolio_url: formData.portfolio_url.trim() || null,
        visa_status: formData.visa_status || null,
        current_location: formData.current_location.trim() || null,
        target_locations: formData.target_locations
          ? formData.target_locations.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        // NOTE: onboarding_complete is set LAST, after all data is saved (see step 5)
      };

      // Projects from form
      const validProjects = projects
        .filter(p => p.title.trim())
        .map(p => ({
          title: p.title.trim(),
          description: p.description.trim(),
          technologies: p.technologies ? p.technologies.split(',').map(s => s.trim()).filter(Boolean) : [],
          contributions: p.contributions.trim(),
          results: p.results.trim(),
          github_link: p.github_link.trim() || null,
          project_type: p.project_type || 'personal',
        }));

      if (validProjects.length > 0) {
        payload.projects = validProjects;
      }

      // Experiences from parsed resume (with safe start_date)
      if (parsedData?.experiences?.length > 0) {
        payload.experiences = parsedData.experiences
          .filter((e: any) => e.company && e.title)
          .map((e: any) => ({
            company: e.company,
            title: e.title,
            start_date: safeStartDate(e.start_date),
            end_date: e.end_date || null,
            bullets: Array.isArray(e.bullets) ? e.bullets : [],
            technologies: Array.isArray(e.technologies) ? e.technologies : [],
            is_current: e.is_current || false,
          }));
      }

      // Education from parsed resume
      if (parsedData?.education?.length > 0) {
        payload.education = parsedData.education
          .filter((e: any) => e.institution && e.degree)
          .map((e: any) => ({
            institution: e.institution,
            degree: e.degree,
            field: e.field || '',
            graduation_date: e.graduation_date || null,
            gpa: e.gpa || null,
          }));
      }

      // Skills from parsed resume
      if (parsedData?.skills?.length > 0) {
        payload.skills = parsedData.skills.map((s: string) => ({
          skill_name: typeof s === 'string' ? s : '',
          category: 'technical',
          proficiency_level: 3,
        }));
      }

      // 4. Save profile + related data via API (validated, rate-limited)
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setError('Your session has expired. Redirecting to sign in...');
        setTimeout(() => router.replace('/auth-pages/login'), 1500);
        return;
      }

      if (res.status === 429) {
        const json = await res.json();
        setError(json.error?.message || 'Too many requests. Please wait a moment and try again.');
        return;
      }

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || 'Could not save your profile. Please try again.');
        return;
      }

      // 5. Mark onboarding complete ONLY after all data is saved
      const completeRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_complete: true }),
      });

      if (!completeRes.ok) {
        // Data saved but flag failed — still navigate, user can retry
        console.error('Failed to set onboarding_complete flag');
      }

      // 6. Navigate to dashboard
      router.push('/dashboard/home');
    } catch (err) {
      console.error('Profile setup error:', err);
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // ─── Upload step ───
  if (step === 'upload') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <p className="text-xs text-karmio-500 font-medium mb-2">Step 3 of 3</p>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Set up your profile</h1>
          </div>

          <WhyHelper className="mb-6">
            Upload your existing resume and we will auto-fill your profile.
            Or skip to fill it manually. The more complete your profile, the better your tailored resumes will be.
          </WhyHelper>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center mb-4">
            {uploading ? (
              <div>
                <div className="w-8 h-8 border-2 border-karmio-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Parsing your resume...</p>
                <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
              </div>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-slate-400">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15l3-3 3 3" />
                </svg>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Upload your resume</p>
                <p className="text-xs text-slate-500 mb-3">PDF or Word — we will extract your details automatically</p>
                <label className="inline-block px-4 py-2 bg-karmio-500 text-white text-sm font-medium rounded-lg hover:bg-karmio-600 cursor-pointer transition-colors">
                  Choose file
                  <input type="file" accept=".pdf,.docx,.doc" onChange={handlePdfUpload} className="hidden" />
                </label>
                {uploadError && (
                  <p className="text-sm text-red-500 mt-3">{uploadError}</p>
                )}
              </>
            )}
          </div>

          <button onClick={() => setStep('form')}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2">
            Skip — I will fill manually
          </button>
        </div>
      </div>
    );
  }

  // ─── Form step ───
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-xs text-karmio-500 font-medium mb-2">Step 3 of 3</p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Complete your profile</h1>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0 mt-0.5">
              <circle cx="8" cy="8" r="6" /><path d="M8 5v3" /><circle cx="8" cy="10.5" r="0.5" fill="currentColor" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 mb-6">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white mb-4">Personal information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full name" value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Alex Johnson" required />
            <Input label="Phone" value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567" />
            <Input label="LinkedIn URL" value={formData.linkedin_url}
              onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="linkedin.com/in/yourname" />
            <Input label="GitHub URL" value={formData.github_url}
              onChange={e => setFormData({ ...formData, github_url: e.target.value })}
              placeholder="github.com/yourname" />
            <Input label="Portfolio URL" value={formData.portfolio_url}
              onChange={e => setFormData({ ...formData, portfolio_url: e.target.value })}
              placeholder="yourwebsite.com" />
            <Input label="Current location" value={formData.current_location}
              onChange={e => setFormData({ ...formData, current_location: e.target.value })}
              placeholder="Troy, Michigan" />
            <div className="col-span-2">
              <Input label="Target locations (comma separated)" value={formData.target_locations}
                onChange={e => setFormData({ ...formData, target_locations: e.target.value })}
                placeholder="San Francisco, New York, Remote" />
            </div>
          </div>
        </div>

        {/* Projects section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">Projects</h2>
            <Button size="sm" onClick={addProject}>Add project</Button>
          </div>

          <WhyHelper className="mb-4">
            Adding more projects gives the AI more options to customize your resume for each job.
            Users with 5+ projects get significantly better match scores. Include university, personal, and team projects.
          </WhyHelper>

          {projects.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No projects yet. Click &quot;Add project&quot; to start building your vault.
            </div>
          )}

          {projects.map((project, idx) => (
            <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-slate-500">Project {idx + 1}</span>
                <button onClick={() => removeProject(idx)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Project title" value={project.title} placeholder="Payment gateway"
                  onChange={e => updateProject(idx, 'title', e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Type</label>
                  <select value={project.project_type} onChange={e => updateProject(idx, 'project_type', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <option value="university">University</option>
                    <option value="personal">Personal</option>
                    <option value="team">Team</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Textarea label="Description" value={project.description} rows={2} placeholder="What does this project do?"
                    onChange={e => updateProject(idx, 'description', e.target.value)} />
                </div>
                <Input label="Technologies (comma separated)" value={project.technologies} placeholder="React, Node.js, PostgreSQL"
                  onChange={e => updateProject(idx, 'technologies', e.target.value)} />
                <Input label="GitHub link (optional)" value={project.github_link} placeholder="github.com/you/project"
                  onChange={e => updateProject(idx, 'github_link', e.target.value)} />
                <Input label="Your contributions" value={project.contributions} placeholder="What you specifically did"
                  onChange={e => updateProject(idx, 'contributions', e.target.value)} />
                <Input label="Results / Impact" value={project.results} placeholder="Quantifiable outcomes"
                  onChange={e => updateProject(idx, 'results', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        {/* Error banner (also at bottom near button for visibility) */}
        {error && (
          <p className="text-sm text-red-500 text-center mb-3">{error}</p>
        )}

        <Button variant="primary" fullWidth onClick={handleSubmit} loading={loading} disabled={loading} size="lg">
          Complete setup and start using Karmio
        </Button>
      </div>
    </div>
  );
}