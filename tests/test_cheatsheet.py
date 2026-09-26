import unittest
from backend.learning.cheatsheet import extract_cheatsheet_data, render_cheatsheet_html, build_cheatsheet_pdf


class TestCheatsheetGenerator(unittest.TestCase):
    def setUp(self):
        self.topic = "Dynamic Programming"
        self.description = "Memoization and Tabulation"
        self.messages = [
            {"sender": "user", "text": "What is the difference between memoization and tabulation?"},
            {
                "sender": "tutor",
                "text": "Memoization is top-down using recursion and caching. Tabulation is bottom-up using an iterative table.\n- Invariant: Subproblems must overlap and have optimal substructure.\n- Time Complexity: O(N) instead of O(2^N)."
            },
            {"sender": "user", "text": "What is a common mistake when implementing DP?"},
            {
                "sender": "tutor",
                "text": "Common mistake is missing the base cases or forgetting to check if the state is already computed."
            }
        ]

    def test_extract_cheatsheet_data_fallback(self):
        data = extract_cheatsheet_data(self.topic, self.description, self.messages, llm=None)
        self.assertIn("Dynamic Programming", data["title"])
        self.assertGreater(len(data["qa_highlights"]), 0)
        self.assertEqual(data["qa_highlights"][0]["question"], "What is the difference between memoization and tabulation?")

    def test_render_html(self):
        data = extract_cheatsheet_data(self.topic, self.description, self.messages, llm=None)
        html = render_cheatsheet_html(data)
        self.assertIn("NEXORA", html)
        self.assertIn("Dynamic Programming", html)
        self.assertIn("Memoization", html)

    def test_build_cheatsheet_pdf(self):
        pdf_bytes = build_cheatsheet_pdf(self.topic, self.description, self.messages, llm=None)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 1000)


if __name__ == "__main__":
    unittest.main()
