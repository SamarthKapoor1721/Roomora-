"""Client for the NVIDIA NIM chat-completions API (OpenAI-compatible).

Uses the async OpenAI SDK against https://integrate.api.nvidia.com/v1, matching
NVIDIA's own code samples. Raises ``NvidiaUnavailable`` on any failure (missing
key, timeout, rate limit, 4xx/5xx, malformed response) so callers can fall back
to the rule-based engine.

The NVIDIA-hosted reasoning models are slow (tens of seconds), so callers pass a
`budget`: "blocking" for requests a user is actively waiting on inside a
synchronous flow (short timeout, fall back fast), or "interactive" for
owner-triggered actions and the chat assistant (long timeout).
"""
from __future__ import annotations

import json
import re
from typing import Any, Literal

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    RateLimitError,
)

from .config import settings

Budget = Literal["blocking", "interactive"]

# one client per timeout budget (the OpenAI SDK sets timeout at construction)
_clients: dict[float, AsyncOpenAI] = {}


class NvidiaUnavailable(Exception):
    """Signals that the NVIDIA provider could not serve the request."""


def _client_for(timeout: float) -> AsyncOpenAI:
    c = _clients.get(timeout)
    if c is None:
        c = AsyncOpenAI(
            base_url=settings.nvidia_base_url,
            api_key=settings.nvidia_api_key,
            timeout=timeout,
            max_retries=0,  # retries handled here
        )
        _clients[timeout] = c
    return c


async def chat_json(
    system_prompt: str,
    user_prompt: str,
    *,
    budget: Budget = "blocking",
    temperature: float | None = None,
    max_tokens: int = 4096,
) -> dict[str, Any]:
    """Call NVIDIA NIM and parse the assistant message as a JSON object.

    The prompts must instruct the model to return a single JSON object.
    """
    if not settings.nvidia_configured:
        raise NvidiaUnavailable("NVIDIA_NIM_API_KEY is not set")

    timeout = (
        settings.timeout_interactive if budget == "interactive" else settings.timeout_blocking
    )
    client = _client_for(timeout)

    extra_body: dict[str, Any] = {}
    if settings.nvidia_reasoning_effort:
        # DeepSeek/reasoning models accept this; others 400 on it, so only send
        # it when explicitly configured.
        extra_body["reasoning_effort"] = settings.nvidia_reasoning_effort

    last_err: Exception | None = None
    for attempt in range(settings.max_retries + 1):
        try:
            completion = await client.chat.completions.create(
                model=settings.nvidia_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=(
                    settings.nvidia_temperature if temperature is None else temperature
                ),
                top_p=0.95,
                max_tokens=max_tokens,
                stream=False,
                extra_body=extra_body or None,
            )
            msg = completion.choices[0].message
            content = (msg.content or "").strip()
            if not content:
                # some reasoning models put the answer in reasoning_content
                content = (
                    getattr(msg, "reasoning", None)
                    or getattr(msg, "reasoning_content", None)
                    or ""
                )
            parsed = _extract_json(content)
            parsed.setdefault("_model", settings.nvidia_model)
            return parsed

        except RateLimitError as exc:
            raise NvidiaUnavailable(f"rate limited: {exc}") from exc
        except (APITimeoutError, APIConnectionError) as exc:
            last_err = exc
            if attempt < settings.max_retries:
                continue
            raise NvidiaUnavailable(f"network: {type(exc).__name__}: {exc}") from exc
        except APIStatusError as exc:
            if exc.status_code >= 500 and attempt < settings.max_retries:
                last_err = exc
                continue
            raise NvidiaUnavailable(f"API {exc.status_code}: {exc}") from exc
        except (KeyError, ValueError, json.JSONDecodeError) as exc:
            raise NvidiaUnavailable(f"malformed response: {exc}") from exc

    raise NvidiaUnavailable(str(last_err) if last_err else "unknown error")


_THINK_RE = re.compile(r"<think>.*?</think>", re.S | re.I)


def _extract_json(content: str) -> dict[str, Any]:
    content = _THINK_RE.sub("", content).strip()
    if content.startswith("```"):
        content = content.split("```", 2)[1]
        if content[:4].lower() == "json":
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
