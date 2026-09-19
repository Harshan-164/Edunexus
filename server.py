import os
import uuid
import datetime
import logging
import json
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from backend.memory.learner_memory import LearnerMemory
from backend.memory.chat_memory import ChatMemory
from backend.memory.rag_scope import is_explicit_document_request, select_relevant_document_chunks
from backend.memory.syllabus_memory import SyllabusMemory
from backend.media.lesson_media import normalize_flashcards, normalize_storyboard, parse_json_response, render_animated_lesson
from backend.graph.workflow import create_workflow, is_answer_correct
from backend.agents.diagnostic import DiagnosticAgent, DiagnosisAgent, DiagnosticAndDiagnosisAgent
from backend.agents.remediation import RemediationAgent
from backend.agents.verification import VerificationAgent


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EDUNEXUS-SERVER")

app = FastAPI(title="EDUNEXUS Adaptive Mastery Engine", version="2.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Services
learner_memory = LearnerMemory()
chat_memory = ChatMemory()
syllabus_memory = SyllabusMemory()
from openai import OpenAI


class LLMWrapper:
    def __init__(self, client, model_name):
        self.client = client
        self.chat = client.chat
        self.model_name = model_name

    def invoke(self, prompt: str) -> str:
        try:
            res = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            return res.choices[0].message.content
        except Exception as e:
            return f"Mock response for prompt: {prompt[:50]}..."

def get_llm():
    api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("OPENAI_API_KEY", "mock-key")
    model_name = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
    base_url = "https://integrate.api.nvidia.com/v1" if os.getenv("NVIDIA_API_KEY") else None
    
    client = OpenAI(base_url=base_url, api_key=api_key)
    return LLMWrapper(client, model_name)

llm = get_llm()

diagnostic_agent = DiagnosticAgent(llm)
diagnosis_agent = DiagnosisAgent(llm)
remediation_agent = RemediationAgent(llm)
verification_agent = VerificationAgent(llm)
workflow = create_workflow(llm, learner_memory)

# UPLOAD DIR & STATIC DIR
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "backend", "data", "uploads")
MEDIA_DIR = os.path.join(os.path.dirname(__file__), "backend", "data", "generated")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def read_root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "EDUNEXUS API running."}

# -------------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------------
class LearnChatRequest(BaseModel):
    student_id: str = "student_1"
    topic: str
    message: str
    document_name: Optional[str] = None
    session_id: Optional[str] = None
    response_mode: str = "text"

class CreateChatSessionRequest(BaseModel):
    student_id: str = "student_1"
    title: str
    description: str

class SaveEventRequest(BaseModel):
    student_id: str = "student_1"
    topic: str
    sub_concept: Optional[str] = None
    source_type: str = "freeform"
    document_name: Optional[str] = None
    mode: str = "learn"
    status: str = "EXPOSED"

class CheckUnderstandingRequest(BaseModel):
    student_id: str = "student_1"
    topic: str
    document_name: Optional[str] = None

class ReviseStartRequest(BaseModel):
    student_id: str = "student_1"
    topic: str

class ReviseVerifyRequest(BaseModel):
    student_id: str = "student_1"
    topic: str
    answers: Dict[str, str]
    questions: List[Dict[str, Any]]

class TestStartRequest(BaseModel):
    student_id: str = "student_1"
    topic: str
    document_name: Optional[str] = None
    custom_questions: Optional[List[Dict[str, Any]]] = None

class TestSubmitRequest(BaseModel):
    student_id: str = "student_1"
    topic: str
    attempt_id: str
    answers: Dict[str, str]
    questions: List[Dict[str, Any]]


RAG_RELEVANCE_THRESHOLD = float(os.getenv("RAG_RELEVANCE_THRESHOLD", "0.42"))

# -------------------------------------------------------------------
# HELPER FUNCTIONS FOR SAFE VISUALIZATIONS
# -------------------------------------------------------------------
def generate_safe_visualization(topic: str, text: str = "") -> Optional[Dict[str, Any]]:
    topic_lower = (topic or "").lower().strip()
    
    if "python slicing" in topic_lower or ("slicing" in topic_lower and "array" in topic_lower):
        return {
            "type": "array_indexing",
            "title": "Array Indexing & Slicing",
            "elements": ["P", "y", "t", "h", "o", "n"],
            "positive_indices": [0, 1, 2, 3, 4, 5],
            "negative_indices": [-6, -5, -4, -3, -2, -1],
            "highlight_slice": [1, 4],
            "explanation": "Slice [1:4] extracts indices 1, 2, and 3 ('y', 't', 'h'). Stop index 4 is excluded."
        }
    return None

# -------------------------------------------------------------------
# API ENDPOINTS
# -------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "EDUNEXUS Mastery Engine"}

@app.get("/api/learner/{student_id}")
def get_learner_profile(student_id: str):
    return learner_memory.get_learner_summary(student_id)

@app.get("/api/learn/sessions/{student_id}")
def list_chat_sessions(student_id: str):
    return {"sessions": chat_memory.list_sessions(student_id)}

@app.post("/api/learn/sessions", status_code=status.HTTP_201_CREATED)
def create_chat_session(req: CreateChatSessionRequest):
    title = req.title.strip()
    description = req.description.strip()
    if not title:
        raise HTTPException(status_code=400, detail="A lesson title is required.")
    if not description:
        raise HTTPException(status_code=400, detail="A short lesson description is required.")
    learner_memory.create_student(req.student_id)
    return chat_memory.create_session(req.student_id, title[:120], description[:500])

@app.get("/api/learn/session/{session_id}")
def get_chat_session(session_id: str):
    session = chat_memory.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return session

@app.delete("/api/learn/session/{session_id}")
def delete_chat_session(session_id: str):
    success = chat_memory.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return {"status": "success", "message": f"Chat session {session_id} deleted."}

@app.post("/api/learn/session/{session_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_session_document(session_id: str, file: UploadFile = File(...)):
    session = chat_memory.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    display_name = os.path.basename(file.filename or "document.pdf")
    extension = os.path.splitext(display_name)[1].lower()
    if extension not in {".pdf", ".txt"}:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Files must be 20 MB or smaller.")

    stored_name = f"{session_id}_{uuid.uuid4().hex[:8]}_{display_name}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)
    with open(file_path, "wb") as destination:
        destination.write(content)

    try:
        if extension == ".pdf":
            syllabus_memory.ingest_pdf(file_path)
        else:
            text_content = content.decode("utf-8", errors="ignore")
            syllabus_memory.add_text(text_content, source_name=stored_name)
        return chat_memory.add_attachment(
            session_id=session_id,
            display_name=display_name,
            stored_name=stored_name,
            file_path=file_path,
            content_type=file.content_type,
            size=len(content),
        )
    except Exception as exc:
        if os.path.exists(file_path):
            os.remove(file_path)
        logger.error("Error ingesting session file %s: %s", display_name, exc)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}")

@app.get("/api/learn/attachments/{attachment_id}/download")
def download_session_attachment(attachment_id: str):
    attachment = chat_memory.get_attachment(attachment_id)
    if not attachment or not os.path.isfile(attachment["file_path"]):
        raise HTTPException(status_code=404, detail="Attachment not found.")
    return FileResponse(
        attachment["file_path"],
        media_type=attachment.get("content_type") or "application/octet-stream",
        filename=attachment["display_name"],
    )

@app.get("/api/learn/media/{filename}")
def get_generated_lesson_media(filename: str):
    safe_name = os.path.basename(filename)
    if safe_name != filename or not safe_name.endswith((".mp4", ".gif")):
        raise HTTPException(status_code=400, detail="Invalid media filename.")
    media_path = os.path.join(MEDIA_DIR, safe_name)
    if not os.path.isfile(media_path):
        raise HTTPException(status_code=404, detail="Generated media not found.")
    media_type = "video/mp4" if safe_name.endswith(".mp4") else "image/gif"
    return FileResponse(media_path, media_type=media_type)

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not (file.filename.endswith(".pdf") or file.filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    try:
        if file.filename.endswith(".pdf"):
            syllabus_memory.ingest_pdf(file_path)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text_content = f.read()
            chunks = syllabus_memory._chunk_text(text_content, 1, file.filename)
            embeddings = syllabus_memory.model.encode([c["text"] for c in chunks], normalize_embeddings=True)
            syllabus_memory.index.add(embeddings)
            syllabus_memory.metadata.extend(chunks)
            syllabus_memory.save()
            
        return {
            "status": "success",
            "document_name": file.filename,
            "message": f"Successfully ingested {file.filename} into RAG vector store."
        }
    except Exception as e:
        logger.error(f"Error ingesting file {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.post("/api/learn/chat")
async def learn_chat(req: LearnChatRequest):
    learner_memory.create_student(req.student_id)

    session = None
    attachments = []
    conversation = []
    if req.session_id:
        session = chat_memory.get_session(req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found.")
        if session["student_id"] != req.student_id:
            raise HTTPException(status_code=403, detail="This chat belongs to a different learner.")
        attachments = session["attachments"]
        conversation = chat_memory.recent_messages(req.session_id, limit=12)

    grounded_context = ""
    is_grounded = False
    document_names = [attachment["stored_name"] for attachment in attachments]
    if req.document_name and req.document_name not in document_names:
        document_names.append(req.document_name)

    user_query_lower = req.message.lower()
    explicitly_asking_doc = is_explicit_document_request(user_query_lower)

    if document_names and syllabus_memory.index is not None and syllabus_memory.index.ntotal:
        all_meta = syllabus_memory.metadata
        matching_chunks = [item for item in all_meta if item.get("document") in document_names]
        if matching_chunks:
            query_emb = syllabus_memory.model.encode([req.message], normalize_embeddings=True)
            distances, indices = syllabus_memory.index.search(
                query_emb,
                k=syllabus_memory.index.ntotal,
            )
            relevant_texts = select_relevant_document_chunks(
                metadata=all_meta,
                scores=distances[0],
                indices=indices[0],
                allowed_documents=document_names,
                query=req.message,
                explicit_document_request=explicitly_asking_doc,
                threshold=0.28 if explicitly_asking_doc else RAG_RELEVANCE_THRESHOLD,
            )
            if relevant_texts:
                grounded_context = "\n---\n".join(relevant_texts)
                is_grounded = True

    conversation_text = "\n".join(
        f"{'Student' if message['sender'] == 'user' else 'Tutor'}: {message['text']}"
        for message in conversation
    )
    session_context = ""
    if session:
        session_context = (
            f"Lesson: {session['title']}\n"
            f"Learning goal: {session['description']}\n"
        )
    history_context = f"Recent conversation history:\n{conversation_text}\n\n" if conversation_text else ""

    formatting_rules = (
        "Formatting rules:\n"
        "- Use bold markdown (**concept**) for emphasis and key terms.\n"
        "- Use code blocks or inline code (`code`) for technical terms or code.\n"
        "- Use standard numbered (1.) or dashed (-) lists instead of raw asterisks for bullet points.\n"
        "- Do not output raw asterisks without a markdown purpose."
    )

    response_mode = req.response_mode.lower().strip()
    if response_mode not in {"text", "flashcards", "video"}:
        raise HTTPException(status_code=400, detail="Response mode must be text, flashcards, or video.")

    if is_grounded:
        knowledge_prompt = (
            f"You are the EduNexus AI tutor. Continue the lesson naturally and maintain conversational flow using the chat history.\n"
            f"{session_context}{history_context}"
            f"Reference Material from Uploaded Document:\n{grounded_context}\n\n"
            f"Student Question: {req.message}\n\n"
            f"Answer the student's question accurately using the relevant material from their uploaded document.\n"
        )
    else:
        knowledge_prompt = (
            f"You are the EduNexus AI tutor. Answer the student's current question directly using general knowledge. "
            f"Use prior turns only when they are relevant to the current question.\n"
            f"{session_context}{history_context}"
            f"Student Question: {req.message}\n\n"
            f"The uploaded files are not relevant to this question. Ignore them completely: do not mention them, "
            f"do not discuss their subject, and do not ask permission to answer outside them. "
            f"Prioritize the current question even when it differs from the lesson title or earlier conversation.\n"
        )

    if req.session_id:
        chat_memory.add_message(req.session_id, "user", req.message)

    content_data = None
    if response_mode == "flashcards":
        prompt = knowledge_prompt + (
            "Create interactive teaching flashcards for the concept. Keep every point crisp and self-contained. "
            "Use a visual only when it materially improves understanding: bar or line for numeric relationships, "
            "process for sequences, otherwise none. Return ONLY valid JSON with this exact shape:\n"
            '{"title":"deck title","cards":[{"title":"card title","summary":"one-sentence idea",'
            '"prompt":"short front-side prompt","points":["point 1","point 2"],'
            '"visual":{"type":"none|bar|line|process","title":"visual title",'
            '"labels":["A","B"],"values":[1,2],"steps":["step 1","step 2"]}}]}\n'
            "Generate 4 to 7 cards. Do not include markdown or commentary outside the JSON."
        )
        raw_response = llm.invoke(prompt)
        raw_text = raw_response.content if hasattr(raw_response, "content") else str(raw_response)
        try:
            content_data = normalize_flashcards(parse_json_response(raw_text), req.message)
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            logger.warning("Flashcard JSON fallback used: %s", exc)
            content_data = normalize_flashcards({}, req.message)
        answer_text = f"Interactive flashcards: {content_data['title']}"
    elif response_mode == "video":
        prompt = knowledge_prompt + (
            "Design a concise animated teaching storyboard. Each scene must communicate one idea visually with very little text. "
            "The storyboard will be converted into safe Manim code when Manim is available, with local video and animation fallbacks. "
            "Return ONLY valid JSON with this exact shape:\n"
            '{"title":"lesson title","scenes":[{"title":"scene title","caption":"short explanation",'
            '"points":["animated point 1","animated point 2"],"accent":"teal|blue|violet|amber"}]}\n'
            "Generate 3 to 6 scenes. Do not include markdown, Python, or commentary outside the JSON."
        )
        raw_response = llm.invoke(prompt)
        raw_text = raw_response.content if hasattr(raw_response, "content") else str(raw_response)
        try:
            storyboard = normalize_storyboard(parse_json_response(raw_text), req.message)
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            logger.warning("Storyboard JSON fallback used: %s", exc)
            storyboard = normalize_storyboard({}, req.message)
        content_data = render_animated_lesson(storyboard, MEDIA_DIR)
        answer_text = f"Animated lesson: {content_data['title']}"
    else:
        prompt = knowledge_prompt + formatting_rules
        response_msg = llm.invoke(prompt)
        answer_text = response_msg.content if hasattr(response_msg, 'content') else str(response_msg)

    visualization = generate_safe_visualization(req.topic, answer_text) if not req.session_id and response_mode == "text" else None
    saved_message = None
    if req.session_id:
        saved_message = chat_memory.add_message(
            req.session_id,
            "tutor",
            answer_text,
            visualization=None,
            is_grounded=is_grounded,
            content_type=response_mode,
            content_data=content_data,
        )

    primary_document = attachments[0]["display_name"] if attachments else req.document_name
    learner_memory.save_learning_event(
        student_id=req.student_id,
        topic=req.topic,
        source_type="uploaded_document" if primary_document else "freeform",
        document_name=primary_document,
        mode="learn",
        status="EXPOSED",
        details=req.message
    )

    return {
        "response": answer_text,
        "visualization": visualization,
        "is_grounded": is_grounded,
        "document_name": primary_document,
        "content_type": response_mode,
        "content_data": content_data,
        "message": saved_message,
    }

@app.post("/api/learn/save_event")
def save_learning_event(req: SaveEventRequest):
    result = learner_memory.save_learning_event(
        student_id=req.student_id,
        topic=req.topic,
        sub_concept=req.sub_concept,
        source_type=req.source_type,
        document_name=req.document_name,
        mode=req.mode,
        status=req.status
    )
    return result

@app.post("/api/learn/check_understanding")
async def check_understanding(req: CheckUnderstandingRequest):
    # Retrieve grounded context if document
    context = ""
    if req.document_name:
        all_meta = syllabus_memory.metadata
        matching = [c["text"] for c in all_meta if c.get("document") == req.document_name]
        if matching:
            context = "\n---\n".join(matching[:3])
            
    if not context:
        chunks = syllabus_memory.search(query=req.topic, top_k=3)
        if chunks:
            context = "\n---\n".join([c["text"] for c in chunks])
            
    try:
        diag = diagnostic_agent.generate_diagnostic(
            topic=req.topic,
            source_context=context if context else f"General computer science topic: {req.topic}"
        )
        # Take 2 questions for quick check
        questions = [q.model_dump() for q in diag.questions[:2]]
        return {"topic": req.topic, "questions": questions}
    except Exception as e:
        logger.error(f"Error generating check understanding quiz: {e}")
        # Return fallback structured questions
        return {
            "topic": req.topic,
            "questions": [
                {
                    "id": "q1",
                    "sub_concept": f"{req.topic} Core",
                    "question": f"What is the primary purpose of {req.topic}?",
                    "options": [
                        "To structure and manipulate data efficiently",
                        "To format terminal output text",
                        "To handle network socket connections",
                        "To compile C extensions"
                    ],
                    "correct_answer": "Option 1: To structure and manipulate data efficiently",
                    "explanation": f"{req.topic} organizes data for computational efficiency."
                },
                {
                    "id": "q2",
                    "sub_concept": f"{req.topic} Behavior",
                    "question": f"Which statement best describes {req.topic}?",
                    "options": [
                        "It provides deterministic bounds for data operations",
                        "It only works on floating point values",
                        "It requires explicit memory deallocation",
                        "It replaces database indexes"
                    ],
                    "correct_answer": "Option 1: It provides deterministic bounds for data operations",
                    "explanation": f"{req.topic} operates under deterministic computational rules."
                }
            ]
        }

@app.get("/api/revise/topics/{student_id}")
def get_revision_topics(student_id: str):
    return learner_memory.get_topics_for_revision(student_id)

@app.post("/api/revise/start")
async def start_revision(req: ReviseStartRequest):
    # Fetch learner context & misconceptions
    context_str = learner_memory.get_learner_context(req.student_id, req.topic)
    
    prompt = (
        f"You are EDUNEXUS Revision Specialist.\n"
        f"Generate a targeted revision lesson for topic '{req.topic}' based on the student's prior history:\n"
        f"{context_str}\n\n"
        f"Focus specifically on addressing past misconceptions or weak areas. Be concise, insightful, and practical."
    )
    
    response_msg = llm.invoke(prompt)
    revision_text = response_msg.content if hasattr(response_msg, 'content') else str(response_msg)
    
    # Generate 2 targeted revision verification questions
    try:
        diag = diagnostic_agent.generate_diagnostic(
            topic=req.topic,
            source_context=context_str if "Sub-concept performance" in context_str else f"Topic: {req.topic}"
        )
        questions = [q.model_dump() for q in diag.questions[:2]]
    except Exception:
        questions = [
            {
                "id": "rq1",
                "sub_concept": f"{req.topic} Misconception Check",
                "question": f"In {req.topic}, which of the following avoids the common pitfall?",
                "options": [
                    "Remembering boundary exclusions and zero-based indexing",
                    "Ignoring container bounds",
                    "Using non-deterministic keys",
                    "Skipping type coercion"
                ],
                "correct_answer": "Option 1: Remembering boundary exclusions and zero-based indexing",
                "explanation": "Correct index handling avoids common boundary misconceptions."
            },
            {
                "id": "rq2",
                "sub_concept": f"{req.topic} Core Property",
                "question": f"What key property must be respected during {req.topic} operation?",
                "options": [
                    "State consistency across iterations",
                    "Unlimited memory allocation",
                    "Ignoring exception boundaries",
                    "Static compilation flags"
                ],
                "correct_answer": "Option 1: State consistency across iterations",
                "explanation": "Maintaining invariant state ensures robust execution."
            }
        ]
        
    return {
        "topic": req.topic,
        "revision_lesson": revision_text,
        "questions": questions
    }

@app.post("/api/revise/verify")
async def verify_revision(req: ReviseVerifyRequest):
    score = 0.0
    total = len(req.questions)
    results = []
    
    for i, q in enumerate(req.questions):
        q_id = q.get("id", f"rq{i+1}")
        user_ans = req.answers.get(q_id, "")
        correct_ans = q.get("correct_answer", "")
        options = q.get("options", [])
        
        correct = is_answer_correct(user_ans, correct_ans, options)
        if correct:
            score += 1.0
            
        results.append({
            "question": q.get("question"),
            "sub_concept": q.get("sub_concept"),
            "user_answer": user_ans,
            "correct_answer": correct_ans,
            "is_correct": correct,
            "explanation": q.get("explanation")
        })
        
    final_acc = score / total if total > 0 else 0.0
    passed = final_acc >= 1.0
    
    if passed:
        # Mark mastered in DB
        for r in results:
            sc = r.get("sub_concept", req.topic)
            learner_memory.update_subconcept_mastery(req.student_id, req.topic, sc, is_correct=True)
            learner_memory.resolve_misconception(req.student_id, req.topic, sc)
        learner_memory.save_learning_event(req.student_id, req.topic, mode="revise", status="MASTERED")
        return {
            "passed": True,
            "score": final_acc,
            "status": "MASTERED",
            "message": f"Congratulations! You answered {int(score)}/{total} correctly and have MASTERED {req.topic}!",
            "results": results
        }
    else:
        # Trigger remediation for failed subconcept
        failed_q = [r for r in results if not r["is_correct"]][0]
        sub_concept = failed_q.get("sub_concept", req.topic)
        
        rem_res = remediation_agent.remediate(
            topic=req.topic,
            sub_concept=sub_concept,
            misconception=f"Failed revision check on {sub_concept}. Student selected: '{failed_q['user_answer']}'",
            student_answer=failed_q['user_answer'],
            correct_answer=failed_q['correct_answer'],
            source_context=failed_q.get('explanation', '')
        )
        
        ver_q = verification_agent.generate_verification_question(
            topic=req.topic,
            sub_concept=sub_concept,
            misconception=rem_res.misconception,
            strategy=rem_res.remediation_strategy
        )
        
        return {
            "passed": False,
            "score": final_acc,
            "status": "NEEDS_REMEDIATION",
            "message": f"Score {int(score)}/{total}. Let's remediate your understanding of {sub_concept}.",
            "results": results,
            "remediation": rem_res.model_dump() if hasattr(rem_res, 'model_dump') else rem_res,
            "verification_question": ver_q.model_dump() if hasattr(ver_q, 'model_dump') else ver_q
        }

@app.post("/api/test/start")
async def start_test(req: TestStartRequest):
    learner_memory.create_student(req.student_id)
    
    if req.custom_questions and len(req.custom_questions) > 0:
        # Validate custom questions
        valid_qs = []
        for i, cq in enumerate(req.custom_questions):
            if "question" in cq and "options" in cq:
                valid_qs.append({
                    "id": f"cq_{i+1}",
                    "sub_concept": cq.get("sub_concept", f"{req.topic} Custom"),
                    "question": cq["question"],
                    "options": cq["options"],
                    "correct_answer": cq.get("correct_answer", cq["options"][0]),
                    "explanation": cq.get("explanation", "Custom question validation.")
                })
        if valid_qs:
            attempt_id = f"att_{uuid.uuid4().hex[:8]}"
            learner_memory.create_attempt(attempt_id, req.student_id, req.topic)
            return {
                "attempt_id": attempt_id,
                "topic": req.topic,
                "questions": valid_qs
            }

    # Generate 5-question diagnostic
    context = ""
    if req.document_name:
        all_meta = syllabus_memory.metadata
        matching = [c["text"] for c in all_meta if c.get("document") == req.document_name]
        if matching:
            context = "\n---\n".join(matching[:5])
            
    if not context:
        chunks = syllabus_memory.search(query=req.topic, top_k=5)
        if chunks:
            context = "\n---\n".join([c["text"] for c in chunks])

    try:
        diag = diagnostic_agent.generate_diagnostic(
            topic=req.topic,
            source_context=context if context else f"Core subject: {req.topic}"
        )
        questions = [q.model_dump() for q in diag.questions]
    except Exception as e:
        logger.error(f"Error generating 5-question test: {e}")
        # Fallback 5 questions
        subconcepts = ["Syntax & Notation", "Indexing & Boundaries", "Operations & Mutability", "Complexity & Performance", "Common Errors"]
        questions = [
            {
                "id": f"q_{i+1}",
                "sub_concept": sc,
                "question": f"Regarding {req.topic} ({sc}), which option is correct?",
                "options": [
                    "Standard deterministic operation applies",
                    "Non-deterministic memory overwrite occurs",
                    "Types are dynamically cast to float",
                    "Requires explicit global lock"
                ],
                "correct_answer": "Option 1: Standard deterministic operation applies",
                "explanation": f"Evaluates core principle of {sc} in {req.topic}."
            }
            for i, sc in enumerate(subconcepts)
        ]

    attempt_id = f"att_{uuid.uuid4().hex[:8]}"
    learner_memory.create_attempt(attempt_id, req.student_id, req.topic)
    
    return {
        "attempt_id": attempt_id,
        "topic": req.topic,
        "questions": questions
    }

@app.post("/api/test/submit")
async def submit_test(req: TestSubmitRequest):
    # Execute deterministic scoring & analysis
    score = 0.0
    total = len(req.questions)
    results = []
    
    attempt = learner_memory.create_attempt(req.attempt_id, req.student_id, req.topic)
    
    for q in req.questions:
        q_id = q.get("id")
        user_ans = req.answers.get(q_id, "")
        correct_ans = q.get("correct_answer", "")
        options = q.get("options", [])
        sub_concept = q.get("sub_concept", req.topic)
        
        correct = is_answer_correct(user_ans, correct_ans, options)
        if correct:
            score += 1.0
            
        learner_memory.save_question_result(
            attempt_id=req.attempt_id,
            sub_concept=sub_concept,
            question=q.get("question"),
            student_answer=user_ans,
            correct_answer=correct_ans,
            is_correct=correct,
            question_id=q_id
        )
        
        learner_memory.update_subconcept_mastery(
            student_id=req.student_id,
            topic=req.topic,
            sub_concept=sub_concept,
            is_correct=correct
        )
        
        results.append({
            "question_id": q_id,
            "sub_concept": sub_concept,
            "user_answer": user_ans,
            "correct_answer": correct_ans,
            "is_correct": correct,
            "explanation": q.get("explanation")
        })

    accuracy = score / total if total > 0 else 0.0
    learner_memory.complete_attempt(req.attempt_id)
    
    # Analysis & Misconception detection
    thinking_process = [
        f"Evaluated {total} diagnostic responses for student '{req.student_id}'.",
        f"Calculated accuracy: {int(accuracy * 100)}% ({int(score)}/{total} correct)."
    ]
    
    misconceptions_detected = []
    failed_items = [r for r in results if not r["is_correct"]]
    
    if failed_items:
        thinking_process.append(f"Identified {len(failed_items)} weak subconcepts requiring diagnostic analysis.")
        try:
            diag_res = diagnosis_agent.diagnose(
                topic=req.topic,
                syllabus_context=f"Topic: {req.topic}",
                question_results=results
            )
            if hasattr(diag_res, 'has_misconception') and diag_res.has_misconception:
                misconceptions_detected.append({
                    "sub_concept": getattr(diag_res, 'sub_concept', req.topic),
                    "misconception": getattr(diag_res, 'misconception', 'Conceptual error detected'),
                    "evidence": getattr(diag_res, 'evidence', 'Failed diagnostic item')
                })
        except Exception as e:
            logger.warning(f"Diagnosis agent exception: {e}")
            for item in failed_items:
                misconceptions_detected.append({
                    "sub_concept": item["sub_concept"],
                    "misconception": f"Student struggled with {item['sub_concept']} concept in {req.topic}",
                    "evidence": item["user_answer"]
                })

                learner_memory.save_misconception(
                    student_id=req.student_id,
                    topic=req.topic,
                    sub_concept=sc,
                    misconception=diag_res.misconception,
                    evidence=diag_res.evidence
                )
                thinking_process.append(f"Misconception flagged on '{sc}': {diag_res.misconception}")

    if not misconceptions_detected:
        thinking_process.append("No critical misconceptions detected. Mastery achieved!")
        learner_memory.save_learning_event(req.student_id, req.topic, mode="test", status="MASTERED")
        return {
            "status": "MASTERED",
            "score": accuracy,
            "thinking_process": thinking_process,
            "results": results,
            "misconceptions": []
        }

    # Generate Remediation & Verification for primary misconception
    primary = misconceptions_detected[0]
    rem = remediation_agent.remediate(
        topic=req.topic,
        sub_concept=primary["sub_concept"],
        misconception=primary["misconception"],
        student_answer=primary.get("evidence", ""),
        correct_answer="",
        source_context=""
    )
    
    ver_q = verification_agent.generate_verification_question(
        topic=req.topic,
        sub_concept=primary["sub_concept"],
        misconception=primary["misconception"],
        strategy=getattr(rem, "explanation", getattr(rem, "remediation_strategy", ""))
    )
    
    return {
        "status": "NEEDS_REMEDIATION",
        "score": accuracy,
        "thinking_process": thinking_process,
        "results": results,
        "misconceptions": misconceptions_detected,
        "remediation": rem.model_dump() if hasattr(rem, 'model_dump') else rem,
        "verification_question": ver_q.model_dump() if hasattr(ver_q, 'model_dump') else ver_q
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
