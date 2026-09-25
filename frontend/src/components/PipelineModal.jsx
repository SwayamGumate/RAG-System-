import React from 'react';
import { X, FileText, Scissors, Cpu, Database, Search, MessageSquare, CheckCircle } from 'lucide-react';

export default function PipelineModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const steps = [
    {
      icon: <FileText className="w-5 h-5 text-amber-500" />,
      title: "1. Document Upload",
      desc: "Accepts PDF & TXT binary streams with deduplication SHA-256 validation."
    },
    {
      icon: <Scissors className="w-5 h-5 text-emerald-500" />,
      title: "2. Recursive Chunking",
      desc: "~500 token window (2000 chars) with 50-token overlap to maintain clause context."
    },
    {
      icon: <Cpu className="w-5 h-5 text-indigo-500" />,
      title: "3. Vector Embedding",
      desc: "sentence-transformers (all-MiniLM-L6-v2) generates 384-dim unit vectors."
    },
    {
      icon: <Database className="w-5 h-5 text-cyan-500" />,
      title: "4. FAISS Storage",
      desc: "FlatIP index persisted to disk with JSON metadata for instant restarts."
    },
    {
      icon: <Search className="w-5 h-5 text-purple-500" />,
      title: "5. Cosine Retrieval",
      desc: "Top-K vector search with 0.35 similarity score threshold guardrails."
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-rose-500" />,
      title: "6. LLM Synthesis",
      desc: "Context-bounded response generation via Groq LPU (Llama 3.3 70B), Ollama, or OpenAI."
    }

  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-obsidian-700 bg-white dark:bg-obsidian-900 overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-obsidian-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20">
                System Architecture
              </span>
              <span className="text-xs text-slate-400 font-mono">v1.0.0</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 mt-1">
              RAG Execution Pipeline
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Visual Flow Diagram */}
        <div className="py-8 overflow-x-auto">
          <div className="min-w-[700px] flex items-center justify-between relative px-4">
            
            {/* SVG Connecting Flow Line */}
            <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-rose-500 -z-0 opacity-40"></div>

            {steps.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center group max-w-[110px] text-center">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-obsidian-800 border-2 border-slate-200 dark:border-obsidian-700 group-hover:border-brand-500 dark:group-hover:border-brand-500 shadow-md flex items-center justify-center transition-all duration-200 transform group-hover:-translate-y-1">
                  {step.icon}
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {step.title.split('. ')[1]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Grid Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-obsidian-800">
          {steps.map((step, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-obsidian-850 border border-slate-200/60 dark:border-obsidian-800/60">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {step.icon}
                <span>{step.title}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-obsidian-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Deterministic CPU Vector Search with FAISS Disk Persistence</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Close Pipeline Diagram
          </button>
        </div>

      </div>
    </div>
  );
}
