"""Persistent storage for student sticky notes in SQLite."""

import datetime
import os
import sqlite3
import uuid
from typing import Any, Dict, List, Optional


class NotesMemory:
    """Manages student personal sticky notes with title, text, color, and attached images."""

    def __init__(self, db_path: str = "backend/data/edunexus.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sticky_notes (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    title TEXT NOT NULL DEFAULT '',
                    content TEXT NOT NULL DEFAULT '',
                    color TEXT NOT NULL DEFAULT 'yellow',
                    image_data TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sticky_notes_student
                ON sticky_notes (student_id, updated_at DESC)
                """
            )

    @staticmethod
    def _now() -> str:
        return datetime.datetime.now(datetime.timezone.utc).isoformat()

    def list_notes(self, student_id: str) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM sticky_notes WHERE student_id = ? ORDER BY updated_at DESC",
                (student_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_note(self, note_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM sticky_notes WHERE id = ? AND student_id = ?",
                (note_id, student_id),
            ).fetchone()
            return dict(row) if row else None

    def create_note(
        self,
        student_id: str,
        title: str = "",
        content: str = "",
        color: str = "yellow",
        image_data: str = "",
    ) -> Dict[str, Any]:
        note_id = str(uuid.uuid4())
        now = self._now()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO sticky_notes (id, student_id, title, content, color, image_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (note_id, student_id, title.strip()[:200], content.strip()[:10000], color.strip().lower(), image_data, now, now),
            )
        return {
            "id": note_id,
            "student_id": student_id,
            "title": title.strip()[:200],
            "content": content.strip()[:10000],
            "color": color.strip().lower() or "yellow",
            "image_data": image_data,
            "created_at": now,
            "updated_at": now,
        }

    def update_note(
        self,
        note_id: str,
        student_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        color: Optional[str] = None,
        image_data: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        existing = self.get_note(note_id, student_id)
        if not existing:
            return None

        new_title = existing["title"] if title is None else title.strip()[:200]
        new_content = existing["content"] if content is None else content.strip()[:10000]
        new_color = existing["color"] if color is None else color.strip().lower()
        new_image = existing["image_data"] if image_data is None else image_data
        now = self._now()

        with self._connect() as conn:
            conn.execute(
                """
                UPDATE sticky_notes
                SET title = ?, content = ?, color = ?, image_data = ?, updated_at = ?
                WHERE id = ? AND student_id = ?
                """,
                (new_title, new_content, new_color, new_image, now, note_id, student_id),
            )
        return self.get_note(note_id, student_id)

    def delete_note(self, note_id: str, student_id: str) -> bool:
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM sticky_notes WHERE id = ? AND student_id = ?",
                (note_id, student_id),
            )
            return cursor.rowcount > 0
