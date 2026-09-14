# AgentSpec — EDUNEXUS Adaptive Mastery Loop

**Team:** AGENT KHANS  
**Institution:** Madras Institute of Technology, Anna University  
**Department:** Computer Science and Engineering  
**Team members:** Shrine De Christiana JCR, Harshan S, Kavin R, Niruthiyan BJ, Kaushya Smirti  
**Submitted:** 15 September 2026  

---

> **Prototype focus:** One-Topic Revision Loop  
> **Core loop:** TEST → DIAGNOSE → INTERVENE → VERIFY → REPLAN  
> **Long-term vision:** EDUNEXUS — Multi-Agent Adaptive Learning and Career Intelligence Ecosystem

---

## 1. The setting

An undergraduate student preparing for an internal assessment or semester examination often has only a short revision window. They may understand most of a syllabus topic while carrying one small but persistent misconception — for example, understanding Python lists generally but repeatedly treating the stop index in slicing as inclusive.

Today, a student usually reads notes, attempts questions, checks a score and returns to the chapter when the score is low. The score reveals **that something went wrong**, but often not **what conceptual misunderstanding caused it**.

**Who exactly:** an undergraduate student revising one syllabus topic shortly before an examination.

**What they do today:** read notes, attempt practice questions, check answers and broadly revisit the topic when they perform poorly.

**Why that is hard:** several wrong answers can arise from one hidden misconception. Without identifying that common cause, the student may reread material they already understand, spend limited revision time inefficiently and mistake familiarity with an explanation for actual mastery.

---

## 2. The problem this solves

Consider Ananya, a student revising Python Lists. She understands list creation, indexing and mutability, but believes that the stop index in a Python slice is included.

For:

```python
a = [10, 20, 30, 40, 50]
print(a[1:4])
```

she answers:

```text
[20, 30, 40, 50]
```

A conventional quiz can mark the answer wrong and show `[20, 30, 40]`. But if another slicing question produces the same boundary error, those two mistakes contain more useful information than a score alone: they suggest a common misconception.

The problem EDUNEXUS addresses is therefore not simply **wrong answers**. It is the gap between **detecting an error and diagnosing, repairing and verifying the misconception behind it**.

Without that loop, a learner can read the correct explanation, feel familiar with it and move on while the misconception remains.

---

## 3. What we are building

**Input:** one bounded syllabus topic, a small trusted topic source and the learner's answers to a diagnostic quiz.

**Output:** an evidence-backed sub-concept mastery profile, a likely misconception where the answers support one, a targeted micro-intervention and a verification result that either records mastery or routes the learner backwards for another intervention.

**Never, however much a user wants it:** EDUNEXUS will not mark a sub-concept as mastered merely because the learner asks, says "I understand", or reads an explanation. Mastery requires new verification evidence.

**Why this is agentic, in our own words:** EDUNEXUS is not a fixed quiz → explanation pipeline. It maintains learner state, reasons over evidence from multiple steps, can pause and wait for a learner decision, and contains a back-edge where failed verification sends work to an earlier remediation state. What happens next depends on evidence produced during the run.

We call the three central mechanisms:

- **Misconception Fingerprint** — the evidence-backed record of a learner's recurring conceptual error.
- **Mastery Recovery Loop** — failed verification sends work backwards for a different intervention.
- **Longitudinal Mastery Memory** — later encounters use what EDUNEXUS previously established about that learner.

---

## 4. A complete walkthrough

One complete run for **Ananya**, revising **Python Lists — Indexing and Slicing**.

### Rules first

The prototype follows these rules:

- Diagnostic quiz: 5 questions.
- Every question is tagged to a sub-concept.
- A sub-concept below 60% becomes a candidate weakness.
- EDUNEXUS does not infer a misconception from one isolated wrong answer; the prototype requires at least two relevant answer patterns before storing a Misconception Fingerprint.
- After diagnosis, the learner chooses **Revise now** or **Skip for now**.
- Verification uses 2 new questions targeting the diagnosed sub-concept.
- Prototype verification threshold: 2/2 correct.
- Maximum remediation cycles for one diagnosed misconception: 2.
- If mastery is still not verified after the second remediation cycle, the gap remains unresolved rather than being forced into a "mastered" state.

### Step 1 — topic selected

```json
{
  "kind": "topic_selection",
  "student_id": "ANU01",
  "topic": "Python Lists",
  "subconcepts": [
    "indexing",
    "negative_indexing",
    "slicing",
    "mutability"
  ]
}
```

### Step 2 — diagnostic quiz

EDUNEXUS generates five questions grounded in the bounded topic source.

One question is:

```python
a = [10, 20, 30, 40, 50]
print(a[1:4])
```

Ananya answers:

```text
[20, 30, 40, 50]
```

Another slicing question produces the same type of boundary error.

Her diagnostic record becomes:

```json
{
  "kind": "diagnostic_attempt",
  "student_id": "ANU01",
  "topic": "Python Lists",
  "answers": [
    {"question_id": "Q1", "subconcept": "indexing", "correct": true},
    {"question_id": "Q2", "subconcept": "slicing", "correct": false},
    {"question_id": "Q3", "subconcept": "mutability", "correct": true},
    {"question_id": "Q4", "subconcept": "slicing", "correct": false},
    {"question_id": "Q5", "subconcept": "negative_indexing", "correct": true}
  ]
}
```

### Step 3 — analyse

Deterministic code calculates scores. The diagnosis step then examines the relevant wrong-answer evidence.

```json
{
  "kind": "mastery_analysis",
  "student_id": "ANU01",
  "mastery": {
    "indexing": 1.0,
    "negative_indexing": 1.0,
    "slicing": 0.0,
    "mutability": 1.0
  },
  "weak_subconcept": "slicing",
  "likely_misconception": "The learner appears to treat the stop index in a Python slice as inclusive.",
  "evidence": ["Q2", "Q4"]
}
```

This becomes Ananya's current **Misconception Fingerprint**.

The wording "appears to" is intentional. EDUNEXUS records an evidence-backed hypothesis; it does not claim certainty about a learner's internal thought process.

### Step 4 — human decision

EDUNEXUS shows Ananya:

```text
Weak sub-concept: Slicing

Likely misconception:
You appear to be treating the stop index in a Python slice as inclusive.

Evidence:
Two different slicing questions produced the same boundary-error pattern.

Recommended action:
A focused revision followed by a two-question mastery check.

[Revise now]     [Skip for now]
```

Ananya selects:

```json
{
  "kind": "learner_decision",
  "student_id": "ANU01",
  "decision": "revise_now"
}
```

If she selects `skip_for_now`, the gap is recorded as deferred and the run ends without claiming mastery.

### Step 5 — targeted intervention

EDUNEXUS does not reteach the entire Python Lists topic. It generates an intervention for the diagnosed weakness.

```text
Python slicing follows [start:stop].

The start index is included.
The stop index is excluded.

For:
a = [10, 20, 30, 40, 50]

a[1:4] gives:
[20, 30, 40]

Indices 1, 2 and 3 are selected.
Index 4 is the stopping boundary and is not included.
```

The intervention strategy is stored with the attempt.

### Step 6 — verification attempt 1

EDUNEXUS generates two **new** questions targeting the same concept through different values or wording.

Ananya scores:

```json
{
  "kind": "verification_attempt",
  "cycle": 1,
  "subconcept": "slicing",
  "correct": 1,
  "total": 2,
  "mastery_confirmed": false
}
```

EDUNEXUS does **not** mark the misconception as resolved.

### Step 7 — work goes backwards

This is the central agentic transition:

```text
VERIFY → REMEDIATE
```

The failed verification record is sent back to remediation.

This is the **Mastery Recovery Loop**.

Because the first explanation did not produce verified mastery, the second intervention must use a different strategy rather than merely repeat the same text.

For this run, EDUNEXUS switches to index tracing:

```text
VALUE:  10   20   30   40   50
INDEX:   0    1    2    3    4

a[1:4]

START at index 1.
STOP before index 4.

Selected indices: 1, 2, 3
Result: [20, 30, 40]
```

### Step 8 — verification attempt 2

Two further questions are generated.

Ananya answers both correctly:

```json
{
  "kind": "verification_attempt",
  "cycle": 2,
  "subconcept": "slicing",
  "correct": 2,
  "total": 2,
  "mastery_confirmed": true
}
```

### Step 9 — mastery recorded

Only now is the learner state updated:

```json
{
  "kind": "learner_mastery",
  "student_id": "ANU01",
  "topic": "Python Lists",
  "subconcept": "slicing",
  "initial_mastery": 0.0,
  "misconception": "stop index treated as inclusive",
  "remediation_cycles": 2,
  "final_status": "mastered",
  "verified": true
}
```

The important result is not that EDUNEXUS produced an explanation. The first intervention failed to produce sufficient evidence, the verifier rejected completion, work moved backwards, the intervention strategy changed, and only new evidence allowed the state to move to `MASTERED`.

---

## 5. Who is doing the thinking

| step | the agent does it | the human does it | what the human loses if the agent does it |
|---|---|---|---|
| Choose the topic | | yes | control over what is relevant to the immediate revision need |
| Generate diagnostic questions from the bounded source | yes | | little; this is repetitive preparation work |
| Answer the questions | | yes | this is the evidence of actual learner understanding |
| Calculate scores and thresholds | deterministic code | | nothing; this should be reproducible |
| Infer a likely misconception from answer patterns | yes | | little if the evidence is visible and the inference remains a hypothesis |
| Choose revise now or skip | | yes | autonomy over time and learning priorities |
| Generate targeted intervention | yes | | little; the learner remains in control of whether to engage |
| Generate equivalent verification questions | yes | | little |
| Decide whether the threshold was satisfied | deterministic code | | avoids arbitrary model judgement or self-declared mastery |

**If your agent asks a person something:**

**The question it asks, and who answers it:** after diagnosis, EDUNEXUS asks the learner whether they want to revise the identified weakness now or skip it for the moment.

**What happens if nobody answers, and how the output shows that:** the run remains in `AWAITING_LEARNER_DECISION`. The weakness stays unresolved. No intervention or mastery claim is generated. A later run can resume from the waiting state.

The learner's decision therefore changes the run; it is not feedback collected and then ignored.

---

## 6. The state machine

```text
TOPIC_SELECTED
      |
      v
DIAGNOSTIC_GENERATION
      |
      v
AWAITING_ANSWERS
      |
      v
ANALYSE
      |
      +---------- no weakness ----------> MASTERED
      |
      | weakness
      v
DIAGNOSIS
      |
      v
AWAITING_LEARNER_DECISION
      |
      +------------ SKIP --------------> DEFERRED
      |
      | REVISE
      v
REMEDIATE
      |
      v
VERIFY
   |       |
 PASS     FAIL
   |       |
   v       |
MASTERED   |
           |
           | revision limit not reached
           |
           +----------------------+
                                  |
                                  v
                              REMEDIATE
                                  ^
                                  |
                            BACKWARD EDGE

If the revision limit is reached:

VERIFY → UNRESOLVED_AFTER_LIMIT
```

| state | active / waiting / finished | what moves it on |
|---|---|---|
| `TOPIC_SELECTED` | active | a valid topic and source are available |
| `DIAGNOSTIC_GENERATION` | active | a valid diagnostic record is produced |
| `AWAITING_ANSWERS` | waiting | learner submits answers |
| `ANALYSE` | active | deterministic scoring completes |
| `DIAGNOSIS` | active | evidence-backed weakness record is produced |
| `AWAITING_LEARNER_DECISION` | waiting | learner selects revise or skip |
| `REMEDIATE` | active | targeted intervention is generated |
| `VERIFY` | active | verification answers are evaluated |
| `DEFERRED` | finished for this run | learner chooses to postpone revision |
| `MASTERED` | finished | verification threshold is satisfied |
| `UNRESOLVED_AFTER_LIMIT` | finished | revision limit is reached without mastery |

**What can send work backwards:** `VERIFY`. Failed verification sends its evidence back to `REMEDIATE` while the revision limit permits another attempt.

**What the run decides that the diagram cannot show:** the most plausible misconception supported by the answer evidence and which intervention strategy should be selected next.

**Spend limit — what bounds cost:** maximum 14 model calls in one run. Technical retries count against this limit.

**Revision limit — what bounds going backwards:** maximum 2 remediation cycles for one diagnosed misconception. This counter is separate from the model-call counter so a failed API/model retry does not consume a pedagogical revision.

---

## 9. The second encounter

Two days later, Ananya returns to EDUNEXUS and selects Python Lists again.

The system reads her previous learner state:

```json
{
  "student_id": "ANU01",
  "topic": "Python Lists",
  "previous_mastery": {
    "indexing": "mastered",
    "negative_indexing": "mastered",
    "mutability": "mastered",
    "slicing": "mastered_after_remediation"
  },
  "previous_misconceptions": [
    {
      "subconcept": "slicing",
      "misconception": "stop index treated as inclusive",
      "status": "resolved",
      "remediation_cycles": 2
    }
  ]
}
```

Because slicing previously required two interventions, EDUNEXUS can begin with a short **retention check** on that sub-concept instead of treating every part of Python Lists as equally unknown.

If Ananya answers correctly, the previous mastery is reinforced.

If the same boundary-error pattern appears again, EDUNEXUS records it as a **recurring misconception**, not a first-time weakness, and avoids simply replaying the exact same intervention sequence.

The second encounter can therefore answer a question that a fresh conversation cannot:

> **What changed in this learner's understanding since the last verified attempt?**

That persistent, actionable history is the **Longitudinal Mastery Memory**.

---

## 11. What this deliberately does not do

1. **It does not implement the complete five-agent EDUNEXUS ecosystem during the Agent-a-thon.**  
   The wider vision includes study planning, scheduling, assessment, career guidance and doubt clarification. We deliberately extracted one complete vertical slice that can be built and tested with real learners in two days.

2. **It does not equate explanation with learning.**  
   Reading an explanation or pressing "I understand" does not alter mastery state. New verification evidence is required.

3. **It does not continue remediation indefinitely.**  
   After two failed remediation cycles, the gap is stored as unresolved and the learner is directed towards source material or human assistance.

4. **It does not invent unsupported syllabus content.**  
   Diagnostic and remediation material must remain grounded in the bounded topic source. If sufficient source evidence is unavailable, EDUNEXUS reports that limitation instead of filling the gap confidently.

5. **It does not add calendar integration, career recommendations, gamification, automatic study scheduling or multi-subject orchestration in this prototype.**  
   Those features may belong to the larger EDUNEXUS architecture, but they do not strengthen the hypothesis this build is testing.

---

## 12. Build order

| phase | what lands | hours |
|---|---|---:|
| 1 | state machine wired end-to-end with hard-coded diagnostic, analysis, learner decision, remediation and verification records | 4 |
| | **cut line:** we can demonstrate the entire forward path, waiting state and backward Mastery Recovery Loop without a model | |
| 2 | persistent learner state, attempt history and Misconception Fingerprint storage | 4 |
| | **cut line:** a run survives restart and previous learner state can be read back | |
| 3 | real diagnostic generation with structured sub-concept tags | 4 |
| | **cut line:** a learner can take a live diagnostic grounded in the selected topic | |
| 4 | deterministic scoring plus evidence-backed misconception diagnosis | 4 |
| | **cut line:** incorrect answers produce a visible weakness record with supporting question IDs | |
| 5 | learner revise/skip waiting state and targeted intervention generation | 3 |
| | **cut line:** the agent can stop for the learner and resume from the decision | |
| 6 | verification, mastery rule and backward transition | 4 |
| | **cut line:** TEST → DIAGNOSE → INTERVENE → VERIFY → REPLAN works end-to-end | |
| 7 | second-encounter retention check and recurrence handling | 3 |
| 8 | minimal progress view and demo polish | 3 |
| 9 | three learner walkthroughs, adversarial test and one visible iteration from feedback | 5 |

**Where the hours will actually go:** not primarily into wiring the states. We expect the difficult part to be judging whether a model-generated misconception is sufficiently specific and supported by the learner's evidence, and whether a second remediation genuinely changes instructional strategy instead of merely changing wording.

Our implementation priority is therefore:

> **correct loop first → persistence second → model quality third → interface polish last**

---

## 15. What you are least sure about

1. **Whether misconception diagnosis will be consistent from a small amount of evidence.**  
   Two incorrect answers may occasionally support more than one plausible misconception. We will test repeated runs and present diagnosis as an evidence-backed hypothesis rather than an unquestionable fact.

2. **Whether two verification questions are sufficient evidence of repaired mastery.**  
   Two questions keep the prototype feasible and learner interaction short, but they may be insufficient for some concepts. We will compare immediate verification with the learner's retention result on the second encounter.

3. **Whether changing intervention strategy after failed verification produces meaningful pedagogical variation rather than cosmetic rewording.**  
   We will explicitly distinguish strategies such as concise rule explanation, worked example and visual/index tracing, then observe which strategies help real learners correct the error.

---

### Prototype hypothesis

If a revision system treats wrong answers as **evidence about a learner's misconception**, rather than merely as a score, then it can make a better next decision: continue, wait for the learner, target a specific weakness, or send learning backwards for another intervention.

The Agent-a-Thon prototype tests that hypothesis through one bounded loop:

```text
TEST
  ↓
DIAGNOSE
  ↓
ASK THE LEARNER
  ↓
INTERVENE
  ↓
VERIFY
  ↓
PASS ────────────────→ RECORD MASTERY
  |
 FAIL
  |
  └───────────────→ REPLAN / REMEDIATE AGAIN
                         |
                         └──────→ VERIFY
```

**EDUNEXUS does not consider an explanation successful because it was generated. It considers an intervention successful only when subsequent learner evidence changes.**