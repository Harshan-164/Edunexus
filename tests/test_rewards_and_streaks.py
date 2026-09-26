import datetime
import unittest
from backend.learning.rewards import calculate_streaks, BADGE_DEFINITIONS


class TestRewardsAndStreaks(unittest.TestCase):
    def test_streak_calculation_empty(self):
        streaks = calculate_streaks(set())
        self.assertEqual(streaks["current_streak"], 0)
        self.assertEqual(streaks["best_streak"], 0)
        self.assertFalse(streaks["today_studied"])

    def test_streak_calculation_active_today(self):
        today = datetime.date(2026, 9, 26)
        dates = {
            today,
            today - datetime.timedelta(days=1),
            today - datetime.timedelta(days=2),
        }
        streaks = calculate_streaks(dates, today=today)
        self.assertEqual(streaks["current_streak"], 3)
        self.assertEqual(streaks["best_streak"], 3)
        self.assertTrue(streaks["today_studied"])

    def test_streak_calculation_yesterday_only_maintained(self):
        today = datetime.date(2026, 9, 26)
        yesterday = today - datetime.timedelta(days=1)
        two_days_ago = today - datetime.timedelta(days=2)
        dates = {yesterday, two_days_ago}
        streaks = calculate_streaks(dates, today=today)
        # Should be 2 days because user can study today to extend to 3
        self.assertEqual(streaks["current_streak"], 2)
        self.assertEqual(streaks["best_streak"], 2)
        self.assertFalse(streaks["today_studied"])

    def test_streak_broken(self):
        today = datetime.date(2026, 9, 26)
        three_days_ago = today - datetime.timedelta(days=3)
        dates = {three_days_ago}
        streaks = calculate_streaks(dates, today=today)
        self.assertEqual(streaks["current_streak"], 0)
        self.assertEqual(streaks["best_streak"], 1)

    def test_badge_definitions_exist(self):
        self.assertGreaterEqual(len(BADGE_DEFINITIONS), 8)
        ids = [b["id"] for b in BADGE_DEFINITIONS]
        self.assertIn("first_step", ids)
        self.assertIn("streak_3", ids)
        self.assertIn("master_1", ids)


if __name__ == "__main__":
    unittest.main()
