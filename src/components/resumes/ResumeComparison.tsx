'use client';

import { Badge, AIBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WhyHelper } from '@/components/shared/Helpers';
import { IResumeRecipe } from '@/types';

interface ComparisonProps {
  recipe: IResumeRecipe;
  jobTitle: string;
  companyName: string;
  jdSkills: string[];
  jdResponsibilities: string[];
  onEdit: () => void;
  onDownload: (format: 'docx' | 'pdf') => void;
}

export function ResumeComparison({ recipe, jobTitle, companyName, jdSkills, jdResponsibilities, onEdit, onDownload }: ComparisonProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-base font-medium text-slate-900 dark:text-white">
            Resume for: {jobTitle} at {companyName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Version {recipe.version} — Generated {new Date(recipe.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <AIBadge />
          <Badge variant={recipe.match_score >= 75 ? 'success' : recipe.match_score >= 50 ? 'info' : 'warning'}>
            {recipe.match_score}% match
          </Badge>
        </div>
      </div>

      <WhyHelper className="mb-4">
        Green highlights show where your resume matches the job description. Red shows gaps you might want to address.
        The AI selected your most relevant projects automatically — you can swap them if needed.
      </WhyHelper>

      <div className="grid grid-cols-2 gap-4">
        {/* Left: JD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-3">Job description — {companyName}</p>
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">Required skills</p>
            <div className="flex flex-wrap gap-1">
              {jdSkills.map((skill) => (
                <Badge key={skill} variant={recipe.keywords_matched.includes(skill.toLowerCase()) ? 'success' : 'danger'}>
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">Match summary</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="text-emerald-600 font-medium">{recipe.keywords_matched.length}</span> of {jdSkills.length} skills matched.{' '}
              {recipe.keywords_missing.length > 0 && (
                <><span className="text-red-500 font-medium">{recipe.keywords_missing.length} gaps:</span> {recipe.keywords_missing.join(', ')}</>
              )}
            </p>
          </div>
        </div>

        {/* Right: Resume */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-medium text-slate-500">Your tailored resume</p>
            <Button size="sm" variant="ghost" onClick={onEdit}>Edit sections</Button>
          </div>
          {recipe.enhanced_summary && (
            <div className="mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">Summary <AIBadge /></p>
              <p className="text-xs text-slate-500 leading-relaxed">{recipe.enhanced_summary}</p>
            </div>
          )}
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">Matched keywords in resume</p>
            <div className="flex flex-wrap gap-1">
              {recipe.keywords_matched.map((kw) => <Badge key={kw} variant="success">{kw}</Badge>)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <CoverLetterToggle hasCoverLetter={!!recipe.cover_letter_text} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onDownload('docx')}>Download Word</Button>
          <Button size="sm" onClick={() => onDownload('pdf')}>Download PDF</Button>
        </div>
      </div>
    </div>
  );
}

// === CoverLetterToggle ===
export function CoverLetterToggle({ hasCoverLetter, onChange }: { hasCoverLetter: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <button
        role="switch"
        aria-checked={hasCoverLetter}
        onClick={() => onChange?.(!hasCoverLetter)}
        className={`relative w-9 h-5 rounded-full transition-colors ${hasCoverLetter ? 'bg-karmio-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${hasCoverLetter ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-xs text-slate-500">Generate cover letter too</span>
      {hasCoverLetter && <span className="text-xs text-karmio-500">Included in download</span>}
    </label>
  );
}
