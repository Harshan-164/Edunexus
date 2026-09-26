"""Shared multilingual prompt guidance for learning experiences."""

SUPPORTED_OUTPUT_LANGUAGES = {
    "auto": "the language used by the learner in their latest query or learning context",
    "english": "English",
    "hindi": "Hindi (हिन्दी)",
    "bengali": "Bengali (বাংলা)",
    "telugu": "Telugu (తెలుగు)",
    "marathi": "Marathi (मराठी)",
    "tamil": "Tamil (தமிழ்)",
    "gujarati": "Gujarati (ગુજરાતી)",
    "kannada": "Kannada (ಕನ್ನಡ)",
    "malayalam": "Malayalam (മലയാളം)",
    "punjabi": "Punjabi (ਪੰਜਾਬੀ)",
    "odia": "Odia (ଓଡ଼ିଆ)",
    "assamese": "Assamese (অসমীয়া)",
    "urdu": "Urdu (اردو)",
}


def normalize_output_language(value: str | None) -> str:
    language = (value or "auto").strip().lower()
    return language if language in SUPPORTED_OUTPUT_LANGUAGES else "auto"


def build_language_prompt(value: str | None) -> str:
    language = normalize_output_language(value)
    target = SUPPORTED_OUTPUT_LANGUAGES[language]
    if language == "auto":
        output_rule = (
            "Respond in the language and script used by the learner in their latest query. "
            "If their language is ambiguous or the context mixes languages, use the dominant language; default to English."
        )
    else:
        output_rule = f"Write all learner-facing content in {target}."
    return (
        "\nMultilingual requirements:\n"
        "- Understand learner queries and evidence written in any language, including Indian languages and mixed-language text.\n"
        f"- {output_rule}\n"
        "- Keep code, formulas, identifiers, and required JSON keys unchanged. Translate learner-facing titles, questions, "
        "options, explanations, captions, and flashcard text.\n"
        "- Preserve technical accuracy; when useful, retain the standard English technical term in parentheses after its translation.\n"
    )
