"""Cheatsheet generator for Nexora Learn sessions using PyMuPDF and LLM extraction."""

import datetime
import html
import json
import logging
import re
from typing import Any, Dict, List, Optional
import pymupdf

logger = logging.getLogger("NEXORA-CHEATSHEET")


def _sanitize_for_html(text: str) -> str:
    """Escapes HTML entities while preserving line breaks and basic formatting."""
    if not text:
        return ""
    safe = html.escape(str(text))
    # Convert double newlines to paragraph breaks, single to br
    safe = re.sub(r"\n\n+", "</p><p>", safe)
    safe = safe.replace("\n", "<br/>")
    return safe


def extract_cheatsheet_data(
    topic: str,
    description: str,
    messages: List[Dict[str, Any]],
    llm: Any = None,
    output_language: str = "auto",
) -> Dict[str, Any]:
    """
    Synthesizes the chat history into a structured cheatsheet.
    Uses LLM when available, with a deterministic fallback based on message text.
    """
    # Filter text from user and tutor
    chat_dialogue = []
    for msg in messages:
        sender = "Student" if msg.get("sender") == "user" else "Tutor"
        text = str(msg.get("text", "")).strip()
        if text:
            chat_dialogue.append(f"{sender}: {text}")

    dialogue_str = "\n\n".join(chat_dialogue[-20:])  # Focus on key discussion

    # Fallback structure
    fallback_data = {
        "title": topic or "Lesson Study Cheatsheet",
        "description": description or "Summary of concepts discussed in this learning session.",
        "summary": f"Quick-reference cheatsheet summarizing the key explanations and questions covered in {topic}.",
        "key_concepts": [],
        "rules_and_formulas": [],
        "qa_highlights": [],
        "common_pitfalls": [],
        "quick_takeaways": [],
    }

    # Extract user questions and tutor answers for fallback
    tutor_replies = [m.get("text", "") for m in messages if m.get("sender") == "tutor" and m.get("text")]
    user_questions = [m.get("text", "") for m in messages if m.get("sender") == "user" and m.get("text")]

    for i, q in enumerate(user_questions[:4]):
        ans = tutor_replies[i] if i < len(tutor_replies) else "Discussed during session."
        fallback_data["qa_highlights"].append({
            "question": q[:140],
            "answer": ans[:240] + ("..." if len(ans) > 240 else ""),
        })

    # Pull out key bullet points from tutor messages
    for reply in tutor_replies:
        lines = [line.strip("- *• \t") for line in reply.split("\n") if line.strip().startswith(("-", "*", "•", "1.", "2.", "3."))]
        for line in lines[:3]:
            if line and len(line) > 10 and line not in fallback_data["quick_takeaways"]:
                fallback_data["quick_takeaways"].append(line[:160])

    if not fallback_data["quick_takeaways"] and tutor_replies:
        fallback_data["quick_takeaways"].append(tutor_replies[0][:150])

    # If LLM is provided and dialogue exists, use LLM for synthesis
    if llm and dialogue_str.strip():
        lang_note = f"Respond in {output_language} if appropriate." if output_language and output_language != "auto" else "Match the language used in the chat."
        prompt = f"""You are an expert academic curriculum designer.
Analyze the following student-tutor chat discussion on "{topic}" and generate a high-yield study cheatsheet in JSON format.
{lang_note}

Discussion:
{dialogue_str}

Return STRICTLY a JSON object with this exact schema:
{{
  "title": "{topic} — Study Cheatsheet",
  "summary": "2-3 sentence executive synopsis of what was understood",
  "key_concepts": [
    {{"name": "Concept name", "explanation": "Clear, concise definition or explanation"}},
    {{"name": "Concept name", "explanation": "Clear, concise definition or explanation"}}
  ],
  "rules_and_formulas": [
    {{"rule": "Equation / Invariant / Algorithmic Rule", "details": "When to apply or how it works"}}
  ],
  "qa_highlights": [
    {{"question": "Key student question or doubt", "answer": "Core tutor clarification"}}
  ],
  "common_pitfalls": [
    "Common misconception or mistake to avoid discussed in the chat"
  ],
  "quick_takeaways": [
    "3-5 high-yield bullet points for rapid pre-exam recall"
  ]
}}
Do not include any markdown fences or commentary outside the JSON."""

        try:
            res = llm.invoke(prompt)
            raw = getattr(res, "content", str(res)).strip()
            # Clean possible markdown formatting
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and "key_concepts" in parsed:
                return {
                    "title": parsed.get("title") or topic or "Lesson Cheatsheet",
                    "description": description,
                    "summary": parsed.get("summary") or fallback_data["summary"],
                    "key_concepts": parsed.get("key_concepts", []),
                    "rules_and_formulas": parsed.get("rules_and_formulas", []),
                    "qa_highlights": parsed.get("qa_highlights", fallback_data["qa_highlights"]),
                    "common_pitfalls": parsed.get("common_pitfalls", []),
                    "quick_takeaways": parsed.get("quick_takeaways", fallback_data["quick_takeaways"]),
                }
        except Exception as exc:
            logger.warning("LLM cheatsheet extraction failed, using fallback: %s", exc)

    return fallback_data


def render_cheatsheet_html(data: Dict[str, Any]) -> str:
    """Generates clean, print-ready HTML styled for PDF conversion."""
    title = html.escape(str(data.get("title", "Nexora Study Cheatsheet")))
    summary = html.escape(str(data.get("summary", "")))
    date_str = datetime.datetime.now().strftime("%B %d, %Y")

    # Key Concepts HTML
    concepts_html = ""
    for c in data.get("key_concepts", []):
        c_name = html.escape(str(c.get("name", "")))
        c_exp = html.escape(str(c.get("explanation", "")))
        concepts_html += f"""
        <div style="margin-bottom: 8px; padding: 6px 10px; background: #f0fdfa; border-left: 3px solid #0d9488; border-radius: 4px;">
            <strong style="color: #0f766e; font-size: 11px;">{c_name}:</strong>
            <span style="color: #334155; font-size: 10px; line-height: 1.4;"> {c_exp}</span>
        </div>
        """

    # Formulas & Rules HTML
    rules_html = ""
    for r in data.get("rules_and_formulas", []):
        r_name = html.escape(str(r.get("rule", "")))
        r_det = html.escape(str(r.get("details", "")))
        rules_html += f"""
        <div style="margin-bottom: 8px; padding: 6px 10px; background: #eff6ff; border-left: 3px solid #2563eb; border-radius: 4px;">
            <code style="font-weight: bold; color: #1d4ed8; font-size: 10px;">{r_name}</code>
            <p style="margin: 2px 0 0; color: #475569; font-size: 9.5px; line-height: 1.35;">{r_det}</p>
        </div>
        """

    # Q&A Highlights HTML
    qa_html = ""
    for qa in data.get("qa_highlights", []):
        q = html.escape(str(qa.get("question", "")))
        a = html.escape(str(qa.get("answer", "")))
        qa_html += f"""
        <div style="margin-bottom: 8px; padding: 6px 10px; background: #faf5ff; border-left: 3px solid #9333ea; border-radius: 4px;">
            <div style="font-weight: bold; color: #7e22ce; font-size: 10px;">Q: {q}</div>
            <div style="margin-top: 2px; color: #334155; font-size: 9.5px; line-height: 1.35;">A: {a}</div>
        </div>
        """

    # Pitfalls HTML
    pitfalls_html = ""
    for p in data.get("common_pitfalls", []):
        p_text = html.escape(str(p))
        pitfalls_html += f"""
        <li style="margin-bottom: 4px; color: #991b1b; font-size: 9.5px; line-height: 1.35;">
            <strong>Warning:</strong> {p_text}
        </li>
        """

    # Quick Takeaways HTML
    takeaways_html = ""
    for t in data.get("quick_takeaways", []):
        t_text = html.escape(str(t))
        takeaways_html += f"""
        <li style="margin-bottom: 4px; color: #1e293b; font-size: 9.5px; line-height: 1.35;">
            {t_text}
        </li>
        """

    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{
            font-family: Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
        }}
        .header {{
            background: #0f172a;
            color: #ffffff;
            padding: 12px 18px;
            border-radius: 6px;
            margin-bottom: 12px;
        }}
        .badge {{
            font-size: 8px;
            font-weight: bold;
            color: #2dd4bf;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }}
        .title {{
            font-size: 18px;
            font-weight: bold;
            color: #f8fafc;
            margin: 4px 0 2px;
        }}
        .meta {{
            font-size: 8px;
            color: #94a3b8;
        }}
        .summary-box {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 10px;
            line-height: 1.45;
            color: #334155;
            margin-bottom: 12px;
        }}
        .section-title {{
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
            padding-bottom: 2px;
            border-bottom: 1px solid #cbd5e1;
        }}
        .grid {{
            display: table;
            width: 100%;
        }}
        .col {{
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 8px;
        }}
        .col:last-child {{
            padding-right: 0;
            padding-left: 8px;
        }}
        .footer {{
            margin-top: 14px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 8px;
            color: #64748b;
            text-align: center;
        }}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="badge">NEXORA ADAPTIVE MASTERY ENGINE • STUDY CHEATSHEET</div>
        <div class="title">{title}</div>
        <div class="meta">Generated from interactive lesson discussion • {date_str}</div>
      </div>

      <div class="summary-box">
        <strong style="color: #0d9488;">Session Takeaway:</strong> {summary}
      </div>

      <div class="grid">
        <div class="col">
          {f'<div class="section-title" style="color: #0d9488;">Core Concepts & Definitions</div>{concepts_html}' if concepts_html else ''}
          {f'<div class="section-title" style="color: #2563eb; margin-top: 10px;">Formulas, Syntax & Invariants</div>{rules_html}' if rules_html else ''}
        </div>
        <div class="col">
          {f'<div class="section-title" style="color: #7e22ce;">Key Discussion Q&A</div>{qa_html}' if qa_html else ''}
          {f'<div class="section-title" style="color: #dc2626; margin-top: 10px;">Common Pitfalls to Avoid</div><ul style="margin: 0; padding-left: 14px;">{pitfalls_html}</ul>' if pitfalls_html else ''}
          {f'<div class="section-title" style="color: #047857; margin-top: 10px;">Quick Exam Recall Tips</div><ul style="margin: 0; padding-left: 14px;">{takeaways_html}</ul>' if takeaways_html else ''}
        </div>
      </div>

      <div class="footer">
        Generated by Nexora • Grounded in student-tutor mastery dialogues
      </div>
    </body>
    </html>
    """
    return full_html


def build_cheatsheet_pdf(
    topic: str,
    description: str,
    messages: List[Dict[str, Any]],
    llm: Any = None,
    output_language: str = "auto",
) -> bytes:
    """End-to-end generator returning binary PDF bytes."""
    data = extract_cheatsheet_data(topic, description, messages, llm, output_language)
    html_content = render_cheatsheet_html(data)

    doc = pymupdf.open()
    # A4 standard dimensions: 595 x 842 points
    page = doc.new_page(width=595, height=842)
    rect = pymupdf.Rect(36, 36, 559, 806)

    # Render HTML content inside the page bounds
    page.insert_htmlbox(rect, html_content)
    return doc.tobytes()
