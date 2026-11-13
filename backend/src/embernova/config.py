from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    openai_api_key: SecretStr | None = None
    agent_model: str = "gpt-6.1-sol"
    agent_fallback_model: str = "gpt-6.1-terra"
    embedding_model: str = "text-embedding-3-small"
    embedding_dims: int = 512
    embedding_price_per_million: float = 0.02
    retrieval_text_weight: float = Field(0.7, ge=0)
    retrieval_facet_weight: float = Field(0.3, ge=0)
    # Data availability is displayed as a badge; scoring it biased relevance toward curated tables.
    retrieval_availability_weight: float = Field(0.0, ge=0)
    # Cosine floors measured on the retrieval benchmark vs unrelated text (2026-11-13).
    retrieval_dense_min_profile_sim: float = Field(0.35, ge=0, le=1)
    retrieval_dense_min_chunk_sim: float = Field(0.45, ge=0, le=1)
    trusted_proxy: bool = False  # Read the client address from X-Forwarded-For behind a proxy.
    agent_reasoning_effort_chat: str = "medium"
    max_tool_rounds: int = Field(6, ge=1, le=12)
    max_output_tokens: int = Field(3500, ge=128, le=10000)
    max_turn_input_tokens: int = 150000
    turn_timeout_s: int = 120
    daily_budget_usd: float = Field(2.0, ge=0)
    max_turn_cost_usd: float = Field(0.30, gt=0)
    per_ip_turns_per_hour: int = 20
    price_input_per_million: float = 2.0
    price_cached_per_million: float = 0.10
    price_output_per_million: float = 10.0
    analysis_lab: bool = False
    code_container_cost_usd: float = 0.03
    illustrations: bool = False
    secure_cookies: bool = False  # Enable behind production HTTPS.
    admin_token: SecretStr | None = None
    data_dir: Path = ROOT / "data"
    build_dir: Path = ROOT / "build"
    state_dir: Path = ROOT / "build" / "state"


@lru_cache
def settings() -> Settings:
    return Settings()
