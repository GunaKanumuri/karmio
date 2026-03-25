'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WhyHelper, Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { FolderOpen, Plus } from 'lucide-react';
import Link from 'next/link';

export default function ProjectVaultPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const json = await res.json();
        if (json.success) setProjects(json.data?.projects || []);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-white">
            Project vault <Badge variant="info">{projects.length}</Badge>
          </h1>
          <Link href="/dashboard/resumes/profile">
            <Button size="sm"><Plus size={14} className="mr-1" />Add project</Button>
          </Link>
        </div>

        <WhyHelper className="mb-4">
          The AI selects the most relevant projects from your vault when tailoring resumes.
          Users with 5+ projects get significantly better match scores.
        </WhyHelper>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4"><Skeleton lines={3} /></div>
          ))}</div>
        ) : projects.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-3">
            {projects.map(proj => (
              <div key={proj.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{proj.title}</p>
                  <Badge>{proj.project_type}</Badge>
                </div>
                {proj.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{proj.description}</p>}
                {proj.technologies?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {proj.technologies.map((t: string) => <Badge key={t} variant="purple">{t}</Badge>)}
                  </div>
                )}
                {proj.contributions && <p className="text-[11px] text-slate-400"><span className="font-medium">Contributions:</span> {proj.contributions}</p>}
                {proj.results && <p className="text-[11px] text-slate-400 mt-0.5"><span className="font-medium">Impact:</span> {proj.results}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <FolderOpen size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">Your project vault is empty</p>
            <p className="text-xs text-slate-400 mt-1">Add projects from your master profile to enable AI-powered resume tailoring.</p>
            <Link href="/dashboard/resumes/profile" className="inline-block mt-3"><Button variant="primary" size="sm">Go to profile</Button></Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
