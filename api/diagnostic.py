from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Dict, Any
from models.diagnostic import (
    DiagnosticGenerateRequest,
    DiagnosticGenerateResponse,
    DiagnosticQuestionClientView,
    DiagnosticSubmitRequest,
    DiagnosticSubmitResponse
)
from database.database import (
    save_diagnostic,
    get_diagnostic,
    save_diagnostic_attempt,
    get_topic_by_name
)
from services.retrieval_service import RetrievalService
from agents.diagnostic_agent import (
    DiagnosticAgent,
    InsufficientGroundingError,
    DiagnosticGenerationError
)

router = APIRouter(prefix="/api/diagnostic", tags=["Diagnostic"])

retrieval_service = RetrievalService()
diagnostic_agent = DiagnosticAgent()

@router.post("/generate")
async def generate_diagnostic(payload: DiagnosticGenerateRequest):
    """
    Generates a grounded 5-question diagnostic for the given topic:
    1. Validates topic presence.
    2. Retrieves relevant source chunks from ChromaDB.
    3. Checks sufficient grounding.
    4. Calls DiagnosticAgent.
    5. Validates schema.
    6. Persists diagnostic and questions in SQLite.
    7. Returns client view of the questions.
    """
    topic_name = payload.topic.strip()
    if not topic_name:
        raise HTTPException(status_code=400, detail="Topic name must be provided.")

    # 1. Retrieve source chunks
    source_chunks = retrieval_service.get_all_chunks_for_topic(topic_name)
    if not source_chunks:
        source_chunks = retrieval_service.retrieve(topic=topic_name, top_k=10)

    # 2. Insufficient grounding check
    if not source_chunks:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "INSUFFICIENT_GROUNDING",
                "message": "The available topic source does not contain enough information to generate the diagnostic."
            }
        )

    # Retrieve known subconcepts if topic is registered
    topic_record = get_topic_by_name(topic_name)
    known_subconcepts = topic_record.get("subconcepts") if topic_record else None

    try:
        # 3. Call Diagnostic Agent
        diagnostic_res = diagnostic_agent.generate_diagnostic(
            topic=topic_name,
            source_context=source_chunks,
            allowed_subconcepts=known_subconcepts
        )

        # 4. Save to Database
        # First ensure topic exists in DB
        topic_record = get_topic_by_name(topic_name)
        topic_id = topic_record["id"] if topic_record else f"topic_{topic_name[:8]}"

        questions_dict = [q.model_dump() for q in diagnostic_res.questions]
        diag_id = save_diagnostic(topic_id=topic_id, questions=questions_dict)

        # 5. Build client view of questions (exclude correct_answer/explanation during quiz)
        client_questions = [
            DiagnosticQuestionClientView(
                id=q.id,
                question=q.question,
                options=q.options,
                subconcept=q.subconcept
            )
            for q in diagnostic_res.questions
        ]

        return DiagnosticGenerateResponse(
            diagnostic_id=diag_id,
            topic=topic_name,
            questions=client_questions
        )

    except InsufficientGroundingError as e:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": e.code,
                "message": e.message
            }
        )
    except DiagnosticGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnostic generation failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

@router.post("/{diagnostic_id}/submit", response_model=DiagnosticSubmitResponse)
async def submit_diagnostic(diagnostic_id: str, payload: DiagnosticSubmitRequest):
    """
    Submits student responses for a diagnostic assessment:
    - Stores the answers, question IDs, timestamp, and student ID.
    - Does NOT calculate mastery or diagnose misconceptions yet (reserved for subsequent agents).
    """
    # Verify diagnostic exists
    diag = get_diagnostic(diagnostic_id)
    if not diag:
        raise HTTPException(status_code=404, detail=f"Diagnostic assessment {diagnostic_id} not found.")

    if not payload.answers:
        raise HTTPException(status_code=400, detail="Answers must not be empty.")

    # Persist attempt and answers
    attempt_id = save_diagnostic_attempt(
        diagnostic_id=diagnostic_id,
        student_id=payload.student_id,
        answers=payload.answers
    )

    return DiagnosticSubmitResponse(
        status="success",
        message="Diagnostic submitted successfully.",
        attempt_id=attempt_id,
        diagnostic_id=diagnostic_id,
        student_id=payload.student_id,
        questions_answered=len(payload.answers),
        feedback_notice="Your responses have been recorded. The next stage will analyse your response patterns."
    )

@router.get("/{diagnostic_id}")
async def get_diagnostic_details(diagnostic_id: str):
    """Returns stored diagnostic details for verification."""
    diag = get_diagnostic(diagnostic_id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnostic not found.")
    return diag
