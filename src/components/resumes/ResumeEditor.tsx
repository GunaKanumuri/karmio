'use client';

import { useState } from 'react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WhyHelper } from '@/components/shared/Helpers';
import { IResumeRecipe } from '@/types';

interface ResumeEditorProps {
  recipe: IResumeRecipe;
  onSave: (updated: Partial<IResumeRecipe>) => void;
  onCancel: () => void;
}

export function ResumeEditor({ recipe, onSave, onCancel }: ResumeEditorProps) {
  const [summary, setSummary] = useState(recipe.enhanced_summary || '');
  const [bullets, setBullets] = useState<Record<string, string[]>>(recipe.enhanced_bullets || {});
  const [saving, setSaving] = useState(false);

  const updateBullet = (expId: string, idx: number, value: string) => {
    const updated = { ...bullets };
    if (!updated[expId]) updated[expId] = [];
    updated[expId][idx] = value;
    setBullets(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ enhanced_summary: summary, enhanced_bullets: bullets });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <WhyHelper>
        Edit each section independently. Changes update your match score in real-time.
        Your edits are saved to this resume version — they will not affect other versions.
      </WhyHelper>

      <Card>
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Summary</h3>
        <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3}
          placeholder="Professional summary tailored to this role..." />
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Experience bullets</h3>
        {Object.entries(bullets).map(([expId, expBullets]) => (
          <div key={expId} className="mb-4 last:mb-0">
            <p className="text-xs font-medium text-slate-500 mb-2">Experience: {expId}</p>
            {expBullets.map((bullet, idx) => (
              <div key={idx} className="mb-2">
                <Input value={bullet} onChange={e => updateBullet(expId, idx, e.target.value)}
                  placeholder={`Achievement ${idx + 1}`} />
              </div>
            ))}
          </div>
        ))}
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>Save changes</Button>
      </div>
    </div>
  );
}
