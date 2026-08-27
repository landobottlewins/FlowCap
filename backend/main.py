from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import hashlib
import secrets
import jwt
from datetime import datetime, date, timedelta
import calendar

SECRET_KEY = "flowcap-secret-key-for-local-development"
ALGORITHM = "HS256"
DB_FILE = "flowcap.db"

app = FastAPI(title="FlowCap Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Initialization ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS config (
            username TEXT PRIMARY KEY,
            monthly_income REAL NOT NULL,
            fixed_costs REAL NOT NULL,
            FOREIGN KEY(username) REFERENCES users(username)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            note TEXT,
            FOREIGN KEY(username) REFERENCES users(username)
        )
    """)
    conn.commit()
    conn.close()

init_db()

# --- Password & JWT Helpers ---
def hash_password(password: str, salt: str = None):
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return key.hex(), salt

def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Schemas ---
class AuthRequest(BaseModel):
    username: str
    password: str

class TransactionCreate(BaseModel):
    amount: float
    category: str
    note: str = ""

# --- Authentication Endpoints ---
@app.post("/api/register")
def register(auth: AuthRequest):
    username = auth.username.strip().lower()
    if not username or not auth.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT username FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")

    pwd_hash, salt = hash_password(auth.password)
    cursor.execute("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)", (username, pwd_hash, salt))
    cursor.execute("INSERT INTO config (username, monthly_income, fixed_costs) VALUES (?, 3000.0, 1200.0)", (username,))
    conn.commit()
    conn.close()

    token = create_token(username)
    return {"token": token, "username": username}

@app.post("/api/login")
def login(auth: AuthRequest):
    username = auth.username.strip().lower()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT password_hash, salt FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    stored_hash, salt = row
    computed_hash, _ = hash_password(auth.password, salt)
    
    if computed_hash != stored_hash:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = create_token(username)
    return {"token": token, "username": username}

# --- Protected Application Routes ---
@app.get("/api/dashboard")
def get_dashboard(username: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT monthly_income, fixed_costs FROM config WHERE username = ?", (username,))
    config = cursor.fetchone()
    income, fixed_costs = config if config else (3000.0, 1200.0)
    
    today = date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_remaining = max(1, days_in_month - today.day + 1)
    
    current_month = today.strftime("%Y-%m")
    cursor.execute("SELECT SUM(amount) FROM transactions WHERE username = ? AND date LIKE ?", (username, f"{current_month}%"))
    total_spent = cursor.fetchone()[0] or 0.0
    
    cursor.execute("SELECT SUM(amount) FROM transactions WHERE username = ? AND date = ?", (username, today.isoformat()))
    spent_today = cursor.fetchone()[0] or 0.0

    conn.close()
    
    disposable_funds = income - fixed_costs
    remaining_balance = disposable_funds - total_spent
    sda = max(0.0, remaining_balance / days_remaining)
    
    return {
        "username": username,
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
def add_transaction(tx: TransactionCreate, username: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO transactions (username, amount, category, date, note) VALUES (?, ?, ?, ?, ?)",
        (username, tx.amount, tx.category, date.today().isoformat(), tx.note)
    )
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/transactions")
def get_transactions(username: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, amount, category, date, note FROM transactions WHERE username = ? ORDER BY id DESC", (username,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "amount": r[1], "category": r[2], "date": r[3], "note": r[4]} for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)