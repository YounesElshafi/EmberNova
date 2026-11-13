import hashlib
import time
from datetime import UTC, datetime

from embernova.config import Settings
from embernova.storage import Store


class BudgetError(Exception):
    pass


class Budget:
    def __init__(self, cfg: Settings, store: Store):
        self.cfg, self.store = cfg, store

    def used(self):
        day = datetime.now(UTC).date().isoformat()
        with self.store.app() as db:
            # Expired reservations are charged conservatively, not silently released after crashes.
            row = db.execute(
                "SELECT coalesce(sum(cost+reserved),0) FROM usage WHERE day=?", (day,)
            ).fetchone()
        return float(row[0])

    def reserve(self, turn_id: str, ip: str):
        day = datetime.now(UTC).date().isoformat()
        hashed = hashlib.sha256(ip.encode()).hexdigest()
        with self.store.app() as db:
            db.execute("BEGIN IMMEDIATE")
            used = db.execute(
                "SELECT coalesce(sum(cost+reserved),0) FROM usage WHERE day=?", (day,)
            ).fetchone()[0]
            count = db.execute(
                "SELECT count(*) FROM usage WHERE ip=? AND created>?", (hashed, time.time() - 3600)
            ).fetchone()[0]
            if used + self.cfg.max_turn_cost_usd > self.cfg.daily_budget_usd:
                raise BudgetError("Daily application budget cannot accommodate another turn")
            if count >= self.cfg.per_ip_turns_per_hour:
                raise BudgetError("Hourly research turn limit reached")
            db.execute(
                "INSERT INTO usage VALUES (?,?,?,?,?,?)",
                (turn_id, day, hashed, time.time(), 0, self.cfg.max_turn_cost_usd),
            )

    def settle(self, turn_id: str, cost: float):
        with self.store.app() as db:
            db.execute("UPDATE usage SET cost=?,reserved=0 WHERE id=?", (cost, turn_id))

    def cost(self, usage: dict) -> float:
        cached = usage.get("cached_tokens", 0)
        return (
            (usage.get("input_tokens", 0) - cached) * self.cfg.price_input_per_million
            + cached * self.cfg.price_cached_per_million
            + usage.get("output_tokens", 0) * self.cfg.price_output_per_million
        ) / 1e6
