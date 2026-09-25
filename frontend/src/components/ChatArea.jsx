import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, RefreshCw, AlertTriangle, Lightbulb, CornerDownLeft, ShieldAlert } from 'lucide-react';
import SourceCitations from './SourceCitations';

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  isLoading, 
  hasDocuments, 
  onClearChat 
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleSuggestionClick = (promptText) => {
    if (isLoading) return;
    onSendMessage(promptText);
  };

  const samplePrompts = [
    "What are the main topics discussed in the uploaded document?",
    "Summarize the key conclusions and action items.",
    "Are there any explicit risk factors or dependencies mentioned?",
    "List all named entities, dates, or technical specifications."
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-obsidian-950/50 relative overflow-hidden">

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* Empty State: No Documents Uploaded */}
        {!hasDocuments && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12 px-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-brand-500/10 text-brand-500 flex items-center justify-center mb-4 border border-brand-500/20 shadow-lg shadow-brand-500/5">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100">
              Ingest Documents to Begin Q&A
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Upload PDF or .TXT files using the left panel. The pipeline will recursively chunk content, generate FAISS embeddings, and perform context-bounded answer synthesis.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-obsidian-850 border border-slate-200 dark:border-obsidian-800">
                all-MiniLM-L6-v2 (384d)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-obsidian-850 border border-slate-200 dark:border-obsidian-800">
                FAISS FlatIP Index
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-obsidian-850 border border-slate-200 dark:border-obsidian-800">
                Zero Hallucination Guardrail
              </span>
            </div>
          </div>
        )}

        {/* Empty State: Documents Ingested, Ready to Query */}
        {hasDocuments && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8 px-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 border border-emerald-500/20">
              <Lightbulb className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-display font-semibold text-slate-900 dark:text-slate-100">
              Knowledge Base Ready
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Select a prompt below or type your custom query to search vector embeddings.
            </p>

            {/* Prompt Suggestion Pills */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(prompt)}
                  className="p-3 text-left rounded-xl bg-white dark:bg-obsidian-850 border border-slate-200/80 dark:border-obsidian-800 hover:border-brand-500/60 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 shadow-2xs transition-all group"
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className="line-clamp-2">{prompt}</span>
                    <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Message Stream */}
        {messages.map((msg, index) => (
          <div key={index} className="animate-slide-up">
            {msg.role === 'user' ? (
              /* User Message Bubble */
              <div className="flex justify-end gap-3 max-w-3xl ml-auto">
                <div className="p-4 rounded-2xl bg-slate-900 dark:bg-brand-500 text-white dark:text-obsidian-950 font-medium text-sm shadow-md">
                  {msg.content}
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-obsidian-800 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              </div>
            ) : (
              /* AI Response Card */
              <div className="flex gap-3.5 max-w-3xl">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-brand-500 text-obsidian-950 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-brand-500/10">
                  <Bot className="w-5 h-5" />
                </div>

                <div className="flex-1 glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-obsidian-800">
                  
                  {/* AI Card Metadata Bar */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-obsidian-800/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-slate-900 dark:text-slate-100">
                        Synthetix AI
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-obsidian-800 text-slate-500">
                        {msg.llm_provider || 'all-MiniLM-L6-v2'}
                      </span>
                    </div>
                    {msg.execution_time_ms && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {msg.execution_time_ms} ms
                      </span>
                    )}
                  </div>

                  {/* AI Response Text */}
                  <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Source Citations Accordion */}
                  {msg.citations && msg.citations.length > 0 && (
                    <SourceCitations 
                      citations={msg.citations} 
                      foundMatch={msg.found_match}
                      topScore={msg.top_similarity_score}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading State: Branded Pulsing Indicator */}
        {isLoading && (
          <div className="flex gap-3.5 max-w-3xl animate-fade-in">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 animate-pulse">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>

            <div className="flex-1 glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-obsidian-800">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-500 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                Searching FAISS Index & Synthesizing Context...
              </div>

              {/* Skeleton Loaders */}
              <div className="space-y-2.5">
                <div className="h-3.5 bg-slate-200 dark:bg-obsidian-800 rounded-full w-5/6 animate-pulse"></div>
                <div className="h-3.5 bg-slate-200 dark:bg-obsidian-800 rounded-full w-4/6 animate-pulse"></div>
                <div className="h-3.5 bg-slate-200 dark:bg-obsidian-800 rounded-full w-3/6 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-200/80 dark:border-obsidian-800/80 bg-white/80 dark:bg-obsidian-900/80 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || !hasDocuments}
            placeholder={
              !hasDocuments 
                ? "Upload a document to enable Q&A..." 
                : "Ask a question about the document context..."
            }
            className="flex-1 px-4 py-3 text-sm rounded-xl bg-slate-100 dark:bg-obsidian-850 border border-slate-200/80 dark:border-obsidian-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading || !hasDocuments}
            className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-obsidian-950 font-semibold text-sm shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
