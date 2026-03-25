'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Building2, Users, Globe, Briefcase } from 'lucide-react';

interface CompanyIntelProps {
  companyName: string;
  careerUrl?: string;
  sponsorshipHistory?: boolean;
  openRolesCount?: number;
  sourceType: string;
  location?: string;
}

export function CompanyIntel({ companyName, careerUrl, sponsorshipHistory, openRolesCount, sourceType, location }: CompanyIntelProps) {
  return (
    <Card padding="md">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Building2 size={18} className="text-slate-500" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">{companyName}</h3>
          <p className="text-xs text-slate-500">{location || 'Location not specified'}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Globe size={14} className="text-slate-400" />
          <span>Source: {sourceType}</span>
          {careerUrl && (
            <a href={careerUrl} target="_blank" rel="noopener noreferrer"
              className="text-karmio-500 hover:underline ml-auto text-xs">View career page</a>
          )}
        </div>
        {openRolesCount !== undefined && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Briefcase size={14} className="text-slate-400" />
            <span>{openRolesCount} open roles</span>
            {openRolesCount > 10 && <Badge variant="success">Actively hiring</Badge>}
          </div>
        )}
        {sponsorshipHistory !== undefined && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Users size={14} className="text-slate-400" />
            <span>H1B sponsorship history:</span>
            <Badge variant={sponsorshipHistory ? 'success' : 'warning'}>
              {sponsorshipHistory ? 'Has sponsored before' : 'No records found'}
            </Badge>
          </div>
        )}
      </div>

      <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          Company intel is gathered from public sources including DOL H1B filings, company career pages, and ATS data.
          Data may not be 100% current, verify on the company website before applying.
        </p>
      </div>
    </Card>
  );
}
