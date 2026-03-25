'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Download } from 'lucide-react';
import Link from 'next/link';

export default function TailoredResumesPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/resumes');
        const json = await res.json();
        if (json.success) setResumes(json.data || []);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Tailored resumes <Badge variant="info">{resumes.length}</Badge>
        </h1>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4"><Skeleton lines={2} /></div>
          ))}</div>
        ) : resumes.length > 0 ? (
          <div className="space-y-2">
            {resumes.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={20} className="text-karmio-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {r.job?.company_name || 'Unknown'} — {r.job?.title || 'Unknown role'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.match_score ? `${r.match_score}% match` : ''} · {r.format || 'docx'} · v{r.version || 1}
                      {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.keywords_matched?.length > 0 && (
                    <Badge variant="success">{r.keywords_matched.length} keywords</Badge>
                  )}
                  <Button size="sm" variant="ghost"><Download size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <FileText size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No tailored resumes yet</p>
            <p className="text-xs text-slate-400 mt-1">When you click &quot;View tailored resume&quot; on a job card, AI will generate a customized resume for that role.</p>
            <Link href="/dashboard/jobs/feed" className="inline-block mt-3"><Button variant="primary" size="sm">Find jobs to tailor for</Button></Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
