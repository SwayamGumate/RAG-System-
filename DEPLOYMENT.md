# Synthetix RAG | $0 Free Deployment Guide

> Step-by-step instructions to deploy this RAG Document Q&A application to **100% free cloud hosting** (**Render** + **Vercel** + **Groq LPU**) with **$0 cost**, **no credit card required**, and **zero API billing ever**.

---

## 🏗️ Free Cloud Architecture

```
+------------------------------------+           +------------------------------------+
|       FRONTEND (Vercel Free)       |   HTTP    |       BACKEND (Render Free)        |
|  - Free Static Hosting (No Sleep)  | --------> |  - Free Docker Web Service         |
|  - VITE_API_URL Env Variable       |   CORS    |  - Groq API Key (Env Only)         |
|  - Cold-Start Wake-Up Indicator    |           |  - Local CPU Sentence-Transformers |
|    ("Waking up server ~30s...")    |           |  - Pre-indexed Demo Doc (Instant)  |
+------------------------------------+           +------------------------------------+
                                                                   |
                                                                   v
                                                   +--------------------------------+
                                                   |       Groq LPU Cloud API       |
                                                   |  - 100% Free Tier (No Card)    |
                                                   |  - High-Speed Llama 3.3 / OSS  |
                                                   +--------------------------------+
```

---

## 🔑 Step 1: Get a Free Groq API Key (0 Cost)

1. Go to [console.groq.com](https://console.groq.com) and sign up for a free account (no credit card needed).
2. Navigate to **API Keys** in the dashboard menu.
3. Click **Create API Key**, name it `synthetix-rag-prod`, and copy the generated key (`gsk_...`).

---

## 📦 Step 2: Deploy Backend to Render (Free Web Service)

1. Push your repository to GitHub.
2. Log in to [dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub repo.
4. Configure the Web Service settings:
   - **Name**: `synthetix-rag-backend`
   - **Region**: Choose closest region (e.g. Oregon, Frankfurt, Singapore).
   - **Branch**: `main` (or `master`)
   - **Root Directory**: `backend`
   - **Runtime**: **Docker**
   - **Instance Type**: **Free** ($0 / month)
5. Scroll down to **Environment Variables** and add:
   | Key | Value | Notes |
   | --- | --- | --- |
   | `GROQ_API_KEY` | `gsk_...` | Your free key from Step 1 |
   | `LLM_PROVIDER` | `groq` | Forces high-speed Groq LPU engine |
   | `GROQ_MODEL` | `openai/gpt-oss-120b` | High-capacity model (or `llama-3.3-70b-versatile`) |
   | `AUTO_INDEX_DEMO_DOC` | `True` | Guarantees app is immediately demoable on cold boot |
   | `ALLOWED_ORIGINS_RAW` | `*` | (Will update in Step 4 with live Vercel domain) |
6. Click **Create Web Service**.
   - Render will build the Docker container (pre-caching sentence-transformers) and deploy.
   - Once live, copy your Render backend URL (e.g., `https://synthetix-rag-backend.onrender.com`).

---

## 🚀 Step 3: Deploy Frontend to Vercel (Free Web Service)

1. Log in to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure the Project settings:
   - **Framework Preset**: **Vite**
   - **Root Directory**: `frontend`
4. Expand **Environment Variables** and add:
   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://synthetix-rag-backend.onrender.com` *(Your Render URL from Step 2)* |
5. Click **Deploy**.
   - Vercel will build and deploy the React app in ~30 seconds.
   - Copy your live frontend domain (e.g. `https://synthetix-rag.vercel.app`).

---

## 🔒 Step 4: Lock Down Backend CORS to Live Vercel Domain

1. Return to your Render Dashboard -> `synthetix-rag-backend` -> **Environment**.
2. Edit `ALLOWED_ORIGINS_RAW` to restrict CORS exclusively to your Vercel URL and local testing:
   ```env
   ALLOWED_ORIGINS_RAW=https://synthetix-rag.vercel.app,http://localhost:5173
   ```
3. Click **Save Changes**. Render will automatically redeploy with the updated CORS policy.

---

## ❄️ Understanding Render's Free-Tier Cold-Start Behavior

> [!NOTE]
> **Why the Cold-Start Banner Exists**:
> Render's **Free Tier** web services automatically spin down to sleep after 15 minutes of inactivity to preserve compute resources.
> When a new request arrives after a period of inactivity, Render wakes up the Docker container, taking approximately **30 to 45 seconds** to cold boot.
>
> **How Synthetix Handles Cold Starts Gracefully**:
> 1. **Frontend Health Detector**: The React app pings `/api/health` on initial load. If the backend is sleeping, a prominent amber top banner appears: *"Waking up Render backend web service (~30s cold start for free tier)... Please wait."*
> 2. **Instant Demo Availability**: Upon cold boot, the backend automatically ingests a built-in demo document (`backend/data/demo_document.txt`) if the index is empty, so the app is **immediately ready to answer questions** without forcing manual document uploads.
