from types import SimpleNamespace

from backend.agents.revision import RevisionAgent
from backend.agents.test_agent import TestAgent as AssessmentAgent
from backend.learning.languages import build_language_prompt, normalize_output_language
from backend.learning.preferences import build_learn_preference_prompt


class RecordingLLM:
    def __init__(self, response='{"questions": []}'):
        self.prompts = []
        self.response = response

    def invoke(self, prompt):
        self.prompts.append(prompt)
        return SimpleNamespace(content=self.response)


def test_supported_indian_language_prompt_and_safe_default():
    assert "Hindi" in build_language_prompt("hindi")
    assert "தமிழ்" in build_language_prompt("tamil")
    assert "latest query" in build_language_prompt("auto")
    assert normalize_output_language("not-a-language") == "auto"


def test_progress_language_contract_supports_indian_languages():
    prompt = build_language_prompt("kannada")
    assert "Kannada" in prompt
    assert "learner-facing content" in prompt


def test_progress_formatter_uses_the_content_prop():
    source = open("frontend/src/pages/Progress.jsx", encoding="utf-8").read()
    assert "<FormattedText content={feedback" in source
    assert "<FormattedText text={feedback" not in source


def test_learn_preferences_always_include_multilingual_contract():
    preferences = SimpleNamespace(
        output_language="telugu",
        chat_style="auto",
        chat_custom_instruction="",
    )
    prompt = build_learn_preference_prompt(preferences, "text")
    assert "Telugu" in prompt
    assert "required JSON keys unchanged" in prompt


def test_revision_and_test_generation_receive_selected_language():
    revision_llm = RecordingLLM('{"diagnosis": {}, "questions": []}')
    RevisionAgent(revision_llm).generate_revision_bundle(
        student_id="s1",
        topic="Fractions",
        chat_messages=[],
        quiz_history=[],
        misconceptions=[],
        masteries=[],
        output_language="marathi",
    )
    assert "Marathi" in revision_llm.prompts[0]

    test_llm = RecordingLLM()
    AssessmentAgent(test_llm).generate_quiz("Fractions", output_language="bengali")
    assert "Bengali" in test_llm.prompts[0]
