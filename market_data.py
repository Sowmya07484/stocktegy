
import pandas as pd
import yfinance as yf


def fetch_stock_data(ticker, start_date, end_date):
    """Download and validate historical OHLCV data."""

    if not ticker or not ticker.strip():
        raise ValueError("Please enter a valid stock ticker.")

    data = yf.download(
        ticker.strip().upper(),
        start=start_date,
        end=end_date,
        auto_adjust=True,
        progress=False,
    )

    if data.empty:
        raise ValueError(
            f"No historical data found for {ticker}. "
            "Check the ticker and date range."
        )

    # yfinance may return MultiIndex columns for some downloads.
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    required = ["Open", "High", "Low", "Close", "Volume"]
    missing = [col for col in required if col not in data.columns]

    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    data = data[required].copy()
    data = data.apply(pd.to_numeric, errors="coerce")
    data = data.dropna(subset=required)
    data = data.sort_index()
    data = data[~data.index.duplicated(keep="last")]

    if len(data) < 2:
        raise ValueError("Not enough valid historical prices to backtest.")

    return data
