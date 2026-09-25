const RENDER_BACKEND_URL = 'https://rag-system-fj8m.onrender.com';
let RAW_URL = import.meta.env.VITE_API_URL || RENDER_BACKEND_URL;
if (RAW_URL.startsWith('http://')) {
  RAW_URL = RAW_URL.replace('http://', 'https://');
}
const BASE_URL = RAW_URL.replace(/\/$/, '');
const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

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

export async function fetchHealthStatus(timeoutMs = 25000) {
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
