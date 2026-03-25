'use client';

import { useState } from 'react';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IJobFilters } from '@/types';

interface JobFiltersProps {
  filters: IJobFilters;
  onChange: (filters: IJobFilters) => void;
  showSponsorship?: boolean;
}

export function JobFilters({ filters, onChange, showSponsorship = true }: JobFiltersProps) {
  const update = (partial: Partial<IJobFilters>) => onChange({ ...filters, ...partial });

  return (
    <div className="flex gap-3 flex-wrap items-end">
      <div className="flex-1 min-w-[200px]">
        <Input placeholder="Search jobs or companies..." value={filters.search || ''}
          onChange={e => update({ search: e.target.value })} />
      </div>
      <Select options={[
        { value: '1h', label: 'Last hour' }, { value: '4h', label: 'Last 4 hours' },
        { value: '1d', label: 'Last 24 hours' }, { value: '2d', label: 'Last 2 days' },
        { value: '7d', label: 'Last 7 days' },
      ]} value={filters.posted_within || '7d'} onChange={e => update({ posted_within: e.target.value as any })} />
      {showSponsorship && (
        <Select options={[
          { value: '', label: 'All sponsorship' }, { value: 'yes', label: 'Sponsors' },
          { value: 'unknown', label: 'Unknown' }, { value: 'no', label: 'No sponsorship' },
        ]} value={(filters.sponsorship as any)?.[0] || ''} onChange={e => update({ sponsorship: e.target.value ? [e.target.value as any] : undefined })} />
      )}
      <Select options={[
        { value: '', label: 'All locations' }, { value: 'remote', label: 'Remote' },
        { value: 'hybrid', label: 'Hybrid' }, { value: 'onsite', label: 'On-site' },
      ]} value={(filters.remote_type as any)?.[0] || ''} onChange={e => update({ remote_type: e.target.value ? [e.target.value as any] : undefined })} />
      <Select options={[
        { value: 'match', label: 'Best match' }, { value: 'date', label: 'Newest' },
        { value: 'realness', label: 'Most verified' },
      ]} value={filters.sort_by || 'date'} onChange={e => update({ sort_by: e.target.value as any })} />
    </div>
  );
}
