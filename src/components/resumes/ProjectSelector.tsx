'use client';

import { useState } from 'react';
import { IProject } from '@/types';
import { CheckCircle2, Circle, Github, ExternalLink, ArrowUpDown } from 'lucide-react';

interface ProjectSelectorProps {
  projects: IProject[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  matchedKeywords?: string[];
  maxSelections?: number;
}

export function ProjectSelector({
  projects,
  selectedIds,
  onSelectionChange,
  matchedKeywords = [],
  maxSelections = 3,
}: ProjectSelectorProps) {
  // Score projects by keyword relevance
  const scoredProjects = projects.map(p => {
    let relevance = 0;
    const techLower = p.technologies.map(t => t.toLowerCase());
    const descLower = (p.description || '').toLowerCase();

    matchedKeywords.forEach(kw => {
      if (techLower.some(t => t.includes(kw.toLowerCase()))) relevance += 20;
      if (descLower.includes(kw.toLowerCase())) relevance += 10;
    });

    return { ...p, relevance: Math.min(100, relevance) };
  }).sort((a, b) => b.relevance - a.relevance);

  const toggleProject = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else if (selectedIds.length < maxSelections) {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Select up to {maxSelections} projects ({selectedIds.length}/{maxSelections})
        </span>
        {matchedKeywords.length > 0 && (
          <span className="text-[10px] text-karmio-500 flex items-center gap-1">
            <ArrowUpDown size={10} /> Sorted by relevance
          </span>
        )}
      </div>

      {scoredProjects.map(project => {
        const isSelected = selectedIds.includes(project.id);
        const isDisabled = !isSelected && selectedIds.length >= maxSelections;

        return (
          <button
            key={project.id}
            onClick={() => toggleProject(project.id)}
            disabled={isDisabled}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              isSelected
                ? 'border-karmio-300 dark:border-karmio-700 bg-karmio-50 dark:bg-karmio-900/20'
                : isDisabled
                ? 'border-slate-200 dark:border-slate-700/50 opacity-50 cursor-not-allowed'
                : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start gap-2">
              {isSelected ? (
                <CheckCircle2 size={16} className="text-karmio-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle size={16} className="text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{project.title}</span>
                  {project.relevance > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold">
                      {project.relevance}% match
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {project.technologies.slice(0, 6).map(tech => (
                    <span key={tech} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}