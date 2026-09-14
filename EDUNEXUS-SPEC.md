# AgentSpec — EDUNEXUS Adaptive Mastery Loop

**Team:** AGENT KHANS  
**Institution:** Madras Institute of Technology, Anna University  
**Department:** Computer Science and Engineering  
**Team members:** Shrine De Christiana JCR, Harshan S, Kavin R, Niruthiyan BJ, Kaushya Smirti  
**Submitted:** 15 September 2026

---

## 1. The setting

A university student preparing for an upcoming internal assessment or semester examination often revises one syllabus topic using notes, examples and practice questions. The student may know the broad topic but still carry one or two hidden misconceptions at the sub-concept level. Current revision tools usually tell the student whether an answer is correct, or give a general explanation, but they do not reliably identify the precise misunderstanding and verify whether it was actually repaired.

**Who exactly:** an undergraduate student revising one syllabus topic shortly before an examination.

**What they do today:** read notes, attempt practice questions, check answers and revisit the entire topic when they perform poorly.

**Why that is hard:** a low score does not reveal which specific misconception caused the error. The student may reread material they already understand, waste limited revision time and mistake familiarity with an explanation for actual mastery.

## 2. The problem this solves

Consider a student revising Python list slicing. The student can create lists, index elements and iterate correctly, but repeatedly believes that the stop index in a slice is inclusive. A normal quiz reports two answers as wrong and may show the correct output. The student sees that the answer was wrong but may not recognise that both mistakes come from the same underlying misconception.

The cost is not only the wrong answer. The student may revise the whole chapter, believe the issue has been understood after reading another explanation, and carry the same misconception into the examination. EDUNEXUS is designed to detect that repeated error pattern, isolate the weak sub-concept, provide targeted remediation and require new evidence before recording mastery.

## 3. What we are building

**Input:** one syllabus topic chosen by a student, a small topic knowledge source and the student's answers to a diagnostic quiz.

**Output:** a sub-concept mastery profile, a likely misconception when supported by the answers, a targeted micro-lesson and a verification result that either records mastery or routes the learner back through remediation.

**Never, however much a user wants it:** EDUNEXUS will not mark a topic as mastered merely because the learner asks, reads an explanation or says they understand. Mastery requires verification evidence.

**Why this is agentic, in our own words:** EDUNEXUS maintains learner state across steps and encounters, separates diagnosis, intervention and verification into steps that can succeed or fail independently, pauses for a learner decision, and contains a back-edge where failed verification sends the learner to an earlier remediation state. The next action is therefore determined by evidence collected during the run rather than by a fixed A → B → C sequence.

## 4. A complete walkthrough

One complete run for a student named Ananya revising **Python Lists — Indexing and Slicing**.

**Rules used in this walkthrough**

- The diagnostic quiz contains five questions.
- Every question is tagged to one or more sub-concepts.
- A sub-concept score below 60% is considered a candidate weakness.
- A misconception is recorded only when at least two relevant answer patterns support it.
- After diagnosis, the learner chooses **Revise now** or **Skip for now**.
- Verification uses two new questions on the same weak sub-concept.
- Verification mastery threshold: both questions correct.
- Maximum remediation cycles: two.
- Failing after two remediation cycles leaves the gap unresolved rather than forcing completion.

**Step 1 — topic selected**

```json
{
  "student_id": "ANU01",
  "topic": "Python Lists",
  "selected_subconcepts": [
    "indexing",
    "negative_indexing",
    "slicing",
    "mutability"
  ]
}