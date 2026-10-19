"""Company headlines from the GNews search API (https://gnews.io)."""

from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache
import os
import re

import httpx
import yfinance as yf


GNEWS_URL = "https://gnews.io/api/v4/search"
# the free plan only searches the last 30 days (and articles arrive with a 12-hour delay)
FREE_PLAN_DAYS = 30


class NewsError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _api_key() -> str:
    key = os.environ.get("GNEWS_API_KEY", "").strip()
    if not key:
        raise NewsError(
            "GNEWS_API_KEY is not set. Add it to .env in the project root and restart the API.",
            503,
        )
    return key


@lru_cache(maxsize=256)
def company_query(ticker: str) -> str:
    """'INFY.NS' -> '"Infosys"'. Headlines name the company, not the NSE symbol."""
    symbol = ticker.split(".")[0]
    try:
        info = yf.Ticker(ticker).info
        name = info.get("longName") or info.get("shortName") or symbol
    except Exception:
        name = symbol
    name = re.sub(r"\b(limited|ltd\.?|inc\.?|corporation|corp\.?|plc)\b", "", name, flags=re.I)
    name = re.sub(r"\s+", " ", name).strip(" .,&") or symbol
    return f'"{name}"'  # quoted: GNews needs special characters inside quotes


def news_window(start: date, end: date, today: date | None = None) -> tuple[date, date, bool]:
    """Clamp the backtest range to what the free plan can search.

    Returns (from, to, in_range). When the range is entirely older than 30 days, fall back to
    the latest 30 days and report in_range=False so the UI can say so.
    """
    today = today or datetime.now(timezone.utc).date()
    earliest = today - timedelta(days=FREE_PLAN_DAYS - 1)
    lo, hi = max(start, earliest), min(end, today)
    if lo <= hi:
        return lo, hi, True
    return earliest, today, False


@lru_cache(maxsize=128)  # the free plan allows 100 requests a day, so reruns reuse results
def _search(query: str, lo: date, hi: date, limit: int) -> tuple[dict, ...]:
    params = {
        "q": query,
        "lang": "en",
        "max": limit,
        "sortby": "relevance",
        "from": datetime.combine(lo, time.min, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "to": datetime.combine(hi, time.max, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "apikey": _api_key(),
    }
    try:
        response = httpx.get(GNEWS_URL, params=params, timeout=15.0)
    except httpx.HTTPError as exc:
        raise NewsError(f"Could not reach GNews: {exc}") from exc

    if response.status_code != 200:
        messages = {
            400: "GNews rejected the request (check the API key).",
            401: "GNews API key is invalid.",
            403: "GNews daily quota reached (resets at 00:00 UTC).",
            429: "GNews rate limit hit; try again in a second.",
        }
        raise NewsError(messages.get(response.status_code, f"GNews error {response.status_code}"))

    articles = response.json().get("articles", [])
    return tuple(
        {
            "title": a.get("title", "").strip(),
            "summary": (a.get("description") or "").strip() or None,
            "url": a.get("url"),
            "published_at": a.get("publishedAt"),
            "source": (a.get("source") or {}).get("name", "Unknown"),
        }
        for a in articles
        if a.get("title")
    )


def fetch_news(ticker: str, start: date, end: date, limit: int = 10) -> dict:
    query = company_query(ticker)
    lo, hi, in_range = news_window(start, end)
    articles = [dict(a) for a in _search(query, lo, hi, limit)]
    return {
        "query": query,
        "from": lo.isoformat(),
        "to": hi.isoformat(),
        "in_backtest_range": in_range,
        "articles": articles,
    }
