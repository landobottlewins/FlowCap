import unittest
from fastapi.testclient import TestClient
from main import app, init_db
import os
import sqlite3

class TestFlowCapBackend(unittest.TestCase):
    def setUp(self):
        init_db()
        self.client = TestClient(app)
        self.username = "test_user_flowcap"
        self.password = "pass123456"
        res = self.client.post("/api/register", json={"username": self.username, "password": self.password})
        if res.status_code == 200:
            self.token = res.json()["token"]
        else:
            login_res = self.client.post("/api/login", json={"username": self.username, "password": self.password})
            self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Clean up existing transactions for clean state
        conn = sqlite3.connect("flowcap.db")
        conn.execute("DELETE FROM transactions WHERE username = ?", (self.username,))
        conn.execute("DELETE FROM upcoming_expenses WHERE username = ?", (self.username,))
        conn.commit()
        conn.close()

    def test_dashboard_and_sda_recalculation(self):
        # 1. Update config
        cfg = {
            "monthly_income": 30000.0,
            "fixed_costs": 10000.0,
            "savings_target": 5000.0,
            "emergency_buffer": 2000.0,
            "cycle_start_day": 1,
            "currency": "INR"
        }
        res = self.client.put("/api/config", json=cfg, headers=self.headers)
        self.assertEqual(res.status_code, 200)

        # 2. Get dashboard
        res = self.client.get("/api/dashboard", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["disposable_funds"], 13000.0) # 30000 - 10000 - 5000 - 2000
        initial_sda = data["safe_daily_allowance"]
        self.assertGreater(initial_sda, 0)

        # 3. Add transaction
        tx = {
            "amount": 500.0,
            "category": "Food",
            "note": "Dinner",
            "type": "expense"
        }
        res = self.client.post("/api/transactions", json=tx, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        tx_id = res.json()["id"]

        # 4. Check dashboard after transaction
        res = self.client.get("/api/dashboard", headers=self.headers)
        new_data = res.json()
        self.assertEqual(new_data["spent_today"], 500.0)
        self.assertEqual(new_data["total_spent"], 500.0)

        # 5. Add upcoming reserved expense (e.g. college fee ₹2500)
        upcoming = {
            "title": "College fee",
            "amount": 2500.0,
            "due_date": "2026-08-30",
            "category": "Education"
        }
        res = self.client.post("/api/upcoming-expenses", json=upcoming, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        up_id = res.json()["id"]

        # 6. Check that upcoming expense reduces remaining balance and SDA
        res = self.client.get("/api/dashboard", headers=self.headers)
        up_data = res.json()
        self.assertEqual(up_data["reserved_upcoming"], 2500.0)
        self.assertLess(up_data["safe_daily_allowance"], initial_sda)

        # 7. What-If simulator
        sim = {"amount": 2000.0, "category": "Shopping"}
        res = self.client.post("/api/simulator", json=sim, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        sim_data = res.json()
        self.assertIn("new_sda", sim_data)
        self.assertIn("verdict", sim_data)

        # 8. CSV Import
        csv_items = [
            {"amount": 150.0, "category": "Transport", "date": "2026-08-15", "note": "Metro recharge", "type": "expense"},
            {"amount": 300.0, "category": "Food", "date": "2026-08-16", "note": "Groceries", "type": "expense"}
        ]
        res = self.client.post("/api/transactions/csv-import", json=csv_items, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["inserted_count"], 2)

        # 9. Clean up created items
        self.client.delete(f"/api/transactions/{tx_id}", headers=self.headers)
        self.client.delete(f"/api/upcoming-expenses/{up_id}", headers=self.headers)

if __name__ == "__main__":
    unittest.main()
