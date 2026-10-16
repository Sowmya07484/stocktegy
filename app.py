
from datetime import date
import math

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from market_data import fetch_stock_data
from backtest import run_backtest, STRATEGIES

app = FastAPI(
    title="Quant Hack Trading Backtester API",
    description="Historical stock data and trading strategy backtesting.",
    version="1.0.0",
)

# Allow the frontend to connect during local development.
# Restrict this to your deployed frontend origin before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MarketDataRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=30)
    start_date: date
    end_date: date


class BacktestRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=30)
    start_date: date
    end_date: date
    strategy: str = "ma_crossover"
    initial_capital: float = Field(default=100000, gt=0)


def validate_dates(start_date: date, end_date: date):
    if start_date >= end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be earlier than end_date.",
        )


def clean_number(value):
    """Convert numeric values into JSON-safe numbers."""
    try:
        number = float(value)
        if math.isfinite(number):
            return number
    except (TypeError, ValueError):
        pass
    return None


@app.get("/")
def root():
    return {
        "project": "Quant Hack Trading Backtester",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "quant-hack-backend",
    }


@app.post("/api/market-data")
def market_data(request: MarketDataRequest):
    validate_dates(request.start_date, request.end_date)

    try:
        data = fetch_stock_data(
            request.ticker,
            request.start_date.isoformat(),
            request.end_date.isoformat(),
        )

        records = []
        for timestamp, row in data.iterrows():
            records.append({
                "date": timestamp.isoformat(),
                "open": clean_number(row["Open"]),
                "high": clean_number(row["High"]),
                "low": clean_number(row["Low"]),
                "close": clean_number(row["Close"]),
                "volume": clean_number(row["Volume"]),
            })

        return {
            "ticker": request.ticker.strip().upper(),
            "count": len(records),
            "data": records,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch market data: {str(exc)}",
        )


@app.post("/api/backtest")
def backtest(request: BacktestRequest):
    validate_dates(request.start_date, request.end_date)

    
    strategy_class = STRATEGIES.get(request.strategy)

    if strategy_class is None:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Unsupported strategy.",
                "available_strategies": list(STRATEGIES.keys()),
            },
        )


    try:
        data = fetch_stock_data(
            request.ticker,
            request.start_date.isoformat(),
            request.end_date.isoformat(),
        )

        
        stats, engine = run_backtest(
            data,
            strategy=strategy_class,
            cash=request.initial_capital,
        )


        equity_curve = stats["_equity_curve"]
        trades = stats["_trades"]

        equity_data = []
        for timestamp, row in equity_curve.iterrows():
            equity_data.append({
                "date": timestamp.isoformat(),
                "equity": clean_number(row["Equity"]),
            })

        trade_data = []
        for _, trade in trades.iterrows():
            trade_data.append({
                "entry_date": pd.Timestamp(
                    trade["EntryTime"]
                ).isoformat(),
                "exit_date": (
                    pd.Timestamp(trade["ExitTime"]).isoformat()
                    if pd.notna(trade["ExitTime"])
                    else None
                ),
                "entry_price": clean_number(trade["EntryPrice"]),
                "exit_price": clean_number(trade["ExitPrice"]),
                "size": int(trade["Size"]),
                "profit_loss": clean_number(trade["PnL"]),
                "return_percent": clean_number(trade["ReturnPct"] * 100),
            })

        return {
            "ticker": request.ticker.strip().upper(),
            "strategy": request.strategy,
            "start_date": request.start_date.isoformat(),
            "end_date": request.end_date.isoformat(),
            "initial_capital": request.initial_capital,
            "final_equity": clean_number(stats["Equity Final [$]"]),
            "net_profit": clean_number(stats["Equity Final [$]"] - request.initial_capital),
            "return_percent": clean_number(stats["Return [%]"]),
            "buy_hold_return_percent": clean_number(stats["Buy & Hold Return [%]"]),
            "max_drawdown_percent": clean_number(stats["Max. Drawdown [%]"]),
            "win_rate_percent": clean_number(stats["Win Rate [%]"]),
            "number_of_trades": int(stats["# Trades"]),
            "equity_curve": equity_data,
            "trades": trade_data,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Backtest failed: {str(exc)}",
        )
