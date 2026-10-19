"""Headline sentiment with Laya (runs locally; the model downloads once on first use)."""

from functools import lru_cache
import threading


SENTIMENT_QUESTIONS = {
    "sentiment": {
        "type": "choice",
        "question": "What is the sentiment of this financial news headline for the company's stock?",
        "instructions": (
            "Read the headline. Choose positive for favorable results, growth or market "
            "developments for the company, negative for losses, penalties, risks or falling "
            "prices, and neutral when there is no clear direction."
        ),
        "criteria": {
            "positive": "Favorable business results, growth, or market developments.",
            "neutral": "Factual news without a clear positive or negative direction.",
            "negative": "Unfavorable business results, losses, risks, or market developments.",
        },
    }
}

_lock = threading.Lock()


@lru_cache(maxsize=1)
def get_router():
    # imported lazily: laya pulls in torch, which would slow every API reload
    from laya import Router

    return Router(default="english", max_loaded=1)


def warm_up():
    """Load the model in the background at startup so the first news request is fast."""
    try:
        score_headlines(["Company reports quarterly results"])
    except Exception:
        pass  # the /api/news call will report the real error


def score_headlines(headlines: list[str]) -> list[dict]:
    """Return {label, score, probabilities} per headline; score is P(positive) - P(negative)."""
    if not headlines:
        return []

    from laya import decide_batch

    with _lock:  # one model, one batch at a time
        results = decide_batch(
            get_router(),
            [{"headline": h} for h in headlines],
            questions=SENTIMENT_QUESTIONS,
            return_details=True,
            lang="en",
        )

    scored = []
    for result in results:
        probs = result.probabilities.get("sentiment", {})
        answer = result.values.get("sentiment", {})
        label = answer.get("choice") if isinstance(answer, dict) else answer
        if label not in {"positive", "neutral", "negative"}:
            label = "neutral"
        scored.append({
            "label": label,
            "score": round(probs.get("positive", 0.0) - probs.get("negative", 0.0), 4),
            "probabilities": probs,
        })
    return scored
