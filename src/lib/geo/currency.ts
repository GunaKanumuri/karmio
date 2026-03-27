import { getLocaleConfig } from './locale-config';

export function formatCurrency(amount: number, country: string): string {
  const config = getLocaleConfig(country);
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${config.currency} ${amount.toLocaleString()}`;
  }
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  country: string
): string {
  if (!min && !max) return '';
  if (min && max) return `${formatCurrency(min, country)} – ${formatCurrency(max, country)}`;
  if (min) return `${formatCurrency(min, country)}+`;
  return `Up to ${formatCurrency(max!, country)}`;
}