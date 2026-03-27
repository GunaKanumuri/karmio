'use client';

import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { fetchAPI } from '@/hooks/useJobs';
import { useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, Linkedin, Github, Globe, MapPin,
  Briefcase, GraduationCap, Code, FolderGit2, Save,
  Upload, CheckCircle2, AlertCircle, Loader2, Plus,
  Trash2, ChevronDown, ChevronUp, Shield, FileText,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('personal');
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile data
  const [profile, setProfile] = useState<any>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [targetProfile, setTargetProfile] = useState<any>(null);

  // Edit states
  const [editProfile, setEditProfile] = useState<any>({});
  const [newSkill, setNewSkill] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Fetch all profile data
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetchAPI<any>('/profile');
        if (res.success && res.data) {
          const d = res.data;
          setProfile(d);
          setExperiences(d.experiences || []);
          setProjects(d.projects || []);
          setEducation(d.education || []);
          setSkills(d.skills || []);
          setTargetProfile(d.target_profiles?.[0] || null);
          setEditProfile({
            full_name: d.full_name || '',
            phone: d.phone || '',
            linkedin_url: d.linkedin_url || '',
            github_url: d.github_url || '',
            portfolio_url: d.portfolio_url || '',
            current_location: d.current_location || '',
            visa_status: d.visa_status || '',
          });
        }
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  // Save personal info
  const savePersonalInfo = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI('/profile', {
        method: 'PUT',
        body: JSON.stringify(editProfile),
      });
      if ((res as any).success) {
        showToast('Profile saved');
        refreshUser?.();
      } else {
        showToast((res as any).error?.message || 'Save failed');
      }
    } catch { showToast('Network error'); }
    setSaving(false);
  };

  // Add skill
  const addSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      await fetchAPI('/profile', {
        method: 'PUT',
        body: JSON.stringify({ skills: [{ skill_name: newSkill.trim() }] }),
      });
      setSkills(prev => [...prev, { skill_name: newSkill.trim(), id: Date.now().toString() }]);
      setNewSkill('');
      showToast('Skill added');
    } catch { showToast('Could not add skill'); }
  };

  // Resume upload for profile update
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast('Parsing resume...');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const parseRes = await fetch('/api/profile/upload-resume', { method: 'POST', body: formData });
      const parseJson = await parseRes.json();
      if (!parseJson.success) { showToast('Could not read file'); return; }

      const saveRes = await fetch('/api/profile/upload-resume/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseJson.data),
      });
      const saveJson = await saveRes.json();
      if (saveJson.success) {
        showToast('Resume imported! Refreshing...');
        // Refresh data
        const res = await fetchAPI<any>('/profile');
        if (res.success && res.data) {
          setProfile(res.data);
          setExperiences(res.data.experiences || []);
          setProjects(res.data.projects || []);
          setEducation(res.data.education || []);
          setSkills(res.data.skills || []);
          setEditProfile({
            full_name: res.data.full_name || editProfile.full_name,
            phone: res.data.phone || editProfile.phone,
            linkedin_url: res.data.linkedin_url || editProfile.linkedin_url,
            github_url: res.data.github_url || editProfile.github_url,
            portfolio_url: res.data.portfolio_url || editProfile.portfolio_url,
            current_location: res.data.current_location || editProfile.current_location,
            visa_status: res.data.visa_status || editProfile.visa_status,
          });
        }
      } else { showToast('Import partially failed'); }
    } catch { showToast('Upload failed'); }
  };

  const sections = [
    { key: 'personal', label: 'Personal Info', icon: User, count: null },
    { key: 'experience', label: 'Experience', icon: Briefcase, count: experiences.length },
    { key: 'projects', label: 'Projects', icon: FolderGit2, count: projects.length },
    { key: 'education', label: 'Education', icon: GraduationCap, count: education.length },
    { key: 'skills', label: 'Skills', icon: Code, count: skills.length },
    { key: 'target', label: 'Target Role', icon: Shield, count: null },
  ];

  if (loading) {
    return <AppShell><div className="max-w-3xl mx-auto"><Skeleton lines={8} /></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <User size={20} className="text-slate-400" /> Profile
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Your master profile powers resume tailoring and job matching.
            </p>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" onChange={handleResumeUpload} className="hidden" />
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={13} className="mr-1" /> Import Resume
            </Button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {sections.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeSection === s.key
                  ? 'bg-karmio-50 dark:bg-karmio-900/20 text-karmio-600 dark:text-karmio-400'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
              <s.icon size={13} />
              {s.label}
              {s.count !== null && (
                <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">{s.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Personal Info ─── */}
        {activeSection === 'personal' && (
          <Card padding="lg">
            <div className="space-y-4">
              <Input label="Full Name" value={editProfile.full_name}
                onChange={e => setEditProfile({ ...editProfile, full_name: e.target.value })} placeholder="Jane Doe" />
              <Input label="Phone" value={editProfile.phone}
                onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })} placeholder="+1 555-123-4567" />
              <Input label="LinkedIn" value={editProfile.linkedin_url}
                onChange={e => setEditProfile({ ...editProfile, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/you" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="GitHub" value={editProfile.github_url}
                  onChange={e => setEditProfile({ ...editProfile, github_url: e.target.value })} placeholder="https://github.com/you" />
                <Input label="Portfolio" value={editProfile.portfolio_url}
                  onChange={e => setEditProfile({ ...editProfile, portfolio_url: e.target.value })} placeholder="https://yoursite.com" />
              </div>
              <Input label="Location" value={editProfile.current_location}
                onChange={e => setEditProfile({ ...editProfile, current_location: e.target.value })} placeholder="Troy, MI" />
              <div className="flex justify-end pt-2">
                <Button variant="primary" size="sm" onClick={savePersonalInfo} loading={saving}>
                  <Save size={13} className="mr-1" /> Save Changes
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ─── Experience ─── */}
        {activeSection === 'experience' && (
          <div className="space-y-3">
            {experiences.length === 0 ? (
              <Card padding="lg">
                <div className="text-center py-8">
                  <Briefcase size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500 mb-3">No experiences yet. Import your resume to auto-fill.</p>
                  <Button size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload size={13} className="mr-1" /> Import Resume
                  </Button>
                </div>
              </Card>
            ) : (
              experiences.map((exp: any) => (
                <Card key={exp.id} padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{exp.title}</p>
                      <p className="text-xs text-slate-500">{exp.company} · {exp.start_date?.slice(0, 7)} – {exp.is_current ? 'Present' : exp.end_date?.slice(0, 7) || ''}</p>
                    </div>
                    {exp.is_current && <Badge variant="success">Current</Badge>}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {(exp.bullets as string[]).map((b, i) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-1.5">
                          <span className="text-slate-400 mt-0.5">•</span> {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {exp.technologies?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {exp.technologies.map((t: string) => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">{t}</span>
                      ))}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* ─── Projects ─── */}
        {activeSection === 'projects' && (
          <div className="space-y-3">
            {projects.length === 0 ? (
              <Card padding="lg">
                <div className="text-center py-8">
                  <FolderGit2 size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500 mb-3">No projects yet. Import your resume or add manually.</p>
                  <Button size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload size={13} className="mr-1" /> Import Resume
                  </Button>
                </div>
              </Card>
            ) : (
              projects.map((proj: any) => (
                <Card key={proj.id} padding="md">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{proj.title}</p>
                    <Badge variant="default">{proj.project_type || 'personal'}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.description}</p>
                  {proj.technologies?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proj.technologies.map((t: string) => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">{t}</span>
                      ))}
                    </div>
                  )}
                  {proj.github_link && (
                    <a href={proj.github_link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-[10px] text-karmio-500 hover:underline">
                      <Github size={10} /> View on GitHub
                    </a>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* ─── Education ─── */}
        {activeSection === 'education' && (
          <div className="space-y-3">
            {education.length === 0 ? (
              <Card padding="lg">
                <div className="text-center py-8">
                  <GraduationCap size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500">No education entries. Import your resume to auto-fill.</p>
                </div>
              </Card>
            ) : (
              education.map((edu: any) => (
                <Card key={edu.id} padding="md">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{edu.degree} in {edu.field}</p>
                  <p className="text-xs text-slate-500">{edu.institution} · {edu.graduation_date?.slice(0, 7) || ''}</p>
                  {edu.gpa && <p className="text-xs text-slate-400 mt-0.5">GPA: {edu.gpa}</p>}
                </Card>
              ))
            )}
          </div>
        )}

        {/* ─── Skills ─── */}
        {activeSection === 'skills' && (
          <Card padding="lg">
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map((s: any) => (
                <span key={s.id || s.skill_name}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {s.skill_name}
                </span>
              ))}
              {skills.length === 0 && (
                <p className="text-sm text-slate-400">No skills yet. Add them manually or import your resume.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
                placeholder="Add a skill..." className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-karmio-500/20" />
              <Button size="sm" onClick={addSkill} disabled={!newSkill.trim()}>
                <Plus size={13} className="mr-1" /> Add
              </Button>
            </div>
          </Card>
        )}

        {/* ─── Target Role ─── */}
        {activeSection === 'target' && (
          <Card padding="lg">
            {targetProfile ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Career Field</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{targetProfile.career_field || targetProfile.profile_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Career Stage</p>
                  <Badge variant="info">{targetProfile.career_stage || '—'}</Badge>
                </div>
                {targetProfile.target_titles?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Target Titles</p>
                    <div className="flex flex-wrap gap-1">
                      {targetProfile.target_titles.map((t: string) => (
                        <Badge key={t} variant="default">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {targetProfile.priority_skills?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Priority Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {targetProfile.priority_skills.map((s: string) => (
                        <Badge key={s} variant="purple">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  To update your target role, go through the <a href="/onboarding/assessment" className="text-karmio-500 hover:underline">assessment</a> again.
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500 mb-3">No target role set. Complete the assessment to personalize your job matches.</p>
                <a href="/onboarding/assessment"><Button size="sm" variant="primary">Set Target Role</Button></a>
              </div>
            )}
          </Card>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </AppShell>
  );
}