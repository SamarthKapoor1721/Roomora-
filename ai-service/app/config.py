import os

from dotenv import load_dotenv

load_dotenv()


def _b(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    nvidia_api_key: str = os.getenv("NVIDIA_NIM_API_KEY", "").strip()
    nvidia_base_url: str = os.getenv(
        "NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com/v1"
    ).rstrip("/")
    # nvidia/nemotron-3-super-120b-a12b (~20s) is the default. Faster:
    # openai/gpt-oss-20b (~12s). Slow: moonshotai/kimi-k3 (~40s+). Many older
    # meta/mistral models on public NIM are retired (410).
    nvidia_model: str = os.getenv("NVIDIA_NIM_MODEL", "nvidia/nemotron-3-super-120b-a12b")
    nvidia_temperature: float = float(os.getenv("NVIDIA_NIM_TEMPERATURE", "0.3"))
    # Only sent when set — for DeepSeek/reasoning models: low|medium|high|max.
    nvidia_reasoning_effort: str = os.getenv("NVIDIA_NIM_REASONING_EFFORT", "").strip()

    # "blocking" = a user is waiting on it inside a synchronous flow (screening);
    # "interactive" = owner action / chat assistant (can wait longer).
    timeout_blocking: float = float(os.getenv("AI_TIMEOUT_BLOCKING", "40"))
    timeout_interactive: float = float(os.getenv("AI_TIMEOUT_INTERACTIVE", "60"))
    max_retries: int = int(os.getenv("AI_MAX_RETRIES", "1"))
    port: int = int(os.getenv("PORT", "8001"))

    @property
    def nvidia_configured(self) -> bool:
        return bool(self.nvidia_api_key)


settings = Settings()
