
from datetime import datetime, timezone
import xml.etree.ElementTree as ET

import httpx
from fastapi import HTTPException


YAHOO_RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline"


def fetch_news(query: str = "stock market", limit: int = 10):
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query is required.")

    params = {
        "s": query,
        "region": "US",
        "lang": "en-US",
    }

    try:
        response = httpx.get(
            YAHOO_RSS_URL,
            params=params,
            timeout=20.0,
            headers={"User-Agent": "QuantBack/1.0"},
        )
        response.raise_for_status()
        root = ET.fromstring(response.content)

    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch news: {exc}",
        ) from exc
    except ET.ParseError as exc:
        raise HTTPException(
            status_code=502,
            detail="The news provider returned an invalid RSS feed.",
        ) from exc

    items = []

    for item in root.findall(".//item")[:limit]:
        title = item.findtext("title", default="").strip()
        link = item.findtext("link", default="").strip()
        description = item.findtext("description", default="").strip()
        pub_date = item.findtext("pubDate", default="").strip()

        if not title or not link:
            continue

        items.append({
            "title": title,
            "url": link,
            "description": description,
            "published_at": pub_date or None,
            "source": "Yahoo Finance RSS",
            "sentiment": None,
            "probabilities": None,
        })

    return {
        "query": query,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "count": len(items),
        "articles": items,
    }
