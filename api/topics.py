from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
from models.topic import TopicResponse, TopicIngestRequest
from database.database import list_all_topics, get_topic_by_name
from ingestion.document_ingestion import DocumentIngestion
from services.retrieval_service import RetrievalService

router = APIRouter(prefix="/api/topics", tags=["Topics"])

retrieval_service = RetrievalService()
document_ingester = DocumentIngestion(retrieval_service)

@router.get("", response_model=List[TopicResponse])
async def get_topics():
    """Returns all available syllabus topics with their subconcepts."""
    topics = list_all_topics()
    result = []
    for t in topics:
        chunk_count = retrieval_service.count_chunks_for_topic(t["name"])
        result.append(TopicResponse(
            id=t["id"],
            name=t["name"],
            subconcepts=t["subconcepts"],
            created_at=t["created_at"],
            chunk_count=chunk_count
        ))
    return result

@router.post("/ingest")
async def ingest_topic(payload: TopicIngestRequest):
    """
    Ingests raw text documentation for a topic:
    splits into chunks, generates embeddings, stores in ChromaDB, and updates topic registry.
    """
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Content must not be empty.")

    try:
        res = document_ingester.ingest_document(
            topic=payload.topic,
            content=payload.content,
            source_name=payload.source_filename or "manual_ingestion.txt",
            explicit_subconcepts=payload.subconcepts
        )
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_topic_file(
    topic: str = Form(...),
    file: UploadFile = File(...)
):
    """Uploads a .txt or .pdf file for a topic, extracts text and runs the RAG ingestion pipeline."""
    if not topic.strip():
        raise HTTPException(status_code=400, detail="Topic must not be empty.")

    file_bytes = await file.read()
    filename = file.filename or "uploaded_file"

    if filename.endswith(".pdf"):
        content = document_ingester.extract_text_from_pdf(file_bytes)
    else:
        try:
            content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = file_bytes.decode("latin-1")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file.")

    try:
        res = document_ingester.ingest_document(
            topic=topic,
            content=content,
            source_name=filename
        )
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
