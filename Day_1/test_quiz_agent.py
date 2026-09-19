import unittest

from quiz_agent import StudentQuizAgent


class QuizAgentMcqTests(unittest.TestCase):
    def test_mcq_questions_include_options_and_allow_letter_answers(self):
        agent = StudentQuizAgent("science")
        question = agent.available_questions[0]

        self.assertTrue(question.options)
        self.assertTrue(any("sunlight" in option.lower() for option in question.options))
        self.assertTrue(agent.evaluate_answer("A", question))

    def test_llm_payloads_are_parsed_into_question_objects(self):
        agent = StudentQuizAgent("science")
        payload = '''[
            {
                "prompt": "What is the boiling point of water?",
                "answer": "100 degrees Celsius",
                "options": [
                    "100 degrees Celsius",
                    "50 degrees Celsius",
                    "150 degrees Celsius",
                    "0 degrees Celsius"
                ],
                "explanation": "Water boils at 100 degrees Celsius at sea level.",
                "difficulty": "easy"
            }
        ]'''

        questions = agent.parse_llm_questions(payload)
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0].answer, "100 degrees Celsius")
        self.assertTrue(questions[0].options)


if __name__ == "__main__":
    unittest.main()
