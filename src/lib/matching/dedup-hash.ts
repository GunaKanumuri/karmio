import { createHash } from 'crypto';

/**
 * SHA256-based dedup hash for job deduplication.
 * First 40 hex chars = 160-bit collision resistance.
 */
export function generateDedupHash(company: string, title: string, location: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const input = `${normalize(company)}|${normalize(title)}|${normalize(location)}`;

  return createHash('sha256')
    .update(input)
    .digest('hex')
    .slice(0, 40);
}