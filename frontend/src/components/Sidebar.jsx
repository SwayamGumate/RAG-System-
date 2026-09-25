import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Trash2, Database, ShieldCheck, RefreshCw, X, File } from 'lucide-react';

export default function Sidebar({ 
  documents, 
  onUpload, 
  onDelete, 
  onClearAll, 
  isUploading, 
  isOpen, 
  onCloseMobile 
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        ></div>
      )}

      {/* Main Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-80 sm:w-88 flex-shrink-0
        bg-white dark:bg-obsidian-900 
        border-r border-slate-200/80 dark:border-obsidian-800/80
        flex flex-col h-[calc(100vh-4rem)]
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Sidebar Top Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-obsidian-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-500" />
            <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
              Knowledge Base
            </h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-obsidian-800 text-slate-500 font-mono">
            {documents.length} File{documents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Drag and Drop Upload Dropzone */}
        <div className="p-4 border-b border-slate-200/80 dark:border-obsidian-800/80">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".pdf,.txt"
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative group cursor-pointer
              p-5 rounded-2xl border-2 border-dashed
              transition-all duration-200 text-center
              flex flex-col items-center justify-center
              ${isDragOver 
                ? 'border-brand-500 bg-brand-500/10 scale-[0.99]' 
                : 'border-slate-300 dark:border-obsidian-700 hover:border-brand-500/60 bg-slate-50/50 dark:bg-obsidian-850/50 hover:bg-slate-50 dark:hover:bg-obsidian-850'}
            `}
          >
            {isUploading ? (
              <div className="flex flex-col items-center py-2 animate-pulse">
                <RefreshCw className="w-7 h-7 text-brand-500 animate-spin mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  Chunking & Vectorizing...
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Generating 384-dim embeddings</p>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Drop PDF or .TXT files here
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  or click to browse from device
                </p>
                <span className="mt-3 text-[10px] font-mono text-slate-400 bg-white dark:bg-obsidian-800 px-2 py-0.5 rounded border border-slate-200 dark:border-obsidian-700">
                  Recursive Split (~500 tokens)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Uploaded Documents List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {documents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <File className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-xs font-medium">No documents ingested</p>
              <p className="text-[11px] opacity-70 mt-0.5">Upload files above to begin asking questions.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.doc_id || doc.doc_hash}
                className="group relative p-3 rounded-xl bg-slate-50 dark:bg-obsidian-850 border border-slate-200/70 dark:border-obsidian-800/80 hover:border-slate-300 dark:hover:border-obsidian-700 transition-all flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {doc.filename}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{doc.chunk_count} Chunks</span>
                    <span>•</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                  </div>
                </div>

                <button
                  onClick={() => onDelete(doc.doc_id)}
                  className="absolute right-2 top-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove document from index"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        {documents.length > 0 && (
          <div className="p-4 border-t border-slate-200/80 dark:border-obsidian-800/80 bg-slate-50/50 dark:bg-obsidian-950/50">
            <button
              onClick={onClearAll}
              className="w-full py-2 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/30 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear FAISS Index
            </button>
          </div>
        )}

      </aside>
    </>
  );
}
