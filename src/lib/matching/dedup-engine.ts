import CryptoJS from 'crypto-js';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateDedupHash(company: string, title: string, location: string): string {
  const input = normalize(company) + '|' + normalize(title) + '|' + normalize(location);
  return CryptoJS.SHA256(input).toString();
}

export function isSimilarJob(
  existing: { company_name: string; title: string; location: string },
  incoming: { company_name: string; title: string; location: string }
): boolean {
  return generateDedupHash(existing.company_name, existing.title, existing.location) ===
    generateDedupHash(incoming.company_name, incoming.title, incoming.location);
}
