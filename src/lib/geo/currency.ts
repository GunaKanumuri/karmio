import { Country } from '@/types';

export function formatCurrency(amount: number, country: Country): string {
  if (country === 'IN') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export function formatSalaryRange(min: number | null, max: number | null, country: Country): string {
  if (!min && !max) return 'Salary not disclosed';
  if (min && max) return `${formatCurrency(min, country)} — ${formatCurrency(max, country)}`;
  if (min) return `${formatCurrency(min, country)}+`;
  return `Up to ${formatCurrency(max!, country)}`;
}

export function formatLPA(amount: number): string {
  const lpa = amount / 100000;
  return `₹${lpa.toFixed(1)} LPA`;
}

export function parseSalaryToAnnual(amount: number, format: 'hourly' | 'monthly' | 'annual'): number {
  switch (format) {
    case 'hourly': return amount * 2080;
    case 'monthly': return amount * 12;
    case 'annual': return amount;
  }
}
