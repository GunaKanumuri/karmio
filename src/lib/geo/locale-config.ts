import { GEO_CONFIG, PRICING } from '@/lib/constants';

export function getLocaleConfig(country: string) {
  return GEO_CONFIG[country] || GEO_CONFIG['DEFAULT'];
}

export function getPricing(country: string) {
  return PRICING[country] || PRICING['DEFAULT'];
}

export function formatSalary(amount: number, country: string): string {
  const config = getLocaleConfig(country);
  const currency = config.currency;
  const locale = config.locale;

  // Indian LPA format
  if (currency === 'INR') {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} LPA`;
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  // All other currencies: use Intl formatter
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  country: string,
  currency?: string
): string {
  if (!min && !max) return '';
  const c = country;
  if (min && max) return `${formatSalary(min, c)} – ${formatSalary(max, c)}`;
  if (min) return `${formatSalary(min, c)}+`;
  return `Up to ${formatSalary(max!, c)}`;
}

export function formatDate(dateStr: string, country: string): string {
  const config = getLocaleConfig(country);
  const date = new Date(dateStr);
  return date.toLocaleDateString(config.locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function getHoursSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
}

export function getTimeSince(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
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