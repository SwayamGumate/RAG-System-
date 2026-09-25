import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'error', onClose, autoHideMs = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoHideMs);
    return () => clearTimeout(timer);
  }, [message, autoHideMs, onClose]);

  if (!message) return null;

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-500 flex-shrink-0" />,
  };

  const borders = {
    error: 'border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200',
    success: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200',
    info: 'border-brand-500/30 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-up max-w-md w-full px-4">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all ${borders[type] || borders.error}`}>
        {icons[type] || icons.error}
        <div className="flex-1 text-sm font-medium pr-2 break-words">
          {message}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
