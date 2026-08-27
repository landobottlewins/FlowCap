from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from datetime import datetime, date
import calendar
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Replace with your actual Client ID
GOOGLE_CLIENT_ID = "994951090257-36fnidmbdc76o0nfdtbmqm2ktvlgig0e.apps.googleusercontent.com"

app = FastAPI(title="FlowCap Engine")

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
    # Added user_email to isolate user data
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS config (
            user_email TEXT PRIMARY KEY,
            monthly_income REAL NOT NULL,
            fixed_costs REAL NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            note TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# --- Authentication Middleware ---
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo['email']
        
        # Ensure user has a default config in DB
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO config (user_email, monthly_income, fixed_costs) VALUES (?, 3000.0, 1200.0)", (email,))
        conn.commit()
        conn.close()
        
        return email
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

# --- Schemas ---
class TransactionCreate(BaseModel):
    amount: float
    category: str
    note: str = ""

# --- Protected Routes ---
@app.get("/api/dashboard")
def get_dashboard(email: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT monthly_income, fixed_costs FROM config WHERE user_email = ?", (email,))
    config = cursor.fetchone()
    income, fixed_costs = config if config else (3000.0, 1200.0)
    
    today = date.today()
    days_remaining = max(1, calendar.monthrange(today.year, today.month)[1] - today.day + 1)
    
    current_month = today.strftime("%Y-%m")
    cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_email = ? AND date LIKE ?", (email, f"{current_month}%"))
    total_spent = cursor.fetchone()[0] or 0.0
    
    cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_email = ? AND date = ?", (email, today.isoformat()))
    spent_today = cursor.fetchone()[0] or 0.0

    conn.close()
    
    disposable_funds = income - fixed_costs
    remaining_balance = disposable_funds - total_spent
    sda = max(0.0, remaining_balance / days_remaining)
    
    return {
        "user": email,
        "monthly_income": income,
        "disposable_funds": disposable_funds,
        "total_spent": total_spent,
        "remaining_balance": remaining_balance,
        "days_remaining": days_remaining,
        "safe_daily_allowance": round(sda, 2),
        "spent_today": round(spent_today, 2)
    }

@app.post("/api/transactions")
def add_transaction(tx: TransactionCreate, email: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO transactions (user_email, amount, category, date, note) VALUES (?, ?, ?, ?, ?)",
        (email, tx.amount, tx.category, date.today().isoformat(), tx.note)
    )
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/transactions")
def get_transactions(email: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, amount, category, date, note FROM transactions WHERE user_email = ? ORDER BY id DESC", (email,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "amount": r[1], "category": r[2], "date": r[3], "note": r[4]} for r in rows]