// Karmio Design Tokens
// Used by components that need programmatic access to theme values

export const THEME = {
  colors: {
    karmio: {
      50: '#EEF4FF',
      100: '#D9E6FF',
      200: '#BCDBFF',
      300: '#8EC5FF',
      400: '#59A3FF',
      500: '#1A56DB',
      600: '#1447B8',
      700: '#103894',
      800: '#0D2B71',
      900: '#0A1F52',
    },
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },
  fonts: {
    sans: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
} as const;

// Match score color thresholds
export function getMatchColor(score: number): string {
  if (score >= 75) return THEME.colors.success;
  if (score >= 50) return THEME.colors.info;
  if (score >= 30) return THEME.colors.warning;
  return THEME.colors.danger;
}

export function getMatchLabel(score: number): string {
  if (score >= 80) return 'Excellent match';
  if (score >= 65) return 'Good match';
  if (score >= 50) return 'Moderate match';
  if (score >= 35) return 'Stretch role';
  return 'Low match';
}
