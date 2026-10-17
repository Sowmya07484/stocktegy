
import pandas as pd
from backtesting import Backtest, Strategy


class MovingAverageCrossover(Strategy):
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
        if self.short_ma[-1] > self.long_ma[-1]:
            if not self.position:
                self.buy()
        elif self.short_ma[-1] < self.long_ma[-1]:
            if self.position:
                self.position.close()


class RSIMeanReversion(Strategy):
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
        if not self.position and self.rsi[-1] < self.oversold:
            self.buy()
        elif self.position and self.rsi[-1] >= self.recovery:
            self.position.close()


class BuyAndHold(Strategy):
    def init(self):
        self.has_bought = False

    def next(self):
        if not self.has_bought:
            self.buy()
            self.has_bought = True


STRATEGIES = {
    "ma_crossover": MovingAverageCrossover,
    "rsi_mean_reversion": RSIMeanReversion,
    "buy_and_hold": BuyAndHold,
}


def run_backtest(data, strategy=MovingAverageCrossover, cash=100000, params=None):
    """Run a strategy against historical OHLCV data using selected parameters."""
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

    engine = Backtest(
        data,
        strategy,
        cash=cash,
        commission=0.001,
        exclusive_orders=True,
    )

    stats = engine.run(**strategy_kwargs)
    return stats, engine
