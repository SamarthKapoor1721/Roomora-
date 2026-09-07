import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    nvidia_api_key: str = os.getenv("NVIDIA_NIM_API_KEY", "").strip()
    nvidia_base_url: str = os.getenv(
        "NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com/v1"
    ).rstrip("/")
    nvidia_model: str = os.getenv("NVIDIA_NIM_MODEL", "meta/llama-3.1-70b-instruct")

    request_timeout: float = float(os.getenv("AI_REQUEST_TIMEOUT", "15"))
    max_retries: int = int(os.getenv("AI_MAX_RETRIES", "1"))
    port: int = int(os.getenv("PORT", "8001"))

    @property
    def nvidia_configured(self) -> bool:
        return bool(self.nvidia_api_key)


settings = Settings()
