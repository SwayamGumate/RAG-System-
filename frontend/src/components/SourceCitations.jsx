import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Layers, ExternalLink, Sparkles } from 'lucide-react';

export default function SourceCitations({ citations = [], foundMatch = true, topScore = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);

  if (!citations || citations.length === 0) return null;

  const getScoreColor = (score) => {
    if (score >= 0.70) return 'bg-emerald-500 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    if (score >= 0.45) return 'bg-amber-500 text-amber-700 dark:text-amber-300 border-amber-500/30';
    return 'bg-slate-400 text-slate-700 dark:text-slate-300 border-slate-400/30';
  };

  const getScoreBarColor = (score) => {
    if (score >= 0.70) return 'bg-emerald-500';
    if (score >= 0.45) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <div className="mt-4 border-t border-slate-200/80 dark:border-obsidian-800/80 pt-3">
      {/* Accordion Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-obsidian-800/70 hover:bg-slate-200/70 dark:hover:bg-obsidian-800 transition-colors text-left group"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-display">
            Retrieved Source Citations ({citations.length})
          </span>
          {foundMatch && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Top Match: {(topScore * 100).toFixed(1)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>{isOpen ? 'Hide Chunks' : 'Inspect Context'}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
          )}
        </div>
      </button>

      {/* Accordion Content Body */}
      {isOpen && (
        <div className="mt-3 space-y-2.5 animate-slide-up">
          {citations.map((citation, idx) => {
            const scorePct = Math.min(100, Math.max(0, Math.round(citation.similarity_score * 100)));
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200/80 dark:border-obsidian-800/80 bg-white dark:bg-obsidian-900 overflow-hidden shadow-xs transition-all"
              >
                {/* Chunk Card Header */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-obsidian-850 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {citation.filename}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-obsidian-800 px-1.5 py-0.5 rounded">
                      Chunk #{citation.chunk_index}
                    </span>
                  </div>

                  {/* Similarity Progress Bar & Percentage Badge */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-20 sm:w-28 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-obsidian-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(citation.similarity_score)}`}
                          style={{ width: `${scorePct}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 w-8 text-right">
                        {scorePct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Chunk Text Snippet */}
                {isExpanded && (
                  <div className="p-3.5 bg-slate-50/70 dark:bg-obsidian-850/70 border-t border-slate-200/60 dark:border-obsidian-800/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap select-text">
                    {citation.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
