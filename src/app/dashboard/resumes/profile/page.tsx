'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { WhyHelper, Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Plus, Trash2, Briefcase, GraduationCap, Code, FolderOpen, User } from 'lucide-react';

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  visa_status: string | null;
  country: string;
  current_location: string | null;
  target_locations: string[];
  subscription_tier: string;
  target_profiles: any[];
  experiences: any[];
  projects: any[];
  education: any[];
  skills: any[];
}

export default function MasterProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form states
  const [personalForm, setPersonalForm] = useState<any>({});
  const [expForm, setExpForm] = useState<any>({});
  const [eduForm, setEduForm] = useState<any>({});
  const [projForm, setProjForm] = useState<any>({});
  const [skillInput, setSkillInput] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      const json = await res.json();
      if (json.success && json.data) {
        setProfile(json.data);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveProfile = async (data: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Profile updated');
        await fetchProfile();
        refreshUser();
      } else {
        showToast('Error: ' + (json.error?.message || 'Update failed'));
      }
    } catch {
      showToast('Network error — please try again');
    }
    setSaving(false);
    setEditSection(null);
  };

  const deleteExperience = async (id: string) => {
    try {
      // We'll use the profile API with a special delete flag
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _delete_experience: id }),
      });
      await fetchProfile();
      showToast('Experience removed');
    } catch {
      showToast('Error removing experience');
    }
  };

  const openPersonalEdit = () => {
    if (!profile) return;
    setPersonalForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      linkedin_url: profile.linkedin_url || '',
      github_url: profile.github_url || '',
      portfolio_url: profile.portfolio_url || '',
      visa_status: profile.visa_status || '',
      current_location: profile.current_location || '',
      target_locations: (profile.target_locations || []).join(', '),
    });
    setEditSection('personal');
  };

  const openExpEdit = (exp?: any) => {
    setExpForm(exp ? {
      id: exp.id,
      company: exp.company,
      title: exp.title,
      start_date: exp.start_date || '',
      end_date: exp.end_date || '',
      is_current: exp.is_current || false,
      bullets: (exp.bullets || []).join('\n'),
      technologies: (exp.technologies || []).join(', '),
    } : {
      company: '', title: '', start_date: '', end_date: '',
      is_current: false, bullets: '', technologies: '',
    });
    setEditSection('experience');
  };

  const openEduEdit = (edu?: any) => {
    setEduForm(edu ? {
      id: edu.id, institution: edu.institution, degree: edu.degree,
      field: edu.field || '', graduation_date: edu.graduation_date || '', gpa: edu.gpa || '',
    } : {
      institution: '', degree: '', field: '', graduation_date: '', gpa: '',
    });
    setEditSection('education');
  };

  const openProjEdit = (proj?: any) => {
    setProjForm(proj ? {
      id: proj.id, title: proj.title, description: proj.description || '',
      technologies: (proj.technologies || []).join(', '),
      contributions: proj.contributions || '', results: proj.results || '',
      github_link: proj.github_link || '', project_type: proj.project_type || 'personal',
    } : {
      title: '', description: '', technologies: '', contributions: '',
      results: '', github_link: '', project_type: 'personal',
    });
    setEditSection('project');
  };

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-slate-900 dark:text-white">Master profile</h1>
            <p className="text-xs text-slate-500 mt-0.5">This is the source for all your tailored resumes</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6">
                <Skeleton lines={4} />
              </div>
            ))}
          </div>
        ) : !profile ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-500">Could not load your profile. Please try refreshing.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Personal information */}
            <Section title="Personal information" icon={<User size={16} />} onEdit={openPersonalEdit}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <Field label="Full name" value={profile.full_name} />
                <Field label="Email" value={profile.email} />
                <Field label="Phone" value={profile.phone} />
                <Field label="Location" value={profile.current_location} />
                <Field label="LinkedIn" value={profile.linkedin_url} link />
                <Field label="GitHub" value={profile.github_url} link />
                <Field label="Portfolio" value={profile.portfolio_url} link />
                {profile.country === 'US' && <Field label="Visa status" value={profile.visa_status} />}
                <div className="col-span-2">
                  <Field label="Target locations" value={(profile.target_locations || []).join(', ')} />
                </div>
              </div>
            </Section>

            {/* Target profiles */}
            <Section title="Target profiles" icon={<Briefcase size={16} />}>
              {(profile.target_profiles || []).length > 0 ? (
                <div className="space-y-2">
                  {profile.target_profiles.map((tp: any) => (
                    <div key={tp.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {tp.profile_name}
                          {tp.is_primary && <Badge variant="info" className="ml-2">Primary</Badge>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Titles: {(tp.target_titles || []).join(', ') || 'None set'}
                        </p>
                        {tp.priority_skills?.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {tp.priority_skills.map((s: string) => (
                              <Badge key={s} variant="purple">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No target profiles set up yet." action="Complete your assessment to get role recommendations." />
              )}
            </Section>

            {/* Work experience */}
            <Section title="Work experience" icon={<Briefcase size={16} />} onAdd={() => openExpEdit()}>
              {(profile.experiences || []).length > 0 ? (
                <div className="space-y-3">
                  {profile.experiences.map((exp: any) => (
                    <div key={exp.id} className="group relative py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{exp.title}</p>
                          <p className="text-xs text-slate-500">{exp.company} — {exp.start_date?.slice(0, 7)} to {exp.is_current ? 'Present' : exp.end_date?.slice(0, 7) || 'N/A'}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button onClick={() => openExpEdit(exp)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Pencil size={14} className="text-slate-400" />
                          </button>
                        </div>
                      </div>
                      {exp.bullets?.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {exp.bullets.map((b: string, i: number) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 pl-3 relative before:absolute before:left-0 before:top-[6px] before:w-1 before:h-1 before:rounded-full before:bg-slate-400">
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                      {exp.technologies?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {exp.technologies.map((t: string) => <Badge key={t}>{t}</Badge>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No work experience added yet." action="Add your experience to enable AI resume tailoring." />
              )}
            </Section>

            {/* Education */}
            <Section title="Education" icon={<GraduationCap size={16} />} onAdd={() => openEduEdit()}>
              {(profile.education || []).length > 0 ? (
                <div className="space-y-2">
                  {profile.education.map((edu: any) => (
                    <div key={edu.id} className="group flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{edu.degree} in {edu.field}</p>
                        <p className="text-xs text-slate-500">{edu.institution}{edu.graduation_date ? ` — ${edu.graduation_date.slice(0, 7)}` : ''}{edu.gpa ? ` — GPA: ${edu.gpa}` : ''}</p>
                      </div>
                      <button onClick={() => openEduEdit(edu)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity">
                        <Pencil size={14} className="text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No education added yet." />
              )}
            </Section>

            {/* Skills */}
            <Section title="Skills" icon={<Code size={16} />} onEdit={() => setEditSection('skills')}>
              {(profile.skills || []).length > 0 ? (
                <div className="flex gap-1.5 flex-wrap">
                  {profile.skills.map((s: any) => (
                    <Badge key={s.id || s.skill_name} variant="purple">
                      {s.skill_name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <EmptyState message="No skills added yet. Add your technical and soft skills." />
              )}
            </Section>

            {/* Projects */}
            <Section title="Project vault" icon={<FolderOpen size={16} />} onAdd={() => openProjEdit()}>
              <WhyHelper className="mb-3">
                The more projects you add, the better the AI can tailor your resume for each job. Include university, personal, and professional projects.
              </WhyHelper>
              {(profile.projects || []).length > 0 ? (
                <div className="space-y-3">
                  {profile.projects.map((proj: any) => (
                    <div key={proj.id} className="group py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {proj.title}
                            <Badge className="ml-2">{proj.project_type}</Badge>
                          </p>
                          {proj.description && <p className="text-xs text-slate-500 mt-0.5">{proj.description}</p>}
                        </div>
                        <button onClick={() => openProjEdit(proj)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity">
                          <Pencil size={14} className="text-slate-400" />
                        </button>
                      </div>
                      {proj.technologies?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {proj.technologies.map((t: string) => <Badge key={t}>{t}</Badge>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No projects in your vault." action="Add projects to supercharge your tailored resumes." />
              )}
            </Section>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">
            {toast}
          </div>
        )}

        {/* Edit Personal Modal */}
        <Modal open={editSection === 'personal'} onClose={() => setEditSection(null)} title="Edit personal information" size="lg">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full name" value={personalForm.full_name || ''} onChange={e => setPersonalForm({ ...personalForm, full_name: e.target.value })} />
            <Input label="Phone" value={personalForm.phone || ''} onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })} />
            <Input label="LinkedIn URL" value={personalForm.linkedin_url || ''} onChange={e => setPersonalForm({ ...personalForm, linkedin_url: e.target.value })} />
            <Input label="GitHub URL" value={personalForm.github_url || ''} onChange={e => setPersonalForm({ ...personalForm, github_url: e.target.value })} />
            <Input label="Portfolio URL" value={personalForm.portfolio_url || ''} onChange={e => setPersonalForm({ ...personalForm, portfolio_url: e.target.value })} />
            <Input label="Current location" value={personalForm.current_location || ''} onChange={e => setPersonalForm({ ...personalForm, current_location: e.target.value })} />
            {profile?.country === 'US' && (
              <Select label="Visa status" value={personalForm.visa_status || ''} onChange={e => setPersonalForm({ ...personalForm, visa_status: e.target.value })}
                options={[
                  { value: '', label: 'Select...' }, { value: 'citizen', label: 'US Citizen' },
                  { value: 'green_card', label: 'Green Card' }, { value: 'h1b', label: 'H-1B' },
                  { value: 'stem_opt', label: 'STEM OPT' }, { value: 'opt', label: 'OPT' },
                  { value: 'other', label: 'Other' },
                ]} />
            )}
            <div className="col-span-2">
              <Input label="Target locations (comma separated)" value={personalForm.target_locations || ''} onChange={e => setPersonalForm({ ...personalForm, target_locations: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setEditSection(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={() => saveProfile({
              ...personalForm,
              target_locations: personalForm.target_locations ? personalForm.target_locations.split(',').map((s: string) => s.trim()) : [],
            })}>Save changes</Button>
          </div>
        </Modal>

        {/* Edit Experience Modal */}
        <Modal open={editSection === 'experience'} onClose={() => setEditSection(null)} title={expForm.id ? 'Edit experience' : 'Add experience'} size="lg">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company" value={expForm.company || ''} onChange={e => setExpForm({ ...expForm, company: e.target.value })} required />
            <Input label="Title" value={expForm.title || ''} onChange={e => setExpForm({ ...expForm, title: e.target.value })} required />
            <Input label="Start date" type="month" value={expForm.start_date?.slice(0, 7) || ''} onChange={e => setExpForm({ ...expForm, start_date: e.target.value + '-01' })} />
            <div>
              <Input label="End date" type="month" value={expForm.end_date?.slice(0, 7) || ''} onChange={e => setExpForm({ ...expForm, end_date: e.target.value + '-01' })} disabled={expForm.is_current} />
              <label className="flex items-center gap-2 mt-1.5">
                <input type="checkbox" checked={expForm.is_current || false} onChange={e => setExpForm({ ...expForm, is_current: e.target.checked, end_date: '' })} className="rounded" />
                <span className="text-xs text-slate-500">Currently working here</span>
              </label>
            </div>
            <div className="col-span-2">
              <Textarea label="Key achievements (one per line)" value={expForm.bullets || ''} rows={4} onChange={e => setExpForm({ ...expForm, bullets: e.target.value })} placeholder="Increased API throughput by 40%&#10;Led team of 4 engineers&#10;Built payment processing pipeline" />
            </div>
            <div className="col-span-2">
              <Input label="Technologies (comma separated)" value={expForm.technologies || ''} onChange={e => setExpForm({ ...expForm, technologies: e.target.value })} placeholder="React, Node.js, PostgreSQL" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setEditSection(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={() => saveProfile({
              experiences: [{
                ...(expForm.id ? { id: expForm.id } : {}),
                company: expForm.company, title: expForm.title,
                start_date: expForm.start_date, end_date: expForm.is_current ? null : expForm.end_date,
                is_current: expForm.is_current,
                bullets: expForm.bullets ? expForm.bullets.split('\n').filter((b: string) => b.trim()) : [],
                technologies: expForm.technologies ? expForm.technologies.split(',').map((s: string) => s.trim()) : [],
              }],
            })}>Save</Button>
          </div>
        </Modal>

        {/* Edit Education Modal */}
        <Modal open={editSection === 'education'} onClose={() => setEditSection(null)} title={eduForm.id ? 'Edit education' : 'Add education'}>
          <div className="space-y-4">
            <Input label="Institution" value={eduForm.institution || ''} onChange={e => setEduForm({ ...eduForm, institution: e.target.value })} required />
            <Input label="Degree" value={eduForm.degree || ''} onChange={e => setEduForm({ ...eduForm, degree: e.target.value })} placeholder="B.S." required />
            <Input label="Field of study" value={eduForm.field || ''} onChange={e => setEduForm({ ...eduForm, field: e.target.value })} placeholder="Computer Science" />
            <Input label="Graduation date" type="month" value={eduForm.graduation_date?.slice(0, 7) || ''} onChange={e => setEduForm({ ...eduForm, graduation_date: e.target.value + '-01' })} />
            <Input label="GPA (optional)" value={eduForm.gpa || ''} onChange={e => setEduForm({ ...eduForm, gpa: e.target.value })} placeholder="3.8" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setEditSection(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={() => saveProfile({ education: [eduForm] })}>Save</Button>
          </div>
        </Modal>

        {/* Edit Project Modal */}
        <Modal open={editSection === 'project'} onClose={() => setEditSection(null)} title={projForm.id ? 'Edit project' : 'Add project'} size="lg">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Project title" value={projForm.title || ''} onChange={e => setProjForm({ ...projForm, title: e.target.value })} required />
            <Select label="Type" value={projForm.project_type || 'personal'} onChange={e => setProjForm({ ...projForm, project_type: e.target.value })}
              options={[{ value: 'university', label: 'University' }, { value: 'personal', label: 'Personal' }, { value: 'team', label: 'Team' }, { value: 'professional', label: 'Professional' }]} />
            <div className="col-span-2">
              <Textarea label="Description" value={projForm.description || ''} rows={2} onChange={e => setProjForm({ ...projForm, description: e.target.value })} />
            </div>
            <Input label="Technologies (comma separated)" value={projForm.technologies || ''} onChange={e => setProjForm({ ...projForm, technologies: e.target.value })} />
            <Input label="GitHub link (optional)" value={projForm.github_link || ''} onChange={e => setProjForm({ ...projForm, github_link: e.target.value })} />
            <Input label="Your contributions" value={projForm.contributions || ''} onChange={e => setProjForm({ ...projForm, contributions: e.target.value })} />
            <Input label="Results / Impact" value={projForm.results || ''} onChange={e => setProjForm({ ...projForm, results: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setEditSection(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={() => saveProfile({
              projects: [{
                ...(projForm.id ? { id: projForm.id } : {}),
                title: projForm.title, description: projForm.description,
                technologies: projForm.technologies ? projForm.technologies.split(',').map((s: string) => s.trim()) : [],
                contributions: projForm.contributions, results: projForm.results,
                github_link: projForm.github_link, project_type: projForm.project_type,
              }],
            })}>Save</Button>
          </div>
        </Modal>

        {/* Edit Skills Modal */}
        <Modal open={editSection === 'skills'} onClose={() => setEditSection(null)} title="Edit skills">
          <div className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input placeholder="Type a skill and press Enter..." value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && skillInput.trim()) {
                      e.preventDefault();
                      const currentSkills = profile?.skills?.map((s: any) => s.skill_name) || [];
                      if (!currentSkills.includes(skillInput.trim())) {
                        saveProfile({ skills: [...currentSkills, skillInput.trim()] });
                      }
                      setSkillInput('');
                    }
                  }} />
              </div>
              <Button onClick={() => {
                if (skillInput.trim()) {
                  const currentSkills = profile?.skills?.map((s: any) => s.skill_name) || [];
                  saveProfile({ skills: [...currentSkills, skillInput.trim()] });
                  setSkillInput('');
                }
              }}>Add</Button>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(profile?.skills || []).map((s: any) => (
              <button key={s.id || s.skill_name} onClick={() => {
                const remaining = (profile?.skills || []).filter((sk: any) => (sk.id || sk.skill_name) !== (s.id || s.skill_name)).map((sk: any) => sk.skill_name);
                saveProfile({ skills: remaining });
              }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                {s.skill_name} <span className="text-[10px]">×</span>
              </button>
            ))}
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}

function Section({ title, icon, children, onEdit, onAdd }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode;
  onEdit?: () => void; onAdd?: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          {title}
        </h2>
        <div className="flex gap-2">
          {onAdd && <Button size="sm" onClick={onAdd}><Plus size={14} className="mr-1" />Add</Button>}
          {onEdit && <Button size="sm" variant="ghost" onClick={onEdit}><Pencil size={14} className="mr-1" />Edit</Button>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
      {value ? (
        link ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
            className="text-sm text-karmio-500 hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-sm text-slate-800 dark:text-slate-200">{value}</p>
        )
      ) : (
        <p className="text-sm text-slate-300 dark:text-slate-600 italic">Not set</p>
      )}
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: string }) {
  return (
    <div className="py-4 text-center">
      <p className="text-xs text-slate-400">{message}</p>
      {action && <p className="text-xs text-slate-500 mt-0.5">{action}</p>}
    </div>
  );
}
