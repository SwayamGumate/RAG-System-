// All API calls go through the same-origin Vercel /api proxy (vercel.json rewrites).
// This eliminates CORS entirely — the browser never calls Render directly.
// Local dev uses Vite's built-in proxy (vite.config.js) which also maps /api → localhost:8000.
const API_BASE_URL = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.detail) {
        errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch (e) {
      // ignore JSON parse errors
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function fetchHealthStatus(timeoutMs = 90000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
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
  const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
  return handleResponse(res);
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE_URL}/documents`);
  return handleResponse(res);
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE_URL}/documents/${docId}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function clearAllDocuments() {
  const res = await fetch(`${API_BASE_URL}/clear`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function sendQuery(question, topK = 4) {
  const res = await fetch(`${API_BASE_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK }),
  });
  return handleResponse(res);
}
