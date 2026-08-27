from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from datetime import datetime, date
import calendar

app = FastAPI(title="FlowCap Engine")

# Allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "flowcap.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY DEFAULT 1,
            monthly_income REAL NOT NULL,
            fixed_costs REAL NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            note TEXT
        )
    """)
    # Default settings: $3000 income, $1200 fixed costs
    cursor.execute("INSERT OR IGNORE INTO config (id, monthly_income, fixed_costs) VALUES (1, 3000.0, 1200.0)")
    conn.commit()
    conn.close()

init_db()

class TransactionCreate(BaseModel):
    amount: float
    category: str
    note: str = ""

class ConfigUpdate(BaseModel):
    monthly_income: float
    fixed_costs: float

@app.get("/api/dashboard")
def get_dashboard():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Get config
    cursor.execute("SELECT monthly_income, fixed_costs FROM config WHERE id = 1")
    income, fixed_costs = cursor.fetchone()

    # Date tracking
    today = date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_remaining = max(1, days_in_month - today.day + 1)

    # Calculate spending
    current_month = today.strftime("%Y-%m")
    cursor.execute("SELECT SUM(amount) FROM transactions WHERE date LIKE ?", (f"{current_month}%",))
    total_spent = cursor.fetchone()[0] or 0.0

    # Calculate today's spending
    cursor.execute("SELECT SUM(amount) FROM transactions WHERE date = ?", (today.isoformat(),))
    spent_today = cursor.fetchone()[0] or 0.0

    conn.close()

    disposable_funds = income - fixed_costs
    remaining_balance = disposable_funds - total_spent

    # Dynamic Safe Daily Allowance formula
    sda = max(0.0, remaining_balance / days_remaining)

    return {
        "monthly_income": income,
        "fixed_costs": fixed_costs,
        "disposable_funds": disposable_funds,
        "total_spent": total_spent,
        "remaining_balance": remaining_balance,
        "days_remaining": days_remaining,
        "safe_daily_allowance": round(sda, 2),
        "spent_today": round(spent_today, 2)
    }

@app.post("/api/transactions")
def add_transaction(tx: TransactionCreate):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    cursor.execute(
        "INSERT INTO transactions (amount, category, date, note) VALUES (?, ?, ?, ?)",
        (tx.amount, tx.category, today_str, tx.note)
    )
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/transactions")
def get_transactions():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, amount, category, date, note FROM transactions ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "amount": r[1], "category": r[2], "date": r[3], "note": r[4]} for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
