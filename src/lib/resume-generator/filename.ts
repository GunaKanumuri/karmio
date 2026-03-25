export function generateResumeFilename(
  firstName: string,
  lastName: string,
  companyName: string,
  format: 'docx' | 'pdf'
): string {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  const first = clean(firstName);
  const last = clean(lastName);
  const company = clean(companyName);
  return `${first}_${last}_${company}.${format}`;
}
