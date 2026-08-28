import unittest
from fastapi.testclient import TestClient
from main import app, init_db
import sqlite3

class TestAllFlowCapFeatures(unittest.TestCase):
    def setUp(self):
        init_db()
        self.client = TestClient(app)
        self.username = "aditya_tester"
        self.password = "secure_pass_123"
        
        # Register or Login
        reg_res = self.client.post("/api/register", json={"username": self.username, "password": self.password})
        if reg_res.status_code == 200:
            self.token = reg_res.json()["token"]
        else:
            log_res = self.client.post("/api/login", json={"username": self.username, "password": self.password})
            self.token = log_res.json()["token"]
            
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Clean state for test user
        conn = sqlite3.connect("flowcap.db")
        conn.execute("DELETE FROM transactions WHERE username = ?", (self.username,))
        conn.execute("DELETE FROM upcoming_expenses WHERE username = ?", (self.username,))
        conn.commit()
        conn.close()

    def test_complete_feature_suite(self):
        # 1. Budget Setup (Student 5k Scale)
        config_payload = {
            "monthly_income": 5000.0,
            "fixed_costs": 1000.0,
            "savings_target": 500.0,
            "emergency_buffer": 300.0,
            "cycle_start_day": 1,
            "currency": "INR"
        }
        res = self.client.put("/api/config", json=config_payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)

        # 2. Verify Initial Dashboard & SDA Formula
        # Disposable = 5000 - 1000 - 500 - 300 = 3200
        res = self.client.get("/api/dashboard", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["disposable_funds"], 3200.0)
        self.assertEqual(data["total_spent"], 0.0)
        self.assertEqual(data["spent_today"], 0.0)
        days_rem = data["days_remaining"]
        expected_sda = round(3200.0 / days_rem, 2)
        self.assertEqual(data["safe_daily_allowance"], expected_sda)
        self.assertEqual(data["health_status"], "healthy")

        # 3. Add Expense Transaction
        tx1 = {
            "amount": 60.0,
            "category": "Food",
            "date": "2026-08-28",
            "note": "Canteen Thali",
            "type": "expense"
        }
        res = self.client.post("/api/transactions", json=tx1, headers=self.headers)
        self.assertEqual(res.status_code, 200)

        # 4. Check Recalculated SDA & Explanation
        res = self.client.get("/api/dashboard", headers=self.headers)
        d2 = res.json()
        self.assertEqual(d2["spent_today"], 60.0)
        self.assertEqual(d2["total_spent"], 60.0)
        self.assertLess(d2["safe_daily_allowance"], expected_sda)
        self.assertTrue(len(d2["sda_explanation"]) > 0)

        # 5. Add Reserved Upcoming Expense
        # e.g. Exam fee — ₹500
        upcoming = {
            "title": "College Exam Fee",
            "amount": 500.0,
            "due_date": "2026-08-30",
            "category": "Education"
        }
        res = self.client.post("/api/upcoming-expenses", json=upcoming, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        up_id = res.json()["id"]

        # 6. Verify Reserved Expenses Withheld from SDA
        res = self.client.get("/api/dashboard", headers=self.headers)
        d3 = res.json()
        self.assertEqual(d3["reserved_upcoming"], 500.0)
        expected_sda_after_reserved = round((3200.0 - 60.0 - 500.0) / days_rem, 2)
        self.assertEqual(d3["safe_daily_allowance"], expected_sda_after_reserved)

        # 7. What-If Simulator
        sim_payload = {"amount": 250.0, "category": "Shopping"}
        res = self.client.post("/api/simulator", json=sim_payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        sim_res = res.json()
        self.assertIn("current_sda", sim_res)
        self.assertIn("new_sda", sim_res)
        self.assertIn("verdict", sim_res)
        self.assertLess(sim_res["new_sda"], sim_res["current_sda"])

        # 8. CSV Statement Import & Duplicate Detection
        csv_batch = [
            {"amount": 30.0, "category": "Transport", "date": "2026-08-10", "note": "Metro Token", "type": "expense"},
            {"amount": 59.0, "category": "Subscriptions", "date": "2026-08-12", "note": "Spotify Student", "type": "expense"},
            # Duplicate of tx1
            {"amount": 60.0, "category": "Food", "date": "2026-08-28", "note": "Canteen Thali", "type": "expense"}
        ]
        res = self.client.post("/api/transactions/csv-import", json=csv_batch, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        csv_res = res.json()
        self.assertEqual(csv_res["inserted_count"], 2)
        self.assertEqual(csv_res["duplicate_count"], 1)

        # 9. Category Budgets & Alerts
        cat_caps = [
            {"category": "Food", "monthly_limit": 1500.0},
            {"category": "Transport", "monthly_limit": 600.0}
        ]
        res = self.client.post("/api/category-budgets", json=cat_caps, headers=self.headers)
        self.assertEqual(res.status_code, 200)

        # Check category status in dashboard
        res = self.client.get("/api/dashboard", headers=self.headers)
        d4 = res.json()
        food_cat = next((c for c in d4["category_status"] if c["category"] == "Food"), None)
        self.assertIsNotNone(food_cat)
        self.assertEqual(food_cat["limit"], 1500.0)

        # 10. Spending Insights Engine
        res = self.client.get("/api/insights", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        insights_res = res.json()
        self.assertIn("insights", insights_res)
        self.assertIn("health_status", insights_res)

        # 11. Streak Calendar Matrix
        res = self.client.get("/api/calendar-streak", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        streak_res = res.json()
        self.assertIn("calendar_days", streak_res)
        self.assertIn("streak_count", streak_res)
        self.assertGreater(len(streak_res["calendar_days"]), 0)

        # 12. Demo Data Seeder
        res = self.client.post("/api/demo-data", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "success")

if __name__ == "__main__":
    unittest.main()

