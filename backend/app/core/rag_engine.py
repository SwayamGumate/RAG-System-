import time
import httpx
from typing import List, Dict, Any, Tuple
from app.config import settings
from app.core.embeddings import embedding_manager
from app.core.vector_store import vector_store

class RAGEngine:
    """RAG pipeline engine managing vector lookup, thresholding, and Groq/LLM context synthesis."""

    @staticmethod
    def _format_context(chunks: List[Dict[str, Any]]) -> str:
        """Format retrieved chunks into clean numbered context blocks."""
        formatted_blocks = []
        for i, chunk in enumerate(chunks, 1):
            source_info = f"[Source {i}: {chunk.get('filename')} (Chunk #{chunk.get('chunk_index')}) - Match: {chunk.get('similarity_score', 0)*100:.1f}%]"
            formatted_blocks.append(f"{source_info}\n{chunk.get('text', '').strip()}")
        return "\n\n".join(formatted_blocks)

    @staticmethod
    async def _query_groq(prompt: str, system_prompt: str) -> Tuple[str, str]:
        """
        Query Groq LPU API using OpenAI-compatible endpoint.
        Iterates over primary and fallback models (Llama 3.3, OSS 120B, Llama 3.1) for maximum uptime.
        Returns (answer_text, model_name_used).
        """
        if not settings.GROQ_API_KEY:
            raise Exception("GROQ_API_KEY environment variable is not configured.")
            
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}",
            "Content-Type": "application/json"
        }
        
        candidate_models = [settings.GROQ_MODEL] + [m for m in settings.GROQ_FALLBACK_MODELS if m != settings.GROQ_MODEL]
        last_exception = None

        async with httpx.AsyncClient(timeout=15.0) as client:
            for model_name in candidate_models:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2
                }
                try:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"].strip()
                        if content:
                            return content, model_name
                    else:
                        last_exception = Exception(f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    last_exception = e
                    continue

        raise Exception(f"Groq API call failed across all candidate models: {str(last_exception)}")

    @staticmethod
    async def _query_ollama(prompt: str, system_prompt: str) -> str:
        """Query local Ollama instance via HTTP async client."""
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {"temperature": 0.2}
        }
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "").strip()
            else:
                raise Exception(f"Ollama returned HTTP {response.status_code}: {response.text}")

    @staticmethod
    async def _query_openai(prompt: str, system_prompt: str) -> str:
        """Query OpenAI API using httpx async client."""
        if not settings.OPENAI_API_KEY:
            raise Exception("OPENAI_API_KEY environment variable is not set.")
            
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                raise Exception(f"OpenAI API returned HTTP {response.status_code}: {response.text}")

    @classmethod
    def _extractive_synthesis(cls, question: str, chunks: List[Dict[str, Any]]) -> str:
        """
        Extractive synthesis fallback when external LLM services are unconfigured/offline.
        Extracts key relevant context sentences from top scoring FAISS chunks.
        """
        if not chunks:
            return "Information not found in the document."
            
        top_chunk = chunks[0]
        sentences = [s.strip() for s in top_chunk.get("text", "").split(". ") if len(s.strip()) > 15]
        
        if not sentences:
            return top_chunk.get("text", "")[:300] + "..."
            
        synthesis = f"Based on document '{top_chunk.get('filename')}':\n\n"
        for s in sentences[:4]:
            if not s.endswith("."):
                s += "."
            synthesis += f"• {s}\n"
            
        if len(chunks) > 1:
            second_chunk = chunks[1]
            extra_sentences = [s.strip() for s in second_chunk.get("text", "").split(". ") if len(s.strip()) > 15]
            if extra_sentences:
                synthesis += f"\nAdditional details from '{second_chunk.get('filename')}':\n"
                synthesis += f"• {extra_sentences[0]}" + ("." if not extra_sentences[0].endswith(".") else "")
                
        return synthesis.strip()

    async def answer_question(self, question: str, top_k: int = settings.TOP_K) -> Dict[str, Any]:
        """
        Process query end-to-end:
        1. Embed question with sentence-transformers.
        2. Perform vector search in FAISS.
        3. Threshold check to handle 'not found' queries.
        4. Synthesize answer with Groq LPU, OpenAI, Ollama, or Extractive Fallback.
        """
        start_time = time.time()
        clean_query = question.strip()
        
        if not clean_query:
            return {
                "answer": "Please provide a valid question.",
                "citations": [],
                "found_match": False,
                "execution_time_ms": 0.0,
                "llm_provider": settings.LLM_PROVIDER
            }

        # Step 1: Embed question
        query_vector = embedding_manager.encode(clean_query)

        # Step 2: Retrieve candidate chunks from FAISS
        retrieved_chunks = vector_store.search(query_vector, top_k=top_k)

        # Step 3: No-match fallback check
        top_score = retrieved_chunks[0]["similarity_score"] if retrieved_chunks else 0.0
        
        if not retrieved_chunks or top_score < settings.SIMILARITY_THRESHOLD:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "answer": "The requested information was not found in the uploaded document(s).",
                "citations": retrieved_chunks,
                "found_match": False,
                "top_similarity_score": top_score,
                "execution_time_ms": elapsed_ms,
                "llm_provider": "threshold_fallback"
            }

        # Step 4: Context preparation
        context_str = self._format_context(retrieved_chunks)
        system_prompt = (
            "You are an expert Q&A AI assistant. Answer the user's question accurately using ONLY "
            "the provided document context below. If the context does not contain sufficient facts to answer, "
            "respond exactly with 'The information requested is not found in the document.' "
            "Do not make up facts or use external knowledge."
        )
        prompt = f"Document Context:\n{context_str}\n\nUser Question: {clean_query}\n\nDetailed Answer:"

        answer = ""
        active_provider = settings.LLM_PROVIDER.lower()
        provider_used = active_provider

        if active_provider == "groq":
            try:
                answer, model_used = await self._query_groq(prompt, system_prompt)
                provider_used = f"Groq ({model_used})"
            except Exception as e:
                answer = self._extractive_synthesis(clean_query, retrieved_chunks)
                provider_used = f"extractive_fallback ({str(e)})"
        elif active_provider == "ollama":
            try:
                answer = await self._query_ollama(prompt, system_prompt)
                provider_used = f"Ollama ({settings.OLLAMA_MODEL})"
            except Exception as e:
                answer = self._extractive_synthesis(clean_query, retrieved_chunks)
                provider_used = "extractive_fallback (Ollama offline)"
        elif active_provider == "openai":
            try:
                answer = await self._query_openai(prompt, system_prompt)
                provider_used = f"OpenAI ({settings.OPENAI_MODEL})"
            except Exception as e:
                answer = self._extractive_synthesis(clean_query, retrieved_chunks)
                provider_used = "extractive_fallback (OpenAI error)"
        elif active_provider == "fallback":
            answer = self._extractive_synthesis(clean_query, retrieved_chunks)
            provider_used = "extractive_synthesizer"
        else:
            # Auto mode: try Groq -> Ollama -> OpenAI -> Extractive Fallback
            if settings.GROQ_API_KEY:
                try:
                    answer, model_used = await self._query_groq(prompt, system_prompt)
                    provider_used = f"Groq ({model_used})"
                except Exception:
                    answer = self._extractive_synthesis(clean_query, retrieved_chunks)
                    provider_used = "extractive_synthesizer"
            else:
                try:
                    answer = await self._query_ollama(prompt, system_prompt)
                    provider_used = "ollama"
                except Exception:
                    if settings.OPENAI_API_KEY:
                        try:
                            answer = await self._query_openai(prompt, system_prompt)
                            provider_used = "openai"
                        except Exception:
                            answer = self._extractive_synthesis(clean_query, retrieved_chunks)
                            provider_used = "extractive_synthesizer"
                    else:
                        answer = self._extractive_synthesis(clean_query, retrieved_chunks)
                        provider_used = "extractive_synthesizer"

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "answer": answer,
            "citations": retrieved_chunks,
            "found_match": True,
            "top_similarity_score": top_score,
            "execution_time_ms": elapsed_ms,
            "llm_provider": provider_used
        }

rag_engine = RAGEngine()
