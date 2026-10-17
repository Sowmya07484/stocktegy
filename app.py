
from datetime import date
from typing import Any
from news_feed import fetch_news
import math

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backtest import STRATEGIES, run_backtest
from market_data import fetch_stock_data


app = FastAPI(
    title="QuantBack API",
    description="Historical stock strategy backtesting and news sentiment API",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://quantback.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BacktestRequest(BaseModel):
    ticker: str = Field(..., min_length=1)
    start_date: date
    end_date: date
    strategy: str
    initial_capital: float = Field(default=100000, gt=0)
    params: dict[str, Any] = Field(default_factory=dict)


class SentimentRequest(BaseModel):
    headline: str = Field(..., min_length=1, max_length=1000)


def safe_float(value):
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


@app.get("/")
def root():
    return {
        "project": "QuantBack API",
        "status": "running",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/strategies")
def get_strategies():
    return {
        "strategies": [
            {
                "id": "ma_crossover",
                "name": "Moving Average Crossover",
                "parameters": {
                    "short_window": 20,
                    "long_window": 50,
                },
            },
            {
                "id": "rsi_mean_reversion",
                "name": "RSI Mean Reversion",
                "parameters": {
                    "rsi_period": 14,
                    "oversold": 30,
                    "recovery": 50,
                },
            },
            {
                "id": "buy_and_hold",
                "name": "Buy and Hold",
                "parameters": {},
            },
        ]
    }


@app.post("/api/backtest")
def backtest_endpoint(request: BacktestRequest):
    ticker = request.ticker.strip().upper()

    if not ticker:
        raise HTTPException(
            status_code=400,
            detail="Ticker cannot be empty.",
        )

    if request.start_date >= request.end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be earlier than end_date.",
        )

    strategy_class = STRATEGIES.get(request.strategy)

    if strategy_class is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown strategy: {request.strategy}",
        )

    params = request.params or {}

    allowed_params = {
        "ma_crossover": {"short_window", "long_window"},
        "rsi_mean_reversion": {"rsi_period", "oversold", "recovery"},
        "buy_and_hold": set(),
    }

    unexpected = set(params) - allowed_params[request.strategy]

    if unexpected:
        raise HTTPException(
            status_code=400,
            detail=f"Unexpected parameters: {', '.join(sorted(unexpected))}",
        )

    try:
        if request.strategy == "ma_crossover":
            short_window = int(params.get("short_window", 20))
            long_window = int(params.get("long_window", 50))

            if short_window < 1 or long_window < 1:
                raise ValueError(
                    "Moving average windows must be positive."
                )

            if short_window >= long_window:
                raise ValueError(
                    "short_window must be smaller than long_window."
                )

            params = {
                "short_window": short_window,
                "long_window": long_window,
            }

        elif request.strategy == "rsi_mean_reversion":
            rsi_period = int(params.get("rsi_period", 14))
            oversold = float(params.get("oversold", 30))
            recovery = float(params.get("recovery", 50))

            if rsi_period < 1:
                raise ValueError("rsi_period must be positive.")

            if not (
                0 <= oversold <= 100
                and 0 <= recovery <= 100
            ):
                raise ValueError(
                    "RSI thresholds must be between 0 and 100."
                )

            if oversold >= recovery:
                raise ValueError(
                    "oversold must be smaller than recovery."
                )

            params = {
                "rsi_period": rsi_period,
                "oversold": oversold,
                "recovery": recovery,
            }

        else:
            params = {}

        data = fetch_stock_data(
            ticker,
            request.start_date.isoformat(),
            request.end_date.isoformat(),
        )

        stats, engine = run_backtest(
            data,
            strategy=strategy_class,
            cash=request.initial_capital,
            params=params,
        )

        equity = stats["_equity_curve"]["Equity"]

        equity_curve = [
            {
                "date": timestamp.isoformat(),
                "equity": safe_float(value),
            }
            for timestamp, value in equity.items()
        ]

        trades_data = []
        trades = stats.get("_trades")

        if trades is not None and not trades.empty:
            for _, trade in trades.iterrows():
                entry_time = trade.get("EntryTime")
                exit_time = trade.get("ExitTime")
                return_pct = safe_float(trade.get("ReturnPct"))

                trades_data.append({
                    "entry_time": (
                        entry_time.isoformat()
                        if hasattr(entry_time, "isoformat")
                        else str(entry_time)
                    ),
                    "exit_time": (
                        exit_time.isoformat()
                        if hasattr(exit_time, "isoformat")
                        else str(exit_time)
                    ),
                    "entry_price": safe_float(
                        trade.get("EntryPrice")
                    ),
                    "exit_price": safe_float(
                        trade.get("ExitPrice")
                    ),
                    "size": int(trade.get("Size", 0)),
                    "pnl": safe_float(trade.get("PnL")),
                    "return_pct": (
                        return_pct * 100
                        if return_pct is not None
                        else None
                    ),
                })

        return {
            "ticker": ticker,
            "strategy": request.strategy,
            "parameters": params,
            "start_date": request.start_date.isoformat(),
            "end_date": request.end_date.isoformat(),
            "initial_capital": request.initial_capital,
            "final_equity": safe_float(
                stats.get("Equity Final [$]")
            ),
            "return_pct": safe_float(
                stats.get("Return [%]")
            ),
            "buy_hold_return_pct": safe_float(
                stats.get("Buy & Hold Return [%]")
            ),
            "sharpe_ratio": safe_float(
                stats.get("Sharpe Ratio")
            ),
            "max_drawdown_pct": safe_float(
                stats.get("Max. Drawdown [%]")
            ),
            "win_rate_pct": safe_float(
                stats.get("Win Rate [%]")
            ),
            "total_trades": int(stats.get("# Trades", 0)),
            "equity_curve": equity_curve,
            "trades": trades_data,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Backtest failed: {str(exc)}",
        ) from exc


@app.post("/api/sentiment/analyze")
def sentiment_endpoint(request: SentimentRequest):
    headline = request.headline.strip()

    if not headline:
        raise HTTPException(
            status_code=400,
            detail="Headline cannot be empty.",
        )

    try:
        response = httpx.post(
            "http://127.0.0.1:8001/analyze",
            json={"headline": headline},
            timeout=180.0,
        )
        response.raise_for_status()
        return response.json()

    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail="Laya sentiment service timed out.",
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Laya service returned an error: {exc.response.text}",
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Cannot connect to Laya. Make sure the Laya service "
                "is running on port 8001."
            ),
        ) from exc
    @app.get("/api/news")
def news_endpoint(
    query: str = "stock market",
    limit: int = 10,
    analyze_sentiment: bool = True,
):
    if not 1 <= limit <= 30:
        raise HTTPException(
            status_code=400,
            detail="limit must be between 1 and 30.",
        )

    result = fetch_news(query=query, limit=limit)

    if analyze_sentiment:
        for article in result["articles"]:
            try:
                response = httpx.post(
                    "http://127.0.0.1:8001/analyze",
                    json={"headline": article["title"]},
                    timeout=180.0,
                )
                response.raise_for_status()
                sentiment_result = response.json()

                article["sentiment"] = sentiment_result.get("sentiment")
                article["probabilities"] = sentiment_result.get(
                    "probabilities"
                )
                article["sentiment_warning"] = sentiment_result.get(
                    "warning"
                )
            except httpx.HTTPError:
                article["sentiment"] = "unavailable"
                article["sentiment_warning"] = (
                    "Sentiment service could not analyze this headline."
                )

    return result
