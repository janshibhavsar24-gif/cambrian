"""
LLM adapter — Anthropic Claude.
Retries on rate limit errors with exponential backoff.
"""

import os
import asyncio
from typing import AsyncGenerator
from anthropic import AsyncAnthropic, RateLimitError, APIStatusError

MAX_RETRIES = 5
BASE_DELAY = 10  # seconds — doubles each retry


class LLMAdapter:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=os.environ.get("LLM_API_KEY", ""))
        self.model = os.environ.get("LLM_MODEL", "claude-sonnet-4-6")

    async def complete(self, system: str, user: str, temperature: float = 0.9) -> str:
        delay = BASE_DELAY
        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=1024,
                    temperature=temperature,
                    system=system,
                    messages=[{"role": "user", "content": user}],
                )
                return response.content[0].text.strip()
            except (RateLimitError, APIStatusError) as e:
                if isinstance(e, APIStatusError) and e.status_code != 529:
                    raise
                if attempt == MAX_RETRIES - 1:
                    raise
                await asyncio.sleep(delay)
                delay *= 2

    async def stream(self, system: str, user: str, temperature: float = 0.9) -> AsyncGenerator[str, None]:
        delay = BASE_DELAY
        for attempt in range(MAX_RETRIES):
            try:
                async with self.client.messages.stream(
                    model=self.model,
                    max_tokens=1024,
                    temperature=temperature,
                    system=system,
                    messages=[{"role": "user", "content": user}],
                ) as stream:
                    async for text in stream.text_stream:
                        yield text
                return
            except (RateLimitError, APIStatusError) as e:
                if isinstance(e, APIStatusError) and e.status_code != 529:
                    raise
                if attempt == MAX_RETRIES - 1:
                    raise
                await asyncio.sleep(delay)
                delay *= 2
