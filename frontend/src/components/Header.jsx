import React from 'react';
import { Sun, Moon, Cpu, Layers, Menu, Sparkles, Database, Loader2, Server } from 'lucide-react';

export default function Header({ 
  darkMode, 
  setDarkMode, 
  onOpenPipeline, 
  healthData, 
  isColdBooting,
  onToggleSidebar 
}) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200/80 dark:border-obsidian-800/80 bg-white/80 dark:bg-obsidian-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
      
      {/* Left Brand Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition-colors"
          title="Toggle Documents Panel"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-brand-400 flex items-center justify-center text-obsidian-950 font-bold shadow-md shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Synthetix <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-obsidian-700">RAG Engine</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Render Free Tier Cold-Start Indicator */}
      {isColdBooting && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>Waking up free Render server (~30s cold start)...</span>
        </div>
      )}

      {/* Right Controls & Status Badges */}
      <div className="flex items-center gap-3">
        
        {/* Backend System Health Badge */}
        {healthData && !isColdBooting && (
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-850 border border-slate-200/70 dark:border-obsidian-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-brand-500" />
              <span className="font-medium capitalize">{healthData.llm_provider || 'Groq'}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-obsidian-700"></span>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>{healthData.faiss_total_chunks || 0} Chunks</span>
            </div>
          </div>
        )}

        {/* Pipeline Diagram Button */}
        <button
          onClick={onOpenPipeline}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 border border-slate-200 dark:border-obsidian-700 transition-colors"
          title="View RAG Execution Architecture"
        >
          <Layers className="w-3.5 h-3.5 text-brand-500" />
          <span className="hidden sm:inline">Pipeline</span>
        </button>

        {/* Light/Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-obsidian-800 border border-slate-200/60 dark:border-obsidian-800 transition-colors"
          title={`Switch to ${darkMode ? 'Light' : 'Dark'} Mode`}
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>

    </header>
  );
}
