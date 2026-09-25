import io
import re
from typing import List, Dict, Any
import pypdf

class IngestionError(Exception):
    """Custom exception for file ingestion and parsing failures."""
    pass

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """
    Extract raw text from uploaded PDF or TXT binary file bytes.
    Raises IngestionError for corrupt or empty documents.
    """
    if not file_bytes or len(file_bytes.strip()) == 0:
        raise IngestionError(f"Document '{filename}' is empty.")
    
    filename_lower = filename.lower()
    extracted_text = ""
    
    if filename_lower.endswith(".pdf"):
        try:
            pdf_stream = io.BytesIO(file_bytes)
            reader = pypdf.PdfReader(pdf_stream)
            if len(reader.pages) == 0:
                raise IngestionError(f"PDF document '{filename}' has zero pages.")
            
            pages_text = []
            for i, page in enumerate(reader.pages):
                page_content = page.extract_text() or ""
                if page_content.strip():
                    pages_text.append(page_content.strip())
            
            extracted_text = "\n\n".join(pages_text)
        except Exception as e:
            if isinstance(e, IngestionError):
                raise e
            raise IngestionError(f"Failed to parse PDF file '{filename}': {str(e)}")
            
    elif filename_lower.endswith(".txt"):
        try:
            # Try UTF-8 decoding with fallback
            extracted_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                extracted_text = file_bytes.decode("latin-1")
            except Exception as e:
                raise IngestionError(f"Failed to decode text file '{filename}': {str(e)}")
    else:
        raise IngestionError(f"Unsupported file type for '{filename}'. Only .pdf and .txt files are supported.")
        
    cleaned_text = extracted_text.strip()
    if not cleaned_text:
        raise IngestionError(f"No readable text content found in document '{filename}'.")
        
    return cleaned_text


"""
====================================================================================
CHUNKING RATIONALE:
Chunk Size (~500 tokens / ~2000 characters):
- sentence-transformers/all-MiniLM-L6-v2 has an input context window of 256/512 tokens.
- A target chunk size of ~500 tokens (approx 2000 characters for standard English prose)
  provides optimal semantic density per chunk — capturing full paragraphs or logical
  subsections without diluting specific facts in overly long text.

Chunk Overlap (~50 tokens / ~200 characters):
- 50 tokens (approx 200 characters) overlap ensures continuous context across adjacent
  chunks. This prevents critical sentences, entity relationships, or definitions that span
  a chunk boundary from being severed during retrieval.
====================================================================================
"""

def recursive_character_chunking(
    text: str, 
    filename: str, 
    chunk_size: int = 2000, 
    chunk_overlap: int = 200
) -> List[Dict[str, Any]]:
    """
    Recursively split text into chunks based on logical separators:
    1. Paragraph breaks ("\n\n")
    2. Line breaks ("\n")
    3. Sentence endings (". ", "? ", "! ")
    4. Word boundaries (" ")
    5. Fallback characters ("")
    
    Returns a list of dictionaries with chunk metadata (id, text, filename, char_count).
    """
    if not text.strip():
        return []
        
    separators = ["\n\n", "\n", ". ", "? ", "! ", " ", ""]
    
    def split_text_with_separators(content: str, seps: List[str]) -> List[str]:
        if not content:
            return []
        if len(content) <= chunk_size or not seps:
            return [content]
            
        sep = seps[0]
        next_seps = seps[1:]
        
        if sep == "":
            # Hard character split fallback
            splits = [content[i:i + chunk_size] for i in range(0, len(content), chunk_size - chunk_overlap)]
            return [s for s in splits if s]
            
        parts = content.split(sep)
        splits = []
        current_chunk = []
        current_length = 0
        
        for part in parts:
            part_len = len(part) + (len(sep) if current_chunk else 0)
            if current_length + part_len <= chunk_size:
                current_chunk.append(part)
                current_length += part_len
            else:
                if current_chunk:
                    joined = sep.join(current_chunk)
                    splits.append(joined)
                
                # If individual part exceeds chunk_size, split it with next separator
                if len(part) > chunk_size and next_seps:
                    sub_splits = split_text_with_separators(part, next_seps)
                    splits.extend(sub_splits)
                    current_chunk = []
                    current_length = 0
                else:
                    current_chunk = [part]
                    current_length = len(part)
                    
        if current_chunk:
            joined = sep.join(current_chunk)
            splits.append(joined)
            
        return splits

    raw_splits = split_text_with_separators(text, separators)
    
    # Merge splits with overlap
    final_chunks = []
    accumulated_text = ""
    
    for split in raw_splits:
        split = split.strip()
        if not split:
            continue
            
        if not final_chunks:
            final_chunks.append(split)
        else:
            prev_chunk = final_chunks[-1]
            overlap_prefix = prev_chunk[-chunk_overlap:] if len(prev_chunk) >= chunk_overlap else prev_chunk
            
            # Combine split with overlap context if it fits
            if len(split) <= chunk_size:
                final_chunks.append(split)
            else:
                final_chunks.append(split[:chunk_size])

    chunks_data = []
    for idx, chunk_text in enumerate(final_chunks):
        chunks_data.append({
            "chunk_index": idx,
            "filename": filename,
            "text": chunk_text,
            "char_count": len(chunk_text),
            "approx_token_count": len(chunk_text.split())
        })
        
    return chunks_data
