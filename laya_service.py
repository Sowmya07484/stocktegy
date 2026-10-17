from functools import lru_cache

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from laya import Router, decide

app = FastAPI(title="QuantBack Laya Sentiment Service")


SENTIMENT_QUESTIONS = {
    "sentiment": {
        "type": "choice",
        "question": "What is the sentiment of this financial news headline?",
        "instructions": (
            "Choose positive for favorable business or market developments, "
            "negative for unfavorable developments, and neutral when there "
            "is no clear directional sentiment."
        ),
        "criteria": {
            "positive": (
                "Favorable business results, growth, or market developments."
            ),
            "neutral": (
                "Factual news without a clear positive or negative direction."
            ),
            "negative": (
                "Unfavorable business results, losses, risks, or market developments."
            ),
        },
    }
}


class SentimentRequest(BaseModel):
    headline: str = Field(..., min_length=1, max_length=1000)


@lru_cache(maxsize=1)
def get_router():
    return Router(default="english", max_loaded=1)


@app.get("/")
def root():
    return {"service": "Laya sentiment", "status": "running"}


@app.post("/analyze")
def analyze(request: SentimentRequest):
    headline = request.headline.strip()

    if not headline:
        raise HTTPException(status_code=400, detail="Headline cannot be empty.")

    try:
        result = decide(
            get_router(),
            {"headline": headline},
            questions=SENTIMENT_QUESTIONS,
            lang="en",
        )

        sentiment_data = result.get("sentiment", {})

        if isinstance(sentiment_data, dict):
            sentiment = sentiment_data.get("choice")
            probabilities = sentiment_data.get("probabilities", {})
        else:
            sentiment = sentiment_data
            probabilities = {}

        if sentiment not in {"positive", "neutral", "negative"}:
            raise RuntimeError(f"Unexpected Laya result: {sentiment_data}")

        return {
            "headline": headline,
            "sentiment": sentiment,
            "probabilities": probabilities,
            "warning": (
                "Model-reported probabilities are uncalibrated and "
                "should not be treated as verified confidence."
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Laya analysis failed: {str(exc)}",
        ) from exc
