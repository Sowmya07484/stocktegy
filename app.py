
from datetime import date, timedelta
from typing import Any
import math

import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backtest import STRATEGIES, run_backtest
from market_data import fetch_stock_data


app = FastAPI(
    title="QuantBack API",
    description="Historical stock strategy backtesting API",
    version="1.0.0",
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


def warmup_calendar_days(strategy: str, params: dict) -> int:
    """Calendar days of extra history so indicators are valid on the first requested day."""
    if strategy == "ma_crossover":
        bars = params["long_window"]
    elif strategy == "rsi_mean_reversion":
        bars = params["rsi_period"] * 4  # Wilder's EWM needs a few periods to settle
    else:
        bars = 1  # backtesting.py never trades on the very first bar it sees
    # ~250 trading days per 365 calendar days, plus slack for holidays
    return int(bars * 1.5) + 10


def safe_float(value):
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


@app.get("/")
def root():
    return {"project": "QuantBack API", "status": "running"}


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


class MarketDataRequest(BaseModel):
    ticker: str = Field(..., min_length=1)
    start_date: date
    end_date: date


@app.post("/api/market-data")
def market_data(request: MarketDataRequest):
    """Daily OHLCV for the price chart and the buy & hold line on the equity chart."""
    ticker = request.ticker.strip().upper()

    if request.start_date >= request.end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be earlier than end_date.",
        )

    try:
        data = fetch_stock_data(
            ticker,
            request.start_date.isoformat(),
            request.end_date.isoformat(),
        )

        records = [
            {
                "date": timestamp.isoformat(),
                "open": safe_float(row["Open"]),
                "high": safe_float(row["High"]),
                "low": safe_float(row["Low"]),
                "close": safe_float(row["Close"]),
                "volume": safe_float(row["Volume"]),
            }
            for timestamp, row in data.iterrows()
        ]

        return {"ticker": ticker, "count": len(records), "data": records}

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Market data failed: {str(exc)}",
        ) from exc


@app.post("/api/backtest")
def backtest_endpoint(request: BacktestRequest):
    ticker = request.ticker.strip().upper()

    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker cannot be empty.")

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
                raise ValueError("Moving average windows must be positive.")

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

            if not (0 <= oversold <= 100 and 0 <= recovery <= 100):
                raise ValueError("RSI thresholds must be between 0 and 100.")

            if oversold >= recovery:
                raise ValueError("oversold must be smaller than recovery.")

            params = {
                "rsi_period": rsi_period,
                "oversold": oversold,
                "recovery": recovery,
            }

        else:
            params = {}

        # Fetch extra history before start_date so indicators are warmed up on day one;
        # the strategies only trade from start_date (see GatedStrategy in backtest.py).
        fetch_start = request.start_date - timedelta(
            days=warmup_calendar_days(request.strategy, params)
        )
        data = fetch_stock_data(
            ticker,
            fetch_start.isoformat(),
            request.end_date.isoformat(),
        )

        start_ts = pd.Timestamp(request.start_date)
        in_range = data[data.index >= start_ts]
        if len(in_range) < 2:
            raise ValueError("Not enough trading days in the selected date range.")

        stats, engine = run_backtest(
            data,
            strategy=strategy_class,
            cash=request.initial_capital,
            params=params,
            trade_from=start_ts,
        )

        # Buy & hold over exactly the requested range. backtesting.py's own figure starts
        # after indicator warm-up, which overstated it (e.g. BSE.NS 2025: +103.9% vs +43.2%).
        closes = in_range["Close"]
        buy_hold_return_pct = (closes.iloc[-1] / closes.iloc[0] - 1) * 100

        # Report the curve for the requested dates only (warm-up bars are flat at cash).
        equity = stats["_equity_curve"]["Equity"]
        equity = equity[equity.index >= start_ts]

        # Sharpe on the requested range; stats["Sharpe Ratio"] would include the flat warm-up.
        daily = equity.pct_change().dropna()
        sharpe_ratio = (
            daily.mean() / daily.std() * math.sqrt(252) if daily.std() > 0 else None
        )

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
                    "entry_price": safe_float(trade.get("EntryPrice")),
                    "exit_price": safe_float(trade.get("ExitPrice")),
                    "size": int(trade.get("Size", 0)),
                    "pnl": safe_float(trade.get("PnL")),
                    "return_pct": (
                        safe_float(trade.get("ReturnPct")) * 100
                        if safe_float(trade.get("ReturnPct")) is not None
                        else None
                    ),
                    # still open on the end date, so closed at the last close rather than by a signal
                    "closed_at_end": bool(trade.get("ClosedAtEnd", False)),
                })

        return {
            "ticker": ticker,
            "strategy": request.strategy,
            "parameters": params,
            "start_date": request.start_date.isoformat(),
            "end_date": request.end_date.isoformat(),
            "initial_capital": request.initial_capital,
            "final_equity": safe_float(stats.get("Equity Final [$]")),
            "return_pct": safe_float(stats.get("Return [%]")),
            "buy_hold_return_pct": safe_float(buy_hold_return_pct),
            "sharpe_ratio": safe_float(sharpe_ratio),
            "max_drawdown_pct": safe_float(
                stats.get("Max. Drawdown [%]")
            ),
            "win_rate_pct": safe_float(stats.get("Win Rate [%]")),
            "total_trades": int(stats.get("# Trades", 0)),
            "equity_curve": equity_curve,
            "trades": trades_data,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Backtest failed: {str(exc)}",
        ) from exc
