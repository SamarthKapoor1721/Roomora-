"""Thin client for the NVIDIA NIM chat-completions API.

Raises ``NvidiaUnavailable`` on any failure (missing key, timeout, rate limit,
5xx, malformed response) so callers can switch to the rule-based fallback.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from .config import settings


class NvidiaUnavailable(Exception):
    """Signals that the NVIDIA provider could not serve the request."""


async def chat_json(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.2,
    max_tokens: int = 900,
) -> dict[str, Any]:
    """Call NVIDIA NIM and parse the assistant message as JSON.

    The prompt must instruct the model to return a single JSON object.
    """
    if not settings.nvidia_configured:
        raise NvidiaUnavailable("NVIDIA_NIM_API_KEY is not set")

    payload = {
        "model": settings.nvidia_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {settings.nvidia_api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    url = f"{settings.nvidia_base_url}/chat/completions"

    last_err: Exception | None = None
    for attempt in range(settings.max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)

            if resp.status_code == 429:
                raise NvidiaUnavailable("rate limited (429)")
            if resp.status_code >= 500:
                raise NvidiaUnavailable(f"upstream error ({resp.status_code})")
            if resp.status_code >= 400:
                # Client error — retrying won't help.
                raise NvidiaUnavailable(f"request rejected ({resp.status_code}): {resp.text[:200]}")

            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = _extract_json(content)
            parsed.setdefault("_model", settings.nvidia_model)
            return parsed
        except NvidiaUnavailable:
            raise
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last_err = exc
            if attempt < settings.max_retries:
                continue
            raise NvidiaUnavailable(f"network error: {exc}") from exc
        except (KeyError, ValueError, json.JSONDecodeError) as exc:
            raise NvidiaUnavailable(f"malformed response: {exc}") from exc

    raise NvidiaUnavailable(str(last_err) if last_err else "unknown error")


def _extract_json(content: str) -> dict[str, Any]:
    content = content.strip()
    if content.startswith("```"):
        # strip ```json ... ``` fences
        content = content.split("```", 2)[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(content[start : end + 1])
        raise
