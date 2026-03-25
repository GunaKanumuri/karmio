'use client';

import { IProject } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, AIBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ProjectSelectorProps {
  selectedIds: string[];
  allProjects: IProject[];
  alternativeIds?: string[];
  onSwap: (removeId: string, addId: string) => void;
}

export function ProjectSelector({ selectedIds, allProjects, alternativeIds = [], onSwap }: ProjectSelectorProps) {
  const selected = allProjects.filter(p => selectedIds.includes(p.id));
  const alternatives = allProjects.filter(p => alternativeIds.includes(p.id));
  const unselected = allProjects.filter(p => !selectedIds.includes(p.id) && !alternativeIds.includes(p.id));

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white">Selected projects</h3>
        <span className="text-xs text-slate-400">{selected.length} of {allProjects.length} from vault</span>
      </div>
      <div className="space-y-2 mb-4">
        {selected.map((project, idx) => (
          <Card key={project.id} padding="sm" className="bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-900 dark:text-white">
                  {project.title} {idx === 0 && <AIBadge />}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{project.description}</p>
                <div className="flex gap-1 mt-1">
                  {project.technologies.slice(0, 4).map(t => <Badge key={t} variant="success">{t}</Badge>)}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {alternatives.length > 0 && (
        <>
          <p className="text-xs text-slate-500 mb-2">Alternatives — click to swap with a selected project</p>
          <div className="space-y-2">
            {alternatives.map((project) => (
              <Card key={project.id} padding="sm" hoverable className="opacity-70">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{project.title}</p>
                    <div className="flex gap-1 mt-1">
                      {project.technologies.slice(0, 3).map(t => <Badge key={t}>{t}</Badge>)}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => selected[0] && onSwap(selected[selected.length - 1].id, project.id)}>
                    Swap in
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// === KeywordHighlight ===
interface KeywordHighlightProps {
  text: string;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export function KeywordHighlight({ text, matchedKeywords, missingKeywords }: KeywordHighlightProps) {
  let highlighted = text;
  const allKeywords = [...matchedKeywords.map(k => ({ word: k, type: 'match' })), ...missingKeywords.map(k => ({ word: k, type: 'miss' }))];

  // Simple keyword highlighting using spans
  const parts: Array<{ text: string; type: 'normal' | 'match' | 'miss' }> = [];
  const words = text.split(/(\s+)/);

  words.forEach(word => {
    const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = matchedKeywords.find(k => clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean));
    const missing = missingKeywords.find(k => clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean));

    if (matched && clean.length > 2) parts.push({ text: word, type: 'match' });
    else if (missing && clean.length > 2) parts.push({ text: word, type: 'miss' });
    else parts.push({ text: word, type: 'normal' });
  });

  return (
    <p className="text-xs leading-relaxed">
      {parts.map((part, i) => (
        <span key={i} className={
          part.type === 'match' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-0.5 rounded' :
          part.type === 'miss' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-0.5 rounded' :
          'text-slate-600 dark:text-slate-400'
        }>{part.text}</span>
      ))}
    </p>
  );
}
