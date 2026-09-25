// API base URL strategy:
// - In production (Vercel): use the same-origin /api/* proxy defined in vercel.json
//   which forwards requests to the Render backend. This eliminates CORS entirely.
// - In local dev with explicit VITE_API_URL: use the provided URL (points to local backend).
// - Local dev without VITE_API_URL: also use /api/* which vite.config.js proxies to localhost:8000.

const VITE_API_URL = import.meta.env.VITE_API_URL;

// Use same-origin proxy unless explicitly overridden by env var
const API_BASE_URL = VITE_API_URL
  ? `${VITE_API_URL.replace(/\/$/, '').replace(/\/api$/, '')}/api`
  : '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.detail) {
        errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function fetchHealthStatus(timeoutMs = 90000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return handleResponse(res);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function uploadDocuments(fileList) {
  const formData = new FormData();
  for (let i = 0; i < fileList.length; i++) {
    formData.append('files', fileList[i]);
  }

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE_URL}/documents`);
  return handleResponse(res);
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

export async function clearAllDocuments() {
  const res = await fetch(`${API_BASE_URL}/clear`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

export async function sendQuery(question, topK = 4) {
  const res = await fetch(`${API_BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, top_k: topK }),
  });
  return handleResponse(res);
}
