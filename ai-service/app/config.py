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
    nvidia_model: str = os.getenv("NVIDIA_NIM_MODEL", "moonshotai/kimi-k3")
    # reasoning_effort: "low" | "medium" | "high" | "max" (reasoning models only)
    nvidia_reasoning_effort: str = os.getenv("NVIDIA_NIM_REASONING_EFFORT", "low")
    nvidia_temperature: float = float(os.getenv("NVIDIA_NIM_TEMPERATURE", "0.4"))

    # These NVIDIA-hosted reasoning models are slow. Give blocking calls a short
    # budget (fall back fast) and owner-triggered / chat calls a long one.
    timeout_blocking: float = float(os.getenv("AI_TIMEOUT_BLOCKING", "18"))
    timeout_interactive: float = float(os.getenv("AI_TIMEOUT_INTERACTIVE", "90"))
    max_retries: int = int(os.getenv("AI_MAX_RETRIES", "0"))
    port: int = int(os.getenv("PORT", "8001"))

    @property
    def nvidia_configured(self) -> bool:
        return bool(self.nvidia_api_key)


settings = Settings()
