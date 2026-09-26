import unittest
import os
import shutil
import uuid
from backend.memory.notes_memory import NotesMemory


class TestNotesMemory(unittest.TestCase):
    def setUp(self):
        self.test_dir = os.path.abspath(f"backend/data/test_notes_{uuid.uuid4().hex}")
        os.makedirs(self.test_dir, exist_ok=True)
        self.db_path = os.path.join(self.test_dir, "notes.db")
        self.memory = NotesMemory(self.db_path)

    def tearDown(self):
        # Allow Windows to release locks
        try:
            shutil.rmtree(self.test_dir, ignore_errors=True)
        except Exception:
            pass

    def test_create_and_list_notes(self):
        note = self.memory.create_note(
            student_id="student_123",
            title="Bayes Theorem",
            content="P(A|B) = P(B|A) * P(A) / P(B)",
            color="amber",
            image_data="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        self.assertEqual(note["title"], "Bayes Theorem")
        self.assertEqual(note["color"], "amber")
        self.assertTrue(note["image_data"].startswith("data:image/png"))

        notes = self.memory.list_notes("student_123")
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["id"], note["id"])

    def test_student_isolation(self):
        self.memory.create_note("student_A", title="Student A Note", content="Secret A")
        self.memory.create_note("student_B", title="Student B Note", content="Secret B")

        notes_a = self.memory.list_notes("student_A")
        notes_b = self.memory.list_notes("student_B")

        self.assertEqual(len(notes_a), 1)
        self.assertEqual(notes_a[0]["title"], "Student A Note")
        self.assertEqual(len(notes_b), 1)
        self.assertEqual(notes_b[0]["title"], "Student B Note")

    def test_update_and_delete_note(self):
        note = self.memory.create_note("student_A", title="Original", content="First draft", color="yellow")
        nid = note["id"]

        updated = self.memory.update_note(nid, "student_A", title="Updated Title", content="Second draft", color="teal")
        self.assertIsNotNone(updated)
        self.assertEqual(updated["title"], "Updated Title")
        self.assertEqual(updated["content"], "Second draft")
        self.assertEqual(updated["color"], "teal")

        # Deleting
        deleted = self.memory.delete_note(nid, "student_A")
        self.assertTrue(deleted)
        self.assertEqual(len(self.memory.list_notes("student_A")), 0)


if __name__ == "__main__":
    unittest.main()
