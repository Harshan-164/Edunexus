"""Shared completion adapter for routed and legacy OpenAI-compatible clients."""

import os


def create_chat_completion(llm, **kwargs):
    if hasattr(llm, "create_completion"):
        return llm.create_completion(**kwargs)
    # Compatibility for standalone scripts that still pass a raw OpenAI client.
    model = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
    return llm.chat.completions.create(model=model, **kwargs)
