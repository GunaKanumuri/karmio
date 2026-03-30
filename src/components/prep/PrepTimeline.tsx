'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Sparkles, ArrowRight, PhoneCall, Code2, Brain, Trophy, Briefcase } from 'lucide-react';

const STAGE_CONFIG: Record<string, { icon: any; color: string; badge: string }> = {
  applied:    { icon: Briefcase,  color: 'blue',    badge: 'info' },
  hr_screen:  { icon: PhoneCall,  color: 'purple',  badge: 'purple' },
  technical:  { icon: Code2,      color: 'indigo',  badge: 'info' },
  behavioral: { icon: Brain,      color: 'purple',  badge: 'purple' },
  final:      { icon: Brain,      color: 'purple',  badge: 'purple' },
  offer:      { icon: Trophy,     color: 'emerald',  badge: 'success' },
};

interface PrepTimelineProps {
  applications: any[];
  selectedAppId: string | null;
  onSelectApp: (id: string) => void;
  onStartMock: (app: any) => void;
  hasMockAccess: boolean;
}

export function PrepTimeline({
  applications,
  selectedAppId,
  onSelectApp,
  onStartMock,
  hasMockAccess,
}: PrepTimelineProps) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 mb-2.5">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Your interview pipeline
        </p>
        
          <a href="/dashboard/jobs/pipeline"
          className="text-[10px] text-karmio-500 hover:text-karmio-600 flex items-center gap-0.5 ml-auto"
        >
          View full pipeline <ArrowRight size={10} />
        </a>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {applications.slice(0, 8).map((app: any) => {
          const stage = STAGE_CONFIG[app.status] || STAGE_CONFIG.applied;
          const StageIcon = stage.icon;
          const isSelected = selectedAppId === app.id;
          const logoUrl = `https://logo.clearbit.com/${(app.job?.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

          return (
            <button
              key={app.id}
              onClick={() => onSelectApp(app.id)}
              className={`flex-shrink-0 w-56 rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-karmio-300 dark:border-karmio-700 bg-karmio-50/50 dark:bg-karmio-900/20 shadow-sm ring-1 ring-karmio-200 dark:ring-karmio-800'
                  : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="hidden text-[10px] font-bold text-slate-400">
                    {(app.job?.company_name || '?')[0]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {app.job?.company_name || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {app.job?.title || 'Unknown role'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant={stage.badge as any}>
                  <StageIcon size={9} className="mr-0.5" />
                  {app.status.replace('_', ' ')}
                </Badge>

                {isSelected && hasMockAccess && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onStartMock(app); }}
                    className="flex items-center gap-1 text-[10px] font-medium text-karmio-600 dark:text-karmio-400 hover:text-karmio-700 transition-colors"
                  >
                    <Sparkles size={10} /> Mock
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
    );
}   
