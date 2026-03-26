import { Country } from '@/types';
import { GEO_CONFIG, PRICING } from '@/lib/constants';

export function getLocaleConfig(country: Country) {
  return GEO_CONFIG[country];
}

export function getPricing(country: Country) {
  return PRICING[country];
}

export function formatSalary(amount: number, country: Country): string {
  if (country === 'IN') {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} LPA`;
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `$${amount.toLocaleString('en-US')}`;
}

export function formatDate(dateStr: string, country: Country): string {
  const date = new Date(dateStr);
  if (country === 'IN') {
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function getTimeSince(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 5) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}