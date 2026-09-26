"""Streaks and badge-based rewards engine for Nexora students."""

import datetime
from typing import Any, Dict, List, Set


BADGE_DEFINITIONS = [
    {
        "id": "first_step",
        "title": "First Step",
        "description": "Begin your learning journey by completing a lesson, revision, or test.",
        "icon": "Sparkles",
        "tier": "bronze",
        "category": "milestone",
        "target": 1,
    },
    {
        "id": "streak_3",
        "title": "Spark of Dedication",
        "description": "Build a 3-day continuous daily study streak.",
        "icon": "Flame",
        "tier": "silver",
        "category": "streak",
        "target": 3,
    },
    {
        "id": "streak_7",
        "title": "Unstoppable Habit",
        "description": "Maintain a 7-day study streak without missing a day.",
        "icon": "Zap",
        "tier": "gold",
        "category": "streak",
        "target": 7,
    },
    {
        "id": "master_1",
        "title": "Mastery Initiate",
        "description": "Master your first subconcept with high recall accuracy.",
        "icon": "BrainCircuit",
        "tier": "bronze",
        "category": "mastery",
        "target": 1,
    },
    {
        "id": "master_3",
        "title": "Concept Conqueror",
        "description": "Achieve verified mastery in 3 or more concepts.",
        "icon": "Award",
        "tier": "gold",
        "category": "mastery",
        "target": 3,
    },
    {
        "id": "revision_5",
        "title": "Revision Ranger",
        "description": "Complete 5 targeted revision or flashcard drill sessions.",
        "icon": "RefreshCw",
        "tier": "silver",
        "category": "practice",
        "target": 5,
    },
    {
        "id": "score_90",
        "title": "Bullseye Accuracy",
        "description": "Score 90% or higher on any diagnostic assessment.",
        "icon": "Target",
        "tier": "gold",
        "category": "assessment",
        "target": 90,
    },
    {
        "id": "topics_5",
        "title": "Knowledge Seeker",
        "description": "Explore and practice across 5 different syllabus topics.",
        "icon": "BookOpen",
        "tier": "silver",
        "category": "exploration",
        "target": 5,
    },
    {
        "id": "multilingual",
        "title": "Polyglot Thinker",
        "description": "Practice or learn using multilingual Indian language modes.",
        "icon": "Globe",
        "tier": "silver",
        "category": "exploration",
        "target": 1,
    },
    {
        "id": "mindful_focus",
        "title": "Mindful Scholar",
        "description": "Activate Pomodoro cycles or hydration alerts for healthy study rhythm.",
        "icon": "Clock",
        "tier": "bronze",
        "category": "wellness",
        "target": 1,
    },
]


def calculate_streaks(activity_dates: Set[datetime.date], today: datetime.date | None = None) -> Dict[str, Any]:
    """
    Computes current and all-time best study streaks based on unique calendar activity days.
    If the student studied today, current streak includes today.
    If not yet studied today, but studied yesterday, the streak is maintained (grace period for today).
    """
    if today is None:
        today = datetime.date.today()

    if not activity_dates:
        return {
            "current_streak": 0,
            "best_streak": 0,
            "today_studied": False,
            "last_active": None,
            "streak_message": "Start your streak by completing a quick study session today!",
        }

    sorted_dates = sorted(activity_dates)
    last_active = sorted_dates[-1]
    today_studied = today in activity_dates

    # Current streak calculation
    current_streak = 0
    check_date = today if today_studied else (today - datetime.timedelta(days=1))
    while check_date in activity_dates:
        current_streak += 1
        check_date -= datetime.timedelta(days=1)

    # Best streak calculation
    best_streak = 0
    temp_streak = 0
    prev_date = None
    for d in sorted_dates:
        if prev_date is None:
            temp_streak = 1
        elif d == prev_date + datetime.timedelta(days=1):
            temp_streak += 1
        elif d == prev_date:
            pass
        else:
            temp_streak = 1
        prev_date = d
        if temp_streak > best_streak:
            best_streak = temp_streak

    best_streak = max(best_streak, current_streak)

    if current_streak == 0:
        msg = "Start your streak by completing a lesson, revision, or test today!"
    elif today_studied:
        msg = f"🔥 {current_streak} day streak active! You studied today — awesome momentum!"
    else:
        msg = f"🔥 {current_streak} day streak! Complete a session today to keep your streak burning!"

    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "today_studied": today_studied,
        "last_active": last_active.isoformat(),
        "streak_message": msg,
    }


def _extract_date(val: Any) -> datetime.date | None:
    if isinstance(val, datetime.date) and not isinstance(val, datetime.datetime):
        return val
    if isinstance(val, datetime.datetime):
        return val.date()
    if isinstance(val, str) and val.strip():
        try:
            # Handle ISO timestamps like 2026-09-26T10:30:00 or 2026-09-26
            clean = val.strip().split("T")[0].split(" ")[0]
            parts = clean.split("-")
            if len(parts) == 3:
                return datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
        except Exception:
            return None
    return None


def compute_student_rewards(student_id: str, services, account: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Aggregates all student interactions to compute streaks, XP, level, and badge rewards."""
    account = account or {}
    profile = account.get("profile") or {}

    learner_summary = services.learner_memory.get_learner_summary(student_id)
    chats = services.chat_memory.list_sessions(student_id)
    revisions = services.revision_memory.list_sessions(student_id)
    tests = services.test_memory.list_sessions(student_id)

    activity_dates: Set[datetime.date] = set()

    # Collect dates from chats
    for c in chats:
        for key in ("updated_at", "created_at"):
            d = _extract_date(c.get(key))
            if d:
                activity_dates.add(d)

    # Collect dates from revisions
    for r in revisions:
        for key in ("updated_at", "created_at"):
            d = _extract_date(r.get(key))
            if d:
                activity_dates.add(d)

    # Collect dates from tests
    for t in tests:
        for key in ("updated_at", "created_at"):
            d = _extract_date(t.get(key))
            if d:
                activity_dates.add(d)

    # Collect dates from attempts in learner_memory
    with services.learner_memory.Session() as session:
        from backend.memory.learner_memory import LearningEvent, Attempt
        for ev in session.query(LearningEvent).filter_by(student_id=student_id).all():
            d = _extract_date(ev.timestamp)
            if d:
                activity_dates.add(d)
        for att in session.query(Attempt).filter_by(student_id=student_id).all():
            d = _extract_date(att.timestamp)
            if d:
                activity_dates.add(d)

    streaks = calculate_streaks(activity_dates)

    # Metrics for badge evaluations
    chats_count = len(chats)
    revisions_count = len(revisions)
    completed_tests = [t for t in tests if t.get("status") == "COMPLETED" and t.get("score") is not None]
    tests_count = len(completed_tests)
    total_activities = chats_count + revisions_count + tests_count

    mastered_count = learner_summary.get("mastered_subconcepts_count", 0)
    topics_count = max(learner_summary.get("topics_count", 0), len(set(
        [c.get("title") for c in chats if c.get("title")] +
        [r.get("topic") for r in revisions if r.get("topic")] +
        [t.get("topic") for t in tests if t.get("topic")]
    )))

    highest_score = 0.0
    for t in completed_tests:
        raw_score = t.get("score", 0.0)
        score_pct = round(raw_score * 100) if raw_score <= 1.0 else round(raw_score)
        if score_pct > highest_score:
            highest_score = score_pct

    multilingual_used = bool(
        profile.get("language") and profile.get("language") != "english"
        or any(c.get("output_language", "auto") not in ["auto", "english"] for c in chats)
    )

    pomodoro_active = bool(profile.get("pomodoro", {}).get("enabled") or profile.get("hydration", {}).get("enabled"))

    # Compute XP & Level
    # Tests: 100 XP, Revisions: 60 XP, Chats: 40 XP, Mastered: 150 XP, Current Streak: 50 XP/day
    xp = (tests_count * 100) + (revisions_count * 60) + (chats_count * 40) + (mastered_count * 150) + (streaks["current_streak"] * 50)
    level = max(1, 1 + xp // 300)
    xp_in_level = xp % 300
    next_level_xp = 300

    level_titles = {
        1: "Novice Learner",
        2: "Curious Explorer",
        3: "Knowledge Builder",
        4: "Concept Scholar",
        5: "Insight Master",
        6: "Mastery Adept",
        7: "Cognitive Champion",
        8: "Grand Scholar",
    }
    level_title = level_titles.get(level, f"Ascended Scholar Lvl {level}")

    # Evaluate Badges
    badges = []
    unlocked_count = 0

    for b in BADGE_DEFINITIONS:
        bid = b["id"]
        target = b["target"]
        progress = 0
        unlocked = False

        if bid == "first_step":
            progress = min(target, total_activities)
            unlocked = total_activities >= 1
        elif bid == "streak_3":
            progress = min(target, streaks["best_streak"])
            unlocked = streaks["best_streak"] >= 3
        elif bid == "streak_7":
            progress = min(target, streaks["best_streak"])
            unlocked = streaks["best_streak"] >= 7
        elif bid == "master_1":
            progress = min(target, mastered_count)
            unlocked = mastered_count >= 1
        elif bid == "master_3":
            progress = min(target, mastered_count)
            unlocked = mastered_count >= 3
        elif bid == "revision_5":
            progress = min(target, revisions_count)
            unlocked = revisions_count >= 5
        elif bid == "score_90":
            progress = min(target, int(highest_score))
            unlocked = highest_score >= 90
        elif bid == "topics_5":
            progress = min(target, topics_count)
            unlocked = topics_count >= 5
        elif bid == "multilingual":
            progress = 1 if multilingual_used else 0
            unlocked = multilingual_used
        elif bid == "mindful_focus":
            progress = 1 if pomodoro_active else 0
            unlocked = pomodoro_active

        if unlocked:
            unlocked_count += 1

        percent = min(100, int((progress / target) * 100)) if target > 0 else 0

        badges.append({
            **b,
            "progress": progress,
            "percent": percent,
            "unlocked": unlocked,
        })

    return {
        "student_id": student_id,
        "streaks": streaks,
        "xp": xp,
        "level": level,
        "level_title": level_title,
        "xp_in_level": xp_in_level,
        "next_level_xp": next_level_xp,
        "badges": badges,
        "unlocked_count": unlocked_count,
        "total_badges": len(badges),
        "stats": {
            "total_activities": total_activities,
            "chats_count": chats_count,
            "revisions_count": revisions_count,
            "tests_count": tests_count,
            "mastered_count": mastered_count,
            "topics_count": topics_count,
            "highest_score": highest_score,
        }
    }
