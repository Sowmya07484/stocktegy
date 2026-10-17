
import pandas as pd
from backtesting import Backtest, Strategy
from backtesting.lib import crossover


class GatedStrategy(Strategy):
    """Computes indicators on warm-up bars but only trades from `trade_from` onwards.

    The API fetches extra history before the requested start date so indicators such as a
    50-day SMA are already valid on day one; this gate stops trades inside that warm-up window.
    """

    trade_from = None  # pd.Timestamp; None trades from the first bar
    trade_until = None  # pd.Timestamp; no new signals on or after this bar

    def can_trade(self):
        now = self.data.index[-1]
        if self.trade_from is not None and now < self.trade_from:
            return False
        return self.trade_until is None or now < self.trade_until


class MovingAverageCrossover(GatedStrategy):
    short_window = 20
    long_window = 50

    def init(self):
        close = self.data.Close
        self.short_ma = self.I(
            lambda x: pd.Series(x).rolling(self.short_window).mean(),
            close,
        )
        self.long_ma = self.I(
            lambda x: pd.Series(x).rolling(self.long_window).mean(),
            close,
        )

    def next(self):
        if not self.can_trade():
            return
        # enter only on an actual cross, not because the short SMA already sits above the long one
        if crossover(self.short_ma, self.long_ma):
            if not self.position:
                self.buy()
        elif crossover(self.long_ma, self.short_ma):
            if self.position:
                self.position.close()


class RSIMeanReversion(GatedStrategy):
    rsi_period = 14
    oversold = 30
    recovery = 50

    def init(self):
        close = pd.Series(self.data.Close)

        def calculate_rsi(prices):
            delta = pd.Series(prices).diff()
            gains = delta.clip(lower=0)
            losses = -delta.clip(upper=0)

            avg_gain = gains.ewm(
                alpha=1 / self.rsi_period,
                min_periods=self.rsi_period,
                adjust=False,
            ).mean()
            avg_loss = losses.ewm(
                alpha=1 / self.rsi_period,
                min_periods=self.rsi_period,
                adjust=False,
            ).mean()

            rs = avg_gain / avg_loss.replace(0, float("nan"))
            rsi = 100 - (100 / (1 + rs))
            rsi = rsi.mask((avg_loss == 0) & (avg_gain > 0), 100)
            rsi = rsi.mask((avg_loss == 0) & (avg_gain == 0), 50)
            return rsi.fillna(50).to_numpy()

        self.rsi = self.I(calculate_rsi, close)

    def next(self):
        if not self.can_trade():
            return
        if not self.position and self.rsi[-1] < self.oversold:
            self.buy()
        elif self.position and self.rsi[-1] >= self.recovery:
            self.position.close()


class BuyAndHold(GatedStrategy):
    def init(self):
        self.has_bought = False

    def next(self):
        if not self.can_trade():
            return
        if not self.has_bought:
            self.buy()
            self.has_bought = True


STRATEGIES = {
    "ma_crossover": MovingAverageCrossover,
    "rsi_mean_reversion": RSIMeanReversion,
    "buy_and_hold": BuyAndHold,
}


def run_backtest(data, strategy=MovingAverageCrossover, cash=100000, params=None, trade_from=None):
    """Run a strategy against historical OHLCV data using selected parameters.

    Bars before `trade_from` are used only to warm up indicators; no trades happen there.
    """
    required = {"Open", "High", "Low", "Close", "Volume"}

    if not isinstance(data, pd.DataFrame):
        raise TypeError("data must be a pandas DataFrame")

    if not required.issubset(data.columns):
        raise ValueError(f"Data must contain columns: {sorted(required)}")

    data = data.copy()
    data = data.dropna(subset=list(required))
    data = data.sort_index()
    data = data[~data.index.duplicated(keep="last")]

    if len(data) < 2:
        raise ValueError("At least two valid price records are required.")

    if cash <= 0:
        raise ValueError("Initial capital must be greater than zero")

    params = params or {}
    allowed = {
        MovingAverageCrossover: {"short_window", "long_window"},
        RSIMeanReversion: {"rsi_period", "oversold", "recovery"},
        BuyAndHold: set(),
    }

    if strategy not in allowed:
        raise ValueError("Unsupported strategy class")

    unexpected = set(params) - allowed[strategy]
    if unexpected:
        raise ValueError(f"Unexpected parameters for strategy: {sorted(unexpected)}")

    if strategy is MovingAverageCrossover:
        short_window = int(params.get("short_window", 20))
        long_window = int(params.get("long_window", 50))
        if short_window < 1 or long_window <= short_window:
            raise ValueError("Long window must be greater than the positive short window")
        strategy_kwargs = {
            "short_window": short_window,
            "long_window": long_window,
        }
    elif strategy is RSIMeanReversion:
        rsi_period = int(params.get("rsi_period", 14))
        oversold = float(params.get("oversold", 30))
        recovery = float(params.get("recovery", 50))
        if rsi_period < 2:
            raise ValueError("RSI period must be at least 2")
        if not (0 < oversold < recovery < 100):
            raise ValueError("RSI levels must satisfy 0 < oversold < recovery < 100")
        strategy_kwargs = {
            "rsi_period": rsi_period,
            "oversold": oversold,
            "recovery": recovery,
        }
    else:
        strategy_kwargs = {}

    if trade_from is not None:
        strategy_kwargs["trade_from"] = pd.Timestamp(trade_from)

    # backtesting.py force-closes open trades at the last bar's *open*, which drops the final
    # day's move. Pad one synthetic bar priced at the last close so that close-out fills at the
    # last close instead; no new signals are taken on the last real bar or the pad.
    last_time = data.index[-1]
    pad_time = last_time + pd.Timedelta(days=1)
    last_close = data["Close"].iloc[-1]
    pad = pd.DataFrame(
        {"Open": last_close, "High": last_close, "Low": last_close, "Close": last_close, "Volume": 0},
        index=pd.DatetimeIndex([pad_time], name=data.index.name),
    )
    padded = pd.concat([data[list(required)], pad])
    strategy_kwargs["trade_until"] = last_time

    engine = Backtest(
        padded,
        strategy,
        cash=cash,
        commission=0.001,
        exclusive_orders=True,
        # close positions still open on the last bar so they count in trades and win rate
        finalize_trades=True,
    )

    stats = engine.run(**strategy_kwargs)

    # Drop the pad bar again and flag the trades it closed as end-of-period close-outs.
    stats["_equity_curve"] = stats["_equity_curve"].loc[:last_time]
    trades = stats["_trades"]
    if trades is not None and not trades.empty:
        trades = trades.copy()
        trades["ClosedAtEnd"] = trades["ExitTime"] == pad_time
        trades.loc[trades["ClosedAtEnd"], "ExitTime"] = last_time
        stats["_trades"] = trades
    return stats, engine
