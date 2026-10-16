"""Optional local semantic service used by the Node ATS analyzer.

It keeps the original /analyze contract and adds semantic_matches for candidate
skills.  The transformer is loaded once, so requests do not reload the model.
"""
import re
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()
model = SentenceTransformer("all-MiniLM-L6-v2")


class ResumeRequest(BaseModel):
    resume_text: str
    job_description: str
    candidate_skills: List[str] = Field(default_factory=list)


def normalize(text: str) -> str:
    """Keep meaningful technical characters while normalising punctuation."""
    return re.sub(r"\s+", " ", text.lower().replace("-", " ")).strip()


def text_windows(text: str) -> List[str]:
    """Short evidence windows give a skill embedding useful surrounding context."""
    chunks = [chunk.strip() for chunk in re.split(r"[\n.!?;]+", text) if chunk.strip()]
    return chunks[:80] or [text[:800]]


def verified_semantic_skills(text: str, candidates: List[str]) -> List[str]:
    if not candidates or not text.strip():
        return []
    windows = text_windows(text)
    embeddings = model.encode(candidates + windows)
    candidate_embeddings = embeddings[: len(candidates)]
    window_embeddings = embeddings[len(candidates) :]
    similarities = cosine_similarity(candidate_embeddings, window_embeddings)
    normalized_text = normalize(text)
    verified = []
    for candidate, scores in zip(candidates, similarities):
        # Semantic evidence is only an extra guard for high-confidence fuzzy
        # candidates; a lexical stem must also occur to prevent false positives.
        stem = re.sub(r"[^a-z0-9+#]", "", normalize(candidate))
        compact_text = re.sub(r"[^a-z0-9+#]", "", normalized_text)
        if stem in compact_text and float(scores.max()) >= 0.28:
            verified.append(candidate)
    return verified


@app.post("/analyze")
def analyze(data: ResumeRequest):
    embeddings = model.encode([data.resume_text, data.job_description])
    similarity = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
    # Sentence cosine scores may be negative. Clamp the externally visible ATS
    # contribution to its documented 0-100 range.
    score = round(max(0.0, min(1.0, similarity)) * 100, 2)
    return {
        "score": score,
        "missing_skills": [],
        "suggestions": [],
        "semantic_matches": verified_semantic_skills(data.resume_text, data.candidate_skills),
    }

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "ai_server:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )