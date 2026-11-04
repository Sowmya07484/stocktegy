"""Headline sentiment with Laya (runs locally; the model downloads once on first use)."""

from functools import lru_cache
import os
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

# Loading Laya takes the API from ~150 MB to ~2.2 GB of RAM. On a smaller host (Render's free and
# starter plans have 512 MB) the host kills the process mid-request and the browser gets a bare
# 502 Bad Gateway, so check the memory first and fall back to unscored headlines instead.
LAYA_MIN_MEMORY = 3 * 1024**3


def _memory_limit_bytes() -> int | None:
    """The container's memory limit (Linux cgroups), else the machine's RAM; None if unknown."""
    limits = []
    for path in ("/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"):
        try:
            raw = open(path).read().strip()
        except OSError:
            continue
        if raw.isdigit() and int(raw) < 2**60:  # "max" or a huge number means no limit
            limits.append(int(raw))
    try:
        limits.append(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES"))
    except (ValueError, OSError, AttributeError):
        pass
    return min(limits) if limits else None


def unavailable_reason() -> str | None:
    """Why Laya won't run on this server, or None if it can. LAYA_ENABLED=1/0 overrides the check."""
    flag = os.environ.get("LAYA_ENABLED", "").strip().lower()
    if flag in {"0", "false", "no", "off"}:
        return "Laya sentiment is turned off on this server (LAYA_ENABLED=0)"
    if flag in {"1", "true", "yes", "on"}:
        return None
    limit = _memory_limit_bytes()
    if limit is not None and limit < LAYA_MIN_MEMORY:
        return (
            f"Laya sentiment needs about 2.2 GB of RAM and this server has "
            f"{limit / 1024**3:.1f} GB, so it is turned off here"
        )
    return None


@lru_cache(maxsize=1)
def get_router():
    # imported lazily: laya pulls in torch, which would slow every API reload
    from laya import Router

    return Router(default="english", max_loaded=1)


def warm_up():
    """Load the model in the background at startup so the first news request is fast."""
    if unavailable_reason():
        return  # loading it here would get a small host killed at boot
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
