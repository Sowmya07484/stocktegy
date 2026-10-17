from functools import lru_cache

from laya import Router, decide


SENTIMENT_QUESTIONS = {
    "sentiment": {
        "type": "choice",
        "question": "What is the sentiment of this financial news headline?",
        "instructions": (
            "Read the financial news headline. Choose positive for favorable "
            "business or market developments, negative for unfavorable "
            "developments, and neutral when there is no clear directional sentiment."
        ),
        "criteria": {
            "positive": (
                "The headline indicates favorable business results, growth, "
                "or market developments."
            ),
            "neutral": (
                "The headline is factual or has no clear positive or negative direction."
            ),
            "negative": (
                "The headline indicates unfavorable business results, losses, "
                "risks, or market developments."
            ),
        },
    }
}


@lru_cache(maxsize=1)
def get_laya_router():
    return Router(default="english", max_loaded=1)


def analyze_headline(headline: str) -> dict:
    headline = headline.strip()

    if not headline:
        raise ValueError("Headline cannot be empty.")

    router = get_laya_router()

    result = decide(
        router,
        {"headline": headline},
        questions=SENTIMENT_QUESTIONS,
        return_details=True,
        lang="en",
    )

    answers = result.answers
    sentiment_data = answers.get("sentiment", {})

    if isinstance(sentiment_data, dict):
        sentiment = sentiment_data.get("choice")
        probabilities = sentiment_data.get("probabilities", {})
    else:
        sentiment = sentiment_data
        probabilities = {}

    if sentiment not in {"positive", "neutral", "negative"}:
        raise RuntimeError(f"Laya returned an unexpected result: {sentiment_data}")

    return {
        "headline": headline,
        "sentiment": sentiment,
        "probabilities": probabilities,
    }


if __name__ == "__main__":
    test_headline = (
        "Company reports record quarterly profits and raises its growth forecast"
    )
    print(analyze_headline(test_headline))
