import os
import json
from typing import List, Dict, Any, Optional
from models.question import DiagnosticQuestion
from models.diagnostic import DiagnosticResponse
from services.llm_service import LLMService

class InsufficientGroundingError(Exception):
    """Raised when available source material is insufficient to generate grounded diagnostic questions."""
    def __init__(self, message: str = "The available topic source does not contain enough information to generate the diagnostic."):
        super().__init__(message)
        self.code = "INSUFFICIENT_GROUNDING"
        self.message = message

class DiagnosticGenerationError(Exception):
    """Raised when diagnostic generation fails validation or LLM retries are exhausted."""
    pass

class DiagnosticAgent:
    def __init__(
        self,
        llm_service: Optional[LLMService] = None,
        prompt_path: Optional[str] = None
    ):
        self.llm_service = llm_service or LLMService()
        self.prompt_path = prompt_path or os.path.join(
            os.path.dirname(__file__), "..", "prompts", "diagnostic_prompt.txt"
        )
        self._load_prompt_template()

    def _load_prompt_template(self) -> None:
        if os.path.exists(self.prompt_path):
            with open(self.prompt_path, "r", encoding="utf-8") as f:
                self.prompt_template = f.read()
        else:
            # Fallback template matching requirement
            self.prompt_template = """You are the Diagnostic Agent for EDUNEXUS.

Your task is to generate a short diagnostic assessment
for the selected syllabus topic.

TOPIC:
{topic}

ALLOWED SUB-CONCEPTS:
{subconcepts}

SOURCE MATERIAL:
{source_context}

RULES:

1. Use ONLY the supplied source material.
2. Generate exactly 5 questions.
3. Tag every question with exactly one sub-concept.
4. Cover the important sub-concepts represented in the source.
5. Questions should test understanding rather than only memorization.
6. Do not introduce concepts that are not supported by the source.
7. Do not duplicate questions.
8. Each question must have one unambiguous correct answer.
9. Provide a short explanation for the correct answer.
10. Provide a source reference for the question.
11. Return valid JSON matching the required schema.
12. Do not provide any text outside the JSON."""

    def _format_source_context(self, source_chunks: List[Dict[str, Any]]) -> str:
        formatted = []
        for idx, chunk in enumerate(source_chunks):
            subc = chunk.get("subconcept", "General")
            content = chunk.get("content", "").strip()
            src = chunk.get("source", "source")
            formatted.append(f"--- CHUNK {idx+1} [Sub-concept: {subc} | Source: {src}] ---\n{content}")
        return "\n\n".join(formatted)

    def _extract_allowed_subconcepts(self, source_chunks: List[Dict[str, Any]]) -> List[str]:
        subconcepts = []
        for c in source_chunks:
            sc = c.get("subconcept")
            if sc and sc != "General" and sc not in subconcepts:
                subconcepts.append(sc)
        if not subconcepts:
            subconcepts = ["General"]
        return subconcepts

    def generate_diagnostic(
        self,
        topic: str,
        source_context: List[Dict[str, Any]],
        force_demo: bool = False,
        allowed_subconcepts: Optional[List[str]] = None
    ) -> DiagnosticResponse:
        """
        Generates a grounded 5-question diagnostic assessment for a topic.

        Enforces:
        - Strict source grounding (rejects empty or inadequate source material)
        - Exactly 5 questions
        - Exactly one sub-concept per question
        - Only sub-concepts supported by the source
        - Demo mode deterministic fallback when DEMO_MODE=true
        - LLM retry with error feedback if output is malformed
        """
        # 1. Grounding check
        if not source_context or len(source_context) == 0:
            raise InsufficientGroundingError()

        # Check total textual substance in source context
        total_chars = sum(len(c.get("content", "").strip()) for c in source_context)
        if total_chars < 80:
            raise InsufficientGroundingError("The retrieved source content is too sparse to formulate a valid diagnostic.")

        if not allowed_subconcepts:
            allowed_subconcepts = self._extract_allowed_subconcepts(source_context)

        # 2. Check DEMO_MODE
        if force_demo or self.llm_service.demo_mode or not self.llm_service.is_configured():
            # For "Python Lists — Indexing and Slicing", return verified deterministic demo diagnostic
            demo_data = self.llm_service.get_deterministic_demo_diagnostic(topic)
            response = DiagnosticResponse(**demo_data)
            # Enforce allowed subconcepts validation
            response.validate_allowed_subconcepts(allowed_subconcepts)
            return response

        # 3. Production LLM Path
        formatted_context = self._format_source_context(source_context)
        prompt = self.prompt_template.format(
            topic=topic,
            subconcepts=", ".join(allowed_subconcepts),
            source_context=formatted_context
        )

        schema_instruction = (
            "\n\nOutput JSON Schema:\n"
            "{\n"
            '  "topic": "' + topic + '",\n'
            '  "questions": [\n'
            '    {\n'
            '      "id": "Q1",\n'
            '      "question": "question text",\n'
            '      "options": ["A", "B", "C", "D"],\n'
            '      "correct_answer": "exact string matching one of the options",\n'
            '      "subconcept": "one allowed subconcept",\n'
            '      "explanation": "pedagogical rationale",\n'
            '      "source_reference": "citation from source"\n'
            '    }\n'
            "  ],\n"
            '  "source_chunks_used": ["chunk references"]\n'
            "}\n"
            "CRITICAL: The questions array MUST have length 5. No more, no less."
        )

        full_prompt = prompt + schema_instruction

        # First LLM Attempt
        raw_output = ""
        last_error = ""
        for attempt in range(2):
            try:
                if attempt == 0:
                    raw_output = self.llm_service.call_llm(full_prompt)
                else:
                    correction_prompt = (
                        f"{full_prompt}\n\n"
                        f"IMPORTANT CORRECTION REQUIRED:\n"
                        f"Your previous attempt produced an invalid response: {last_error}\n"
                        f"Ensure you return valid JSON containing EXACTLY 5 questions, with correct_answer "
                        f"matching one of the options, and subconcepts chosen from: {allowed_subconcepts}."
                    )
                    raw_output = self.llm_service.call_llm(correction_prompt)

                parsed_json = self.llm_service.extract_json(raw_output)
                if not parsed_json:
                    raise ValueError("Failed to extract valid JSON from LLM output.")

                # Validate with Pydantic model
                diagnostic = DiagnosticResponse(**parsed_json)
                diagnostic.validate_allowed_subconcepts(allowed_subconcepts)
                return diagnostic

            except Exception as e:
                last_error = str(e)
                print(f"[DiagnosticAgent] Attempt {attempt + 1} validation error: {last_error}")

        # If both attempts failed, raise DiagnosticGenerationError
        raise DiagnosticGenerationError(
            f"Failed to generate a valid diagnostic after retry. Error: {last_error}"
        )
