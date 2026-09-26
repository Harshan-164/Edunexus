from types import SimpleNamespace

from server import LLMWrapper, get_llm
import server


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


def test_router_falls_back_across_nvidia_models():
    nvidia, nvidia_calls = fake_client([RuntimeError("503 unavailable"), RuntimeError("503 unavailable"), "fallback worked"])
    llm = LLMWrapper([
        {"name": "NVIDIA NIM", "client": nvidia, "models": ["nvidia/nemotron-primary", "nvidia/nemotron-fallback"]},
    ])

    assert llm.invoke("hello") == "fallback worked"
    assert nvidia_calls.calls[0]["model"] == "nvidia/nemotron-primary"
    assert nvidia_calls.calls[-1]["model"] == "nvidia/nemotron-fallback"


def test_router_retries_without_unsupported_temperature():
    client, calls = fake_client([RuntimeError("temperature is not supported"), "clean retry"])
    llm = LLMWrapper([{"name": "NVIDIA NIM", "client": client, "models": ["nvidia/nemotron"]}])

    assert llm.invoke("hello") == "clean retry"
    assert "temperature" in calls.calls[0]
    assert "temperature" not in calls.calls[1]


def test_get_llm_uses_only_nvidia_even_when_openrouter_is_configured(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "openai/gpt-5.6-luna")
    monkeypatch.setenv("NVIDIA_API_KEY", "test-nvidia-key")
    monkeypatch.setenv("NVIDIA_MODEL", "nvidia/test-model")

    llm = get_llm()

    assert llm.provider_name == "NVIDIA NIM"
    assert llm.model_name == "nvidia/test-model"
    assert [route["name"] for route in llm.routes] == ["NVIDIA NIM"]


def test_progress_bundle_uses_exactly_one_nim_request(monkeypatch):
    client, calls = fake_client([
        '{"feedback":"Localized diagnostic","summary":{"headline":"Strong momentum","overview":"Good progress",'
        '"strengths":["Recall"],"focus_areas":["Boundaries"],"next_steps":["Revise"]},'
        '"translations":[{"id":0,"text":"स्थानीय शीर्षक"}]}'
    ])
    client.with_options = lambda **kwargs: client
    fake_llm = SimpleNamespace(routes=[{
        "name": "NVIDIA NIM",
        "client": client,
        "models": ["nvidia/test-model"],
    }])
    monkeypatch.setattr(server, "llm", fake_llm)

    result = server._generate_progress_ai_bundle(
        student_id="student",
        output_language="hindi",
        topic_names=["Arrays"],
        mastered_count=0,
        test_count=1,
        average_score=60,
        revision_count=0,
        misconception_count=1,
        strings=["Progress title"],
        fallback_feedback="Fallback",
    )

    assert len(calls.calls) == 1
    assert result["feedback"] == "Localized diagnostic"
    assert result["summary"]["headline"] == "Strong momentum"
    assert result["translations"] == ["स्थानीय शीर्षक"]
