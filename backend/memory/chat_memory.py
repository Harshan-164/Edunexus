import datetime
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from collections.abc import Iterator
from typing import Any, Dict, List, Optional


class ChatMemory:
    """Local SQLite persistence for learning chat sessions."""

    def __init__(self, db_path: str = "backend/data/edunexus.db"):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._initialize()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS ix_chat_sessions_student_updated
                ON chat_sessions(student_id, updated_at DESC);

                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    text TEXT NOT NULL,
                    visualization TEXT,
                    is_grounded INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS ix_chat_messages_session_created
                ON chat_messages(session_id, created_at ASC);

                CREATE TABLE IF NOT EXISTS chat_attachments (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    stored_name TEXT NOT NULL UNIQUE,
                    file_path TEXT NOT NULL,
                    content_type TEXT,
                    size INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS ix_chat_attachments_session
                ON chat_attachments(session_id, created_at ASC);
                """
            )

    @staticmethod
    def _now() -> str:
        return datetime.datetime.now(datetime.timezone.utc).isoformat()

    @staticmethod
    def _session_dict(row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "student_id": row["student_id"],
            "title": row["title"],
            "description": row["description"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    @staticmethod
    def _message_dict(row: sqlite3.Row) -> Dict[str, Any]:
        visualization = None
        if row["visualization"]:
            try:
                visualization = json.loads(row["visualization"])
            except json.JSONDecodeError:
                visualization = None
        return {
            "id": row["id"],
            "session_id": row["session_id"],
            "sender": row["sender"],
            "text": row["text"],
            "visualization": visualization,
            "is_grounded": bool(row["is_grounded"]),
            "created_at": row["created_at"],
        }

    @staticmethod
    def _attachment_dict(row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "session_id": row["session_id"],
            "display_name": row["display_name"],
            "stored_name": row["stored_name"],
            "content_type": row["content_type"],
            "size": row["size"],
            "created_at": row["created_at"],
            "download_url": f"/api/learn/attachments/{row['id']}/download",
        }

    def create_session(self, student_id: str, title: str, description: str) -> Dict[str, Any]:
        session_id = str(uuid.uuid4())
        now = self._now()
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO chat_sessions (id, student_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (session_id, student_id, title.strip(), description.strip(), now, now),
            )
            row = connection.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
        result = self._session_dict(row)
        result.update({"messages": [], "attachments": []})
        return result

    def list_sessions(self, student_id: str) -> List[Dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT s.*,
                       COUNT(DISTINCT m.id) AS message_count,
                       COUNT(DISTINCT a.id) AS attachment_count
                FROM chat_sessions s
                LEFT JOIN chat_messages m ON m.session_id = s.id
                LEFT JOIN chat_attachments a ON a.session_id = s.id
                WHERE s.student_id = ?
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                """,
                (student_id,),
            ).fetchall()
        return [
            {
                **self._session_dict(row),
                "message_count": row["message_count"],
                "attachment_count": row["attachment_count"],
            }
            for row in rows
        ]

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as connection:
            session_row = connection.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
            if not session_row:
                return None
            message_rows = connection.execute(
                "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,)
            ).fetchall()
            attachment_rows = connection.execute(
                "SELECT * FROM chat_attachments WHERE session_id = ? ORDER BY created_at ASC", (session_id,)
            ).fetchall()
        result = self._session_dict(session_row)
        result["messages"] = [self._message_dict(row) for row in message_rows]
        result["attachments"] = [self._attachment_dict(row) for row in attachment_rows]
        return result

    def add_message(
        self,
        session_id: str,
        sender: str,
        text: str,
        visualization: Optional[Dict[str, Any]] = None,
        is_grounded: bool = False,
    ) -> Dict[str, Any]:
        message_id = str(uuid.uuid4())
        now = self._now()
        serialized_visualization = json.dumps(visualization) if visualization else None
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO chat_messages (id, session_id, sender, text, visualization, is_grounded, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (message_id, session_id, sender, text, serialized_visualization, int(is_grounded), now),
            )
            connection.execute("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", (now, session_id))
            row = connection.execute("SELECT * FROM chat_messages WHERE id = ?", (message_id,)).fetchone()
        return self._message_dict(row)

    def recent_messages(self, session_id: str, limit: int = 12) -> List[Dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
                (session_id, limit),
            ).fetchall()
        return [self._message_dict(row) for row in reversed(rows)]

    def add_attachment(
        self,
        session_id: str,
        display_name: str,
        stored_name: str,
        file_path: str,
        content_type: Optional[str],
        size: int,
    ) -> Dict[str, Any]:
        attachment_id = str(uuid.uuid4())
        now = self._now()
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO chat_attachments (id, session_id, display_name, stored_name, file_path, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (attachment_id, session_id, display_name, stored_name, os.path.abspath(file_path), content_type, size, now),
            )
            connection.execute("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", (now, session_id))
            row = connection.execute("SELECT * FROM chat_attachments WHERE id = ?", (attachment_id,)).fetchone()
        return self._attachment_dict(row)

    def get_attachment(self, attachment_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM chat_attachments WHERE id = ?", (attachment_id,)).fetchone()
        if not row:
            return None
        result = self._attachment_dict(row)
        result["file_path"] = row["file_path"]
        return result
