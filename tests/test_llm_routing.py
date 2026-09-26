from types import SimpleNamespace

from server import LLMWrapper, get_llm


class FakeCompletions:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=outcome))])


def fake_client(outcomes):
    completions = FakeCompletions(outcomes)
    return SimpleNamespace(chat=SimpleNamespace(completions=completions)), completions


def test_router_falls_back_to_nvidia_after_openrouter_failure():
    openrouter, openrouter_calls = fake_client([RuntimeError("401 invalid key")])
    nvidia, nvidia_calls = fake_client(["fallback worked"])
    llm = LLMWrapper([
        {"name": "OpenRouter", "client": openrouter, "models": ["openai/gpt-5.6-luna"]},
        {"name": "NVIDIA NIM", "client": nvidia, "models": ["nvidia/nemotron"]},
    ])

    assert llm.invoke("hello") == "fallback worked"
    assert openrouter_calls.calls[0]["model"] == "openai/gpt-5.6-luna"
    assert nvidia_calls.calls[0]["model"] == "nvidia/nemotron"


def test_router_retries_without_unsupported_temperature():
    client, calls = fake_client([RuntimeError("temperature is not supported"), "clean retry"])
    llm = LLMWrapper([{"name": "OpenRouter", "client": client, "models": ["openai/gpt-5.6-luna"]}])

    assert llm.invoke("hello") == "clean retry"
    assert "temperature" in calls.calls[0]
    assert "temperature" not in calls.calls[1]


def test_get_llm_prefers_openrouter_and_keeps_nvidia_route(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "openai/gpt-5.6-luna")
    monkeypatch.setenv("NVIDIA_API_KEY", "test-nvidia-key")
    monkeypatch.setenv("NVIDIA_MODEL", "nvidia/test-model")

    llm = get_llm()

    assert llm.provider_name == "OpenRouter"
    assert llm.model_name == "openai/gpt-5.6-luna"
    assert [route["name"] for route in llm.routes] == ["OpenRouter", "NVIDIA NIM"]
