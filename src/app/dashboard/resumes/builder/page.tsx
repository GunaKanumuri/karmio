'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { ResumeImporter } from '@/components/shared/ResumeImporter';

interface Experience {
  id: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  bullets: string[];
  is_current: boolean;
  selected: boolean;
}

interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  github_link: string | null;
  match_score: number;
  selected: boolean;
  fit_category?: 'best_fit' | 'close_fit' | 'low_fit';
  reason?: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduation_date: string | null;
  gpa: number | null;
}

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  skills: string[];
}

function ResumeEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = searchParams.get('job');

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects'>('summary');
  const [aiResult, setAiResult] = useState<any>(null);
  const [importKey, setImportKey] = useState(0);

  // Resume data state
  const [resumeData, setResumeData] = useState<ResumeData>({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    portfolio: '',
    summary: '',
    experiences: [],
    projects: [],
    education: [],
    skills: [],
  });

  // Fetch user profile and job data — uses REAL profile API data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Single API call — profile endpoint returns experiences, projects, education, skills
      const profileRes = await fetch('/api/profile');
      const profileJson = await profileRes.json();
      const p = profileJson.data;

      if (p) {
        setResumeData({
          name: p.full_name || user.email?.split('@')[0] || '',
          email: user.email || '',
          phone: p.phone || '',
          linkedin: p.linkedin_url || '',
          github: p.github_url || '',
          portfolio: p.portfolio_url || '',
          summary: '',
          experiences: (p.experiences || []).map((exp: any) => ({
            id: exp.id,
            company: exp.company,
            title: exp.title,
            start_date: exp.start_date,
            end_date: exp.end_date,
            bullets: exp.bullets || [],
            is_current: exp.is_current,
            selected: true,
          })),
          projects: (p.projects || []).map((proj: any) => ({
            id: proj.id,
            title: proj.title,
            description: proj.description || '',
            technologies: proj.technologies || [],
            github_link: proj.github_link,
            match_score: 0,
            selected: false,
          })),
          education: (p.education || []).map((edu: any) => ({
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field || '',
            graduation_date: edu.graduation_date,
            gpa: edu.gpa,
          })),
          skills: (p.skills || []).map((s: any) => typeof s === 'string' ? s : s.skill_name),
        });
      }

      // Fetch job if provided — score projects against JD
      if (jobId) {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        const jobJson = await jobRes.json();
        if (jobJson.success && jobJson.data) {
          setJob(jobJson.data);

          // Score projects against JD using project-scorer
          if (jobJson.data.description_parsed && p?.projects?.length > 0) {
            try {
              const { scoreProjects, getRecommendedProjects } = await import('@/lib/matching/project-scorer');
              const careerStage = p.target_profiles?.[0]?.career_stage;
              const scored = scoreProjects(p.projects, jobJson.data.description_parsed, careerStage);
              const { selected } = getRecommendedProjects(scored, careerStage);
              const selectedIds = new Set(selected.map((s: any) => s.id));

              setResumeData(prev => ({
                ...prev,
                projects: scored.map((sp: any) => ({
                  id: sp.id,
                  title: sp.title,
                  description: sp.description || '',
                  technologies: sp.technologies || [],
                  github_link: sp.github_link,
                  match_score: sp.relevance_score,
                  selected: selectedIds.has(sp.id),
                  fit_category: sp.fit_category,
                  reason: sp.reason,
                })),
              }));
            } catch (err) {
              console.error('Project scoring error:', err);
            }
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, jobId, importKey]);

  // Generate AI recommendations
  const handleGenerate = async () => {
    if (!jobId) return;
    setGenerating(true);

    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, action: 'generate' }),
      });

      const json = await res.json();
      if (json.success) {
        setAiResult(json.data);
        // Update summary with AI version
        setResumeData(prev => ({
          ...prev,
          summary: json.data.enhanced_summary || prev.summary,
        }));
        // Re-score projects with matched keywords
        if (json.data.keywords_matched) {
          setResumeData(prev => ({
            ...prev,
            projects: scoreProjectsByKeywords(prev.projects, json.data.keywords_matched),
          }));
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
    }

    setGenerating(false);
  };

  // Score projects by keyword match (lightweight fallback when full JD parsing isn't available)
  const scoreProjectsByKeywords = (projects: Project[], keywords: string[]): Project[] => {
    return projects.map(p => {
      let score = 0;
      const techLower = p.technologies.map(t => t.toLowerCase());
      const descLower = (p.description || '').toLowerCase();
      keywords.forEach(kw => {
        if (techLower.some(t => t.includes(kw.toLowerCase()))) score += 20;
        if (descLower.includes(kw.toLowerCase())) score += 10;
      });
      return { ...p, match_score: Math.min(100, score) };
    }).sort((a, b) => b.match_score - a.match_score);
  };

  // Toggle project selection
  const toggleProject = (projectId: string) => {
    setResumeData(prev => {
      const selectedCount = prev.projects.filter(p => p.selected).length;
      const project = prev.projects.find(p => p.id === projectId);

      // Allow max 3 selected
      if (!project?.selected && selectedCount >= 3) {
        return prev;
      }

      return {
        ...prev,
        projects: prev.projects.map(p =>
          p.id === projectId ? { ...p, selected: !p.selected } : p
        ),
      };
    });
  };

  // Toggle experience selection
  const toggleExperience = (expId: string) => {
    setResumeData(prev => ({
      ...prev,
      experiences: prev.experiences.map(e =>
        e.id === expId ? { ...e, selected: !e.selected } : e
      ),
    }));
  };

  // Update field
  const updateField = (field: keyof ResumeData, value: any) => {
    setResumeData(prev => ({ ...prev, [field]: value }));
  };

  // Update experience bullet
  const updateBullet = (expId: string, bulletIndex: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      experiences: prev.experiences.map(e =>
        e.id === expId
          ? { ...e, bullets: e.bullets.map((b, i) => i === bulletIndex ? value : b) }
          : e
      ),
    }));
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-karmio-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const selectedProjects = resumeData.projects.filter(p => p.selected);
  const selectedExperiences = resumeData.experiences.filter(e => e.selected);

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 mb-2 transition-colors text-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-semibold text-surface-900 dark:text-white">
              Resume Builder {job && `for ${job.title}`}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Import Resume button */}
            <ResumeImporter
              variant="button"
              buttonLabel="Import Resume"
              onImportComplete={async () => {
                setImportKey(k => k + 1);
              }}
            />
            {job && !aiResult && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn btn-primary btn-sm"
                data-testid="ai-optimize-btn"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Optimize
                  </>
                )}
              </button>
            )}
            <button className="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* AI Match Score Banner */}
        {aiResult && (
          <div className="mb-4 p-4 rounded-xl bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold ${
                  aiResult.match_score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
                  aiResult.match_score >= 60 ? 'bg-karmio-100 text-karmio-700 dark:bg-karmio-900/50 dark:text-karmio-300' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                }`}>
                  {aiResult.match_score}%
                </div>
                <div>
                  <p className="font-medium text-surface-900 dark:text-white">Match Score</p>
                  <p className="text-sm text-surface-500">
                    {aiResult.keywords_matched?.length || 0} keywords matched
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiResult.keywords_matched?.slice(0, 5).map((kw: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content: Split View */}
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Left: Resume Preview */}
          <div className="w-1/2 overflow-auto rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-sm">
            <ResumePreview data={resumeData} selectedProjects={selectedProjects} selectedExperiences={selectedExperiences} />
          </div>

          {/* Right: Edit Form */}
          <div className="w-1/2 flex flex-col min-h-0">
            {/* Section Tabs */}
            <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl mb-4 flex-shrink-0">
              {(['contact', 'summary', 'experience', 'projects', 'education', 'skills'] as const).map(section => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeSection === section
                      ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                      : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                  }`}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              ))}
            </div>

            {/* Section Content */}
            <div className="flex-1 overflow-auto rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-6">
              {activeSection === 'contact' && (
                <ContactSection data={resumeData} onChange={updateField} />
              )}
              {activeSection === 'summary' && (
                <SummarySection
                  summary={resumeData.summary}
                  aiSummary={aiResult?.enhanced_summary}
                  onChange={(v: string) => updateField('summary', v)}
                />
              )}
              {activeSection === 'experience' && (
                <ExperienceSection
                  experiences={resumeData.experiences}
                  onToggle={toggleExperience}
                  onUpdateBullet={updateBullet}
                  aiResult={aiResult}
                />
              )}
              {activeSection === 'projects' && (
                <ProjectsSection
                  projects={resumeData.projects}
                  onToggle={toggleProject}
                  maxSelect={3}
                />
              )}
              {activeSection === 'education' && (
                <EducationSection education={resumeData.education} />
              )}
              {activeSection === 'skills' && (
                <SkillsSection
                  skills={resumeData.skills}
                  matchedKeywords={aiResult?.keywords_matched || []}
                  missingKeywords={aiResult?.keywords_missing || []}
                  onChange={(v: string[]) => updateField('skills', v)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// Resume Preview Component
function ResumePreview({ data, selectedProjects, selectedExperiences }: {
  data: ResumeData;
  selectedProjects: Project[];
  selectedExperiences: Experience[];
}) {
  return (
    <div className="p-8 text-sm">
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b border-surface-200 dark:border-surface-700">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{data.name || 'Your Name'}</h1>
        <p className="text-surface-500 mt-1">
          {[data.email, data.phone, data.linkedin].filter(Boolean).join(' • ')}
        </p>
      </div>

      {/* Summary */}
      {data.summary && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-karmio-600 dark:text-karmio-400 uppercase tracking-wider mb-2">Professional Summary</h2>
          <p className="text-surface-700 dark:text-surface-300 leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {selectedExperiences.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-karmio-600 dark:text-karmio-400 uppercase tracking-wider mb-3">Experience</h2>
          {selectedExperiences.map((exp) => (
            <div key={exp.id} className="mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">{exp.title}</h3>
                  <p className="text-surface-600 dark:text-surface-400">{exp.company}</p>
                </div>
                <span className="text-xs text-surface-500">
                  {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {exp.bullets.map((bullet, i) => (
                  <li key={i} className="text-surface-600 dark:text-surface-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-karmio-500">
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {selectedProjects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-karmio-600 dark:text-karmio-400 uppercase tracking-wider mb-3">Projects</h2>
          {selectedProjects.map((proj) => (
            <div key={proj.id} className="mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-surface-900 dark:text-white">{proj.title}</h3>
                {proj.github_link && (
                  <span className="text-xs text-surface-400">{proj.github_link}</span>
                )}
              </div>
              <p className="text-surface-600 dark:text-surface-400 mt-1">{proj.description}</p>
              {proj.technologies.length > 0 && (
                <p className="text-xs text-surface-500 mt-1">
                  <span className="font-medium">Tech:</span> {proj.technologies.join(', ')}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-karmio-600 dark:text-karmio-400 uppercase tracking-wider mb-3">Education</h2>
          {data.education.map((edu) => (
            <div key={edu.id} className="mb-2">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">{edu.degree} in {edu.field}</h3>
                  <p className="text-surface-600 dark:text-surface-400">{edu.institution}</p>
                </div>
                {edu.graduation_date && (
                  <span className="text-xs text-surface-500">{formatDate(edu.graduation_date)}</span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-karmio-600 dark:text-karmio-400 uppercase tracking-wider mb-2">Skills</h2>
          <p className="text-surface-600 dark:text-surface-400">{data.skills.join(' • ')}</p>
        </section>
      )}
    </div>
  );
}

// Section Components
function ContactSection({ data, onChange }: { data: ResumeData; onChange: (field: keyof ResumeData, value: any) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Contact Information</h3>

      <div>
        <label className="input-label">Full Name</label>
        <input
          type="text"
          value={data.name}
          onChange={e => onChange('name', e.target.value)}
          className="input-field"
          placeholder="Jane Doe"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={e => onChange('email', e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="input-label">Phone</label>
          <input
            type="tel"
            value={data.phone}
            onChange={e => onChange('phone', e.target.value)}
            className="input-field"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div>
        <label className="input-label">LinkedIn URL</label>
        <input
          type="url"
          value={data.linkedin}
          onChange={e => onChange('linkedin', e.target.value)}
          className="input-field"
          placeholder="linkedin.com/in/yourprofile"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">GitHub</label>
          <input
            type="url"
            value={data.github}
            onChange={e => onChange('github', e.target.value)}
            className="input-field"
            placeholder="github.com/username"
          />
        </div>
        <div>
          <label className="input-label">Portfolio</label>
          <input
            type="url"
            value={data.portfolio}
            onChange={e => onChange('portfolio', e.target.value)}
            className="input-field"
            placeholder="yoursite.com"
          />
        </div>
      </div>
    </div>
  );
}

function SummarySection({ summary, aiSummary, onChange }: { summary: string; aiSummary?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Professional Summary</h3>
        {aiSummary && summary !== aiSummary && (
          <button
            onClick={() => onChange(aiSummary)}
            className="text-xs text-karmio-500 hover:text-karmio-600 font-medium"
          >
            Use AI version
          </button>
        )}
      </div>

      <textarea
        value={summary}
        onChange={e => onChange(e.target.value)}
        className="input-field min-h-[120px] resize-none"
        placeholder="Write a brief professional summary highlighting your key strengths and career goals..."
      />

      <p className="text-xs text-surface-500">
        Tip: Keep it to 2-3 sentences. Focus on your value proposition for this specific role.
      </p>
    </div>
  );
}

function ExperienceSection({ experiences, onToggle, onUpdateBullet, aiResult }: {
  experiences: Experience[];
  onToggle: (id: string) => void;
  onUpdateBullet: (expId: string, bulletIndex: number, value: string) => void;
  aiResult?: any;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Experience</h3>
      <p className="text-sm text-surface-500 mb-4">Select experiences to include and edit bullet points.</p>

      {experiences.length === 0 && (
        <div className="text-center py-8">
          <p className="text-surface-500 text-sm">No experiences found.</p>
          <p className="text-surface-400 text-xs mt-1">Import your resume using the button above, or add experiences in your profile.</p>
        </div>
      )}

      {experiences.map((exp) => (
        <div
          key={exp.id}
          className={`rounded-xl border transition-all ${
            exp.selected
              ? 'border-karmio-300 dark:border-karmio-700 bg-karmio-50/50 dark:bg-karmio-900/10'
              : 'border-surface-200 dark:border-surface-700'
          }`}
        >
          <div
            className="p-4 flex items-center gap-3 cursor-pointer"
            onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
          >
            <input
              type="checkbox"
              checked={exp.selected}
              onChange={() => onToggle(exp.id)}
              onClick={e => e.stopPropagation()}
              className="w-5 h-5 rounded border-surface-300 text-karmio-500 focus:ring-karmio-500"
            />
            <div className="flex-1">
              <h4 className="font-medium text-surface-900 dark:text-white">{exp.title}</h4>
              <p className="text-sm text-surface-500">{exp.company} • {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date)}</p>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={`text-surface-400 transition-transform ${expandedId === exp.id ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          {expandedId === exp.id && (
            <div className="px-4 pb-4 border-t border-surface-100 dark:border-surface-800 pt-4">
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">Bullet Points</p>
              <div className="space-y-2">
                {exp.bullets.map((bullet, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-karmio-500 mt-2">•</span>
                    <textarea
                      value={bullet}
                      onChange={e => onUpdateBullet(exp.id, i, e.target.value)}
                      className="input-field flex-1 min-h-[60px] text-sm resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectsSection({ projects, onToggle, maxSelect }: {
  projects: Project[];
  onToggle: (id: string) => void;
  maxSelect: number;
}) {
  const selectedCount = projects.filter(p => p.selected).length;

  // Split into best fit and alternatives based on fit_category or score
  const bestFit = projects.filter(p => p.fit_category === 'best_fit' || (!p.fit_category && p.match_score >= 40));
  const closeFit = projects.filter(p => p.fit_category === 'close_fit' || (!p.fit_category && p.match_score >= 20 && p.match_score < 40));
  const remaining = projects.filter(p =>
    p.fit_category === 'low_fit' || (!p.fit_category && p.match_score < 20)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Projects</h3>
        <span className="text-sm text-surface-500">{selectedCount}/{maxSelect} selected</span>
      </div>
      <p className="text-sm text-surface-500">AI picked top matches. Select up to {maxSelect} projects.</p>

      {projects.length === 0 && (
        <div className="text-center py-8">
          <p className="text-surface-500 text-sm">No projects found.</p>
          <p className="text-surface-400 text-xs mt-1">Import your resume or add projects in your profile to include them in tailored resumes.</p>
        </div>
      )}

      {/* Best Fit */}
      {bestFit.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Best fit ({bestFit.length})
          </p>
          {bestFit.map((proj) => (
            <ProjectCard key={proj.id} project={proj} onToggle={onToggle} disabled={!proj.selected && selectedCount >= maxSelect} />
          ))}
        </div>
      )}

      {/* Close Fit */}
      {closeFit.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Close fit — swap in ({closeFit.length})
          </p>
          {closeFit.map((proj) => (
            <ProjectCard key={proj.id} project={proj} onToggle={onToggle} disabled={!proj.selected && selectedCount >= maxSelect} />
          ))}
        </div>
      )}

      {/* Low Fit */}
      {remaining.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">
            Other projects ({remaining.length})
          </p>
          {remaining.map((proj) => (
            <ProjectCard key={proj.id} project={proj} onToggle={onToggle} disabled={!proj.selected && selectedCount >= maxSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onToggle, disabled }: { project: Project; onToggle: (id: string) => void; disabled: boolean }) {
  return (
    <div
      onClick={() => !disabled && onToggle(project.id)}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        project.selected
          ? 'border-karmio-300 dark:border-karmio-700 bg-karmio-50/50 dark:bg-karmio-900/10'
          : disabled
            ? 'border-surface-200 dark:border-surface-700 opacity-50 cursor-not-allowed'
            : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={project.selected}
          onChange={() => onToggle(project.id)}
          disabled={disabled && !project.selected}
          className="w-5 h-5 mt-0.5 rounded border-surface-300 text-karmio-500 focus:ring-karmio-500"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-surface-900 dark:text-white">{project.title}</h4>
            {project.match_score > 0 && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                project.match_score >= 40
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : project.match_score >= 20
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'bg-surface-100 text-surface-500 dark:bg-surface-800'
              }`}>
                {project.match_score}% match
              </span>
            )}
          </div>
          {project.reason && (
            <p className="text-xs text-karmio-500 mt-0.5">{project.reason}</p>
          )}
          <p className="text-sm text-surface-500 mt-1 line-clamp-2">{project.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {project.technologies.slice(0, 4).map((tech, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-xs text-surface-600 dark:text-surface-400">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EducationSection({ education }: { education: Education[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Education</h3>

      {education.length === 0 && (
        <div className="text-center py-8">
          <p className="text-surface-500 text-sm">No education entries found.</p>
          <p className="text-surface-400 text-xs mt-1">Import your resume or add education in your profile.</p>
        </div>
      )}

      {education.map((edu) => (
        <div key={edu.id} className="p-4 rounded-xl border border-surface-200 dark:border-surface-700">
          <h4 className="font-medium text-surface-900 dark:text-white">{edu.degree} in {edu.field}</h4>
          <p className="text-sm text-surface-500">{edu.institution}</p>
          {edu.graduation_date && (
            <p className="text-xs text-surface-400 mt-1">Graduated {formatDate(edu.graduation_date)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function SkillsSection({ skills, matchedKeywords, missingKeywords, onChange }: {
  skills: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  onChange: (skills: string[]) => void;
}) {
  const [newSkill, setNewSkill] = useState('');

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      onChange([...skills, skill]);
    }
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    onChange(skills.filter(s => s !== skill));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Skills</h3>

      {skills.length === 0 && (
        <p className="text-surface-500 text-sm">No skills found. Import your resume or add them below.</p>
      )}

      {/* Current skills */}
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, i) => {
          const isMatched = matchedKeywords.some(kw => skill.toLowerCase().includes(kw.toLowerCase()));
          return (
            <span
              key={i}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                isMatched
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300'
              }`}
            >
              {skill}
              <button onClick={() => removeSkill(skill)} className="hover:text-red-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          );
        })}
      </div>

      {/* Add skill */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newSkill}
          onChange={e => setNewSkill(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSkill(newSkill)}
          placeholder="Add a skill..."
          className="input-field flex-1"
        />
        <button onClick={() => addSkill(newSkill)} className="btn btn-secondary">Add</button>
      </div>

      {/* Suggested skills */}
      {missingKeywords.length > 0 && (
        <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
          <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Suggested for this job:</p>
          <div className="flex flex-wrap gap-2">
            {missingKeywords.map((kw, i) => (
              <button
                key={i}
                onClick={() => addSkill(kw)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              >
                + {kw}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function ResumeBuilderPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-karmio-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    }>
      <ResumeEditorContent />
    </Suspense>
  );
}