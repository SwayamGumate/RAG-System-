import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import PipelineModal from './components/PipelineModal';
import Toast from './components/Toast';
import { Loader2 } from 'lucide-react';
import { 
  fetchHealthStatus, 
  fetchDocuments, 
  uploadDocuments, 
  deleteDocument, 
  clearAllDocuments, 
  sendQuery 
} from './api';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('synthetix_theme');
    if (savedTheme !== null) {
      return savedTheme === 'dark';
    }
    return true;
  });

  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [isColdBooting, setIsColdBooting] = useState(false);
  
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [coldBootSeconds, setColdBootSeconds] = useState(0);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('synthetix_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('synthetix_theme', 'light');
    }
  }, [darkMode]);

  // Load backend data with cold-start wake-up detector
  const loadData = async (isRetry = false) => {
    try {
      const health = await fetchHealthStatus(90000);
      setHealthData(health);
      setIsColdBooting(false);
      setColdBootSeconds(0);

      
      const docsRes = await fetchDocuments();
      setDocuments(docsRes.documents || []);

      if (isRetry) {
        showToast("Backend service connected & active!", "success");
      }
      return true;
    } catch (err) {
      setIsColdBooting(true);
      return false;
    }
  };

  // Cold boot sequential retry loop: ping every 8s (non-overlapping) until backend wakes
  useEffect(() => {
    let stopped = false;
    let timerId = null;
    let secondsTimer = null;

    const startSecondCounter = () => {
      let secs = 0;
      secondsTimer = setInterval(() => {
        secs += 1;
        setColdBootSeconds(secs);
      }, 1000);
    };

    const stopSecondCounter = () => {
      if (secondsTimer) {
        clearInterval(secondsTimer);
        secondsTimer = null;
      }
      setColdBootSeconds(0);
    };

    const runLoop = async () => {
      const isOnline = await loadData(false);
      if (isOnline || stopped) {
        stopSecondCounter();
        return;
      }
      // Backend is sleeping — start the second counter and keep retrying
      startSecondCounter();
      const retry = async () => {
        if (stopped) return;
        const res = await loadData(true);
        if (res) {
          stopSecondCounter();
          return;
        }
        // Wait 6 seconds then try again (non-overlapping)
        timerId = setTimeout(retry, 6000);
      };
      timerId = setTimeout(retry, 6000);
    };

    runLoop();

    return () => {
      stopped = true;
      if (timerId) clearTimeout(timerId);
      stopSecondCounter();
    };
  }, []);

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    if (isColdBooting) {
      showToast("Backend is still waking up — please wait for the connection banner to disappear.", "error");
      return;
    }
    setIsUploading(true);
    try {
      const res = await uploadDocuments(fileList);
      showToast(res.message || "Document indexed successfully", "success");
      await loadData();
    } catch (err) {
      const msg = err.message || "Failed to upload document";
      const hint = msg.toLowerCase().includes('fetch') ? `${msg}. Backend may still be waking up — please wait a moment and retry.` : msg;
      showToast(hint, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await deleteDocument(docId);
      showToast("Document deleted and index updated", "success");
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to delete document", "error");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllDocuments();
      setDocuments([]);
      setMessages([]);
      showToast("Cleared vector store index", "success");
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to clear vector store", "error");
    }
  };

  const handleSendMessage = async (questionText) => {
    if (!questionText.trim() || isLoading) return;

    const userMsg = { role: 'user', content: questionText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await sendQuery(questionText);
      const aiMsg = {
        role: 'assistant',
        content: res.answer,
        citations: res.citations || [],
        found_match: res.found_match,
        top_similarity_score: res.top_similarity_score || 0,
        execution_time_ms: res.execution_time_ms,
        llm_provider: res.llm_provider
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      showToast(`Query Failed: ${err.message}`, "error");
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `An error occurred while querying backend: ${err.message}`,
          citations: [],
          found_match: false
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-obsidian-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Cold Start Top Warning Banner */}
      {isColdBooting && (
        <div className="bg-amber-500 text-obsidian-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Waking up Render backend web service (~30-60s cold start for free tier)... Please wait{coldBootSeconds > 0 ? ` (${coldBootSeconds}s)` : ''}.</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenPipeline={() => setIsPipelineOpen(true)}
        healthData={healthData}
        isColdBooting={isColdBooting}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Two-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          documents={documents}
          onUpload={handleUpload}
          onDelete={handleDeleteDocument}
          onClearAll={handleClearAll}
          isUploading={isUploading}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          hasDocuments={documents.length > 0}
          onClearChat={() => setMessages([])}
        />
      </div>

      <PipelineModal
        isOpen={isPipelineOpen}
        onClose={() => setIsPipelineOpen(false)}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />

    </div>
  );
}
