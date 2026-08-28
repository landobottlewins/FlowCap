from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from io import BytesIO
import re
import sqlite3
import hashlib
import secrets
import jwt
import subprocess
from datetime import datetime, timezone, date, timedelta
import calendar

SECRET_KEY = "flowcap-secret-key-for-local-development"
ALGORITHM = "HS256"
DB_FILE = "flowcap.db"

app = FastAPI(title="FlowCap Engine - Dynamic Allowance & Micro-Budgeting API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Initialization & Migration ---
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    # Check and migrate config table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='config'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(config)")
        columns = [row[1] for row in cursor.fetchall()]
        if "username" not in columns:
            cursor.execute("DROP TABLE config")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS config (
            username TEXT PRIMARY KEY,
            monthly_income REAL NOT NULL DEFAULT 5000.0,
            fixed_costs REAL NOT NULL DEFAULT 1000.0,
            savings_target REAL NOT NULL DEFAULT 500.0,
            emergency_buffer REAL NOT NULL DEFAULT 300.0,
            cycle_start_day INTEGER NOT NULL DEFAULT 1,
            currency TEXT NOT NULL DEFAULT 'INR',
            FOREIGN KEY(username) REFERENCES users(username)
        )
    """)

    # Check and migrate transactions table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(transactions)")
        tx_cols = [row[1] for row in cursor.fetchall()]
        if "username" not in tx_cols:
            cursor.execute("DROP TABLE transactions")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            note TEXT,
            type TEXT NOT NULL DEFAULT 'expense',
            FOREIGN KEY(username) REFERENCES users(username)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS upcoming_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Bills',
            is_paid INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(username) REFERENCES users(username)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS category_budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            category TEXT NOT NULL,
            monthly_limit REAL NOT NULL,
            UNIQUE(username, category),
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
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
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

# --- Helper Functions for Budget Calculations ---
def get_cycle_dates(cycle_start_day: int, target_date: date = None):
    if target_date is None:
        target_date = date.today()
    
    year = target_date.year
    month = target_date.month
    day = target_date.day
    
    # If today is before cycle start day, the cycle started in previous month
    if day < cycle_start_day:
        if month == 1:
            start_year = year - 1
            start_month = 12
        else:
            start_year = year
            start_month = month - 1
        
        max_days_in_start_month = calendar.monthrange(start_year, start_month)[1]
        actual_start_day = min(cycle_start_day, max_days_in_start_month)
        cycle_start = date(start_year, start_month, actual_start_day)
        
        max_days_in_cur_month = calendar.monthrange(year, month)[1]
        actual_end_day = min(cycle_start_day - 1, max_days_in_cur_month)
        cycle_end = date(year, month, actual_end_day)
    else:
        max_days_in_cur_month = calendar.monthrange(year, month)[1]
        actual_start_day = min(cycle_start_day, max_days_in_cur_month)
        cycle_start = date(year, month, actual_start_day)
        
        if month == 12:
            end_year = year + 1
            end_month = 1
        else:
            end_year = year
            end_month = month + 1
        
        max_days_in_end_month = calendar.monthrange(end_year, end_month)[1]
        actual_end_day = min(cycle_start_day - 1 if cycle_start_day > 1 else max_days_in_cur_month, max_days_in_end_month)
        
        if cycle_start_day == 1:
            cycle_end = date(year, month, max_days_in_cur_month)
        else:
            cycle_end = date(end_year, end_month, actual_end_day)
            
    total_cycle_days = (cycle_end - cycle_start).days + 1
    days_passed = max(1, (target_date - cycle_start).days + 1)
    days_remaining = max(1, (cycle_end - target_date).days + 1)
    
    return {
        "cycle_start": cycle_start,
        "cycle_end": cycle_end,
        "total_cycle_days": total_cycle_days,
        "days_passed": days_passed,
        "days_remaining": days_remaining
    }

# --- Pydantic Schemas ---
class AuthRequest(BaseModel):
    username: str
    password: str

class ConfigUpdate(BaseModel):
    monthly_income: float
    fixed_costs: float
    savings_target: float = 0.0
    emergency_buffer: float = 0.0
    cycle_start_day: int = 1
    currency: str = "INR"

class TransactionCreate(BaseModel):
    amount: float
    category: str
    date: Optional[str] = None
    note: str = ""
    type: str = "expense"

class TransactionUpdate(BaseModel):
    amount: float
    category: str
    date: str
    note: str = ""
    type: str = "expense"

class StatementImportItem(BaseModel):
    amount: float
    category: str
    date: str
    note: str = ""
    type: str = "expense"

class UpcomingExpenseCreate(BaseModel):
    title: str
    amount: float
    due_date: str
    category: str = "Bills"

class UpcomingExpenseUpdate(BaseModel):
    title: str
    amount: float
    due_date: str
    category: str = "Bills"
    is_paid: int = 0

class CategoryBudgetCreate(BaseModel):
    category: str
    monthly_limit: float

class SimulatorRequest(BaseModel):
    amount: float
    category: Optional[str] = "Other"

# --- Authentication Routes ---
@app.post("/api/register")
def register(auth: AuthRequest):
    username = auth.username.strip().lower()
    if not username or not auth.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT username FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")

    pwd_hash, salt = hash_password(auth.password)
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)", 
                   (username, pwd_hash, salt, now_iso))
    
    # Default initial configuration in INR for college student persona
    cursor.execute("""
        INSERT INTO config (username, monthly_income, fixed_costs, savings_target, emergency_buffer, cycle_start_day, currency)
        VALUES (?, 5000.0, 1000.0, 500.0, 300.0, 1, 'INR')
    """, (username,))

    # Default category limits for student lifestyle
    default_limits = [
        ("Food", 1500.0),
        ("Transport", 600.0),
        ("Entertainment", 500.0),
        ("Education", 400.0),
        ("Subscriptions", 200.0),
        ("Shopping", 300.0),
        ("Bills", 300.0),
        ("Other", 200.0)
    ]
    for cat, lim in default_limits:
        cursor.execute("INSERT OR REPLACE INTO category_budgets (username, category, monthly_limit) VALUES (?, ?, ?)",
                       (username, cat, lim))

    conn.commit()
    conn.close()

    token = create_token(username)
    return {"token": token, "username": username}

@app.post("/api/login")
def login(auth: AuthRequest):
    username = auth.username.strip().lower()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT password_hash, salt FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    stored_hash = row["password_hash"]
    salt = row["salt"]
    computed_hash, _ = hash_password(auth.password, salt)
    
    if computed_hash != stored_hash:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = create_token(username)
    return {"token": token, "username": username}

@app.get("/api/me")
def get_me(username: str = Depends(get_current_user)):
    return {"username": username}

# --- Config & Budget Setup Routes ---
@app.get("/api/config")
def get_config(username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM config WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {
            "username": username,
            "monthly_income": 5000.0,
            "fixed_costs": 1000.0,
            "savings_target": 500.0,
            "emergency_buffer": 300.0,
            "cycle_start_day": 1,
            "currency": "INR"
        }
    return dict(row)

@app.put("/api/config")
def update_config(cfg: ConfigUpdate, username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO config (username, monthly_income, fixed_costs, savings_target, emergency_buffer, cycle_start_day, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
            monthly_income = excluded.monthly_income,
            fixed_costs = excluded.fixed_costs,
            savings_target = excluded.savings_target,
            emergency_buffer = excluded.emergency_buffer,
            cycle_start_day = excluded.cycle_start_day,
            currency = excluded.currency
    """, (username, cfg.monthly_income, cfg.fixed_costs, cfg.savings_target, cfg.emergency_buffer, cfg.cycle_start_day, cfg.currency))
    conn.commit()
    conn.close()
    return {"status": "success", "config": cfg.model_dump() if hasattr(cfg, 'model_dump') else cfg.dict()}

# --- Core Calculation Engine ---
def calculate_budget_state(username: str, target_date: date = None):
    if target_date is None:
        target_date = date.today()
        
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Fetch user config
    cursor.execute("SELECT * FROM config WHERE username = ?", (username,))
    cfg_row = cursor.fetchone()
    if cfg_row:
        monthly_income = float(cfg_row["monthly_income"])
        fixed_costs = float(cfg_row["fixed_costs"])
        savings_target = float(cfg_row["savings_target"])
        emergency_buffer = float(cfg_row["emergency_buffer"])
        cycle_start_day = int(cfg_row["cycle_start_day"])
        currency = cfg_row["currency"]
    else:
        monthly_income, fixed_costs, savings_target, emergency_buffer, cycle_start_day, currency = (
            5000.0, 1000.0, 500.0, 300.0, 1, "INR"
        )
        
    cycle_info = get_cycle_dates(cycle_start_day, target_date)
    start_str = cycle_info["cycle_start"].isoformat()
    end_str = cycle_info["cycle_end"].isoformat()
    today_str = target_date.isoformat()
    
    # 2. Fetch total spent in current cycle (only expenses, subtract income if any)
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as additional_income
        FROM transactions 
        WHERE username = ? AND date >= ? AND date <= ?
    """, (username, start_str, end_str))
    tx_sum = cursor.fetchone()
    total_spent = float(tx_sum["total_expenses"])
    extra_income = float(tx_sum["additional_income"])
    
    # 3. Fetch spent today
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) FROM transactions 
        WHERE username = ? AND date = ? AND type = 'expense'
    """, (username, today_str))
    spent_today = float(cursor.fetchone()[0])
    
    # 4. Fetch unpaid upcoming reserved expenses in current cycle (including any overdue unpaid)
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) FROM upcoming_expenses 
        WHERE username = ? AND is_paid = 0 AND due_date <= ?
    """, (username, end_str))
    reserved_upcoming = float(cursor.fetchone()[0])
    
    # 5. Core SDA calculation
    # Disposable pool = Income + Extra Income - Fixed Costs - Savings Target - Emergency Buffer
    disposable_funds = max(0.0, (monthly_income + extra_income) - fixed_costs - savings_target - emergency_buffer)
    remaining_balance = disposable_funds - total_spent - reserved_upcoming
    
    days_remaining = cycle_info["days_remaining"]
    days_passed = cycle_info["days_passed"]
    total_cycle_days = cycle_info["total_cycle_days"]
    
    sda = max(0.0, remaining_balance / days_remaining) if days_remaining > 0 else 0.0
    
    # Velocity & Sustainable Pace
    actual_daily_velocity = total_spent / days_passed if days_passed > 0 else 0.0
    initial_daily_pace = disposable_funds / total_cycle_days if total_cycle_days > 0 else 0.0
    
    # Budget Health Status
    if remaining_balance < 0:
        health_status = "at_risk" # 🔴
        health_label = "Budget Deficit / At Risk"
    elif sda <= 0.2 * initial_daily_pace:
        health_status = "at_risk" # 🔴
        health_label = "Critically Low Allowance"
    elif actual_daily_velocity > 1.2 * sda and total_spent > 0:
        health_status = "caution" # 🟡
        health_label = "Spending Fast (Caution)"
    elif spent_today > sda and sda > 0:
        health_status = "caution" # 🟡
        health_label = "Over Today's Allowance"
    else:
        health_status = "healthy" # 🟢
        health_label = "Healthy & On Track"
        
    # SDA Change Explanation Generation
    sda_explanation = []
    if spent_today > 0:
        if spent_today > sda:
            over = spent_today - sda
            future_impact = over / max(1, days_remaining - 1) if days_remaining > 1 else over
            sda_explanation.append(f"Overspent by {currency} {over:.2f} today. Distributed as ~{currency} {future_impact:.2f}/day reduction across remaining {days_remaining-1} days.")
        else:
            under = sda - spent_today
            sda_explanation.append(f"Spending within today's allowance ({currency} {spent_today:.2f} of {currency} {sda:.2f}). Unspent money rolls over to boost future days.")
    else:
        sda_explanation.append(f"No expenses logged today yet. You have full {currency} {sda:.2f} available for today.")
        
    if reserved_upcoming > 0:
        daily_reserved_cost = reserved_upcoming / days_remaining
        sda_explanation.append(f"{currency} {reserved_upcoming:.2f} reserved for upcoming bills, protecting {currency} {daily_reserved_cost:.2f}/day from accidental spending.")

    # Calculate streak (consecutive days where spending <= calculated SDA or target)
    cursor.execute("""
        SELECT date, SUM(amount) as daily_spent 
        FROM transactions 
        WHERE username = ? AND type = 'expense' AND date >= ? AND date <= ?
        GROUP BY date ORDER BY date ASC
    """, (username, start_str, today_str))
    daily_spend_rows = {row["date"]: float(row["daily_spent"]) for row in cursor.fetchall()}
    
    # Calculate daily allowance progression for streak and calendar
    streak_count = 0
    check_day = target_date
    while check_day >= cycle_info["cycle_start"]:
        d_str = check_day.isoformat()
        d_spent = daily_spend_rows.get(d_str, 0.0)
        if d_spent <= sda or (d_spent == 0.0):
            streak_count += 1
            check_day -= timedelta(days=1)
        else:
            break

    conn.close()
    
    return {
        "monthly_income": monthly_income,
        "fixed_costs": fixed_costs,
        "savings_target": savings_target,
        "emergency_buffer": emergency_buffer,
        "reserved_upcoming": reserved_upcoming,
        "disposable_funds": round(disposable_funds, 2),
        "total_spent": round(total_spent, 2),
        "remaining_balance": round(remaining_balance, 2),
        "spent_today": round(spent_today, 2),
        "safe_daily_allowance": round(sda, 2),
        "days_remaining": days_remaining,
        "days_passed": days_passed,
        "total_cycle_days": total_cycle_days,
        "cycle_start": start_str,
        "cycle_end": end_str,
        "actual_daily_velocity": round(actual_daily_velocity, 2),
        "initial_daily_pace": round(initial_daily_pace, 2),
        "health_status": health_status,
        "health_label": health_label,
        "streak_count": streak_count,
        "sda_explanation": sda_explanation,
        "currency": currency
    }

# --- Dashboard API ---
@app.get("/api/dashboard")
def get_dashboard(username: str = Depends(get_current_user)):
    state = calculate_budget_state(username)
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Category Spending Breakdown
    cursor.execute("""
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE username = ? AND type = 'expense' AND date >= ? AND date <= ?
        GROUP BY category
        ORDER BY total DESC
    """, (username, state["cycle_start"], state["cycle_end"]))
    category_breakdown = [{"category": row["category"], "amount": round(float(row["total"]), 2)} for row in cursor.fetchall()]
    
    # Category limits comparison
    cursor.execute("SELECT category, monthly_limit FROM category_budgets WHERE username = ?", (username,))
    limits_map = {row["category"]: float(row["monthly_limit"]) for row in cursor.fetchall()}
    
    category_status = []
    cycle_pct = (state["days_passed"] / state["total_cycle_days"]) * 100
    for item in category_breakdown:
        cat = item["category"]
        spent = item["amount"]
        limit = limits_map.get(cat, 0.0)
        spent_pct = (spent / limit * 100) if limit > 0 else 0.0
        
        if limit == 0:
            status = "normal"
        elif spent > limit:
            status = "exceeded" # 🔴
        elif spent_pct >= 80 or (spent_pct > cycle_pct + 20):
            status = "warning" # 🟡
        else:
            status = "normal" # 🟢
            
        category_status.append({
            "category": cat,
            "spent": spent,
            "limit": limit,
            "percentage": round(spent_pct, 1),
            "status": status
        })
    
    # Daily spending history for charts (Daily vs SDA)
    cursor.execute("""
        SELECT date, SUM(amount) as amount 
        FROM transactions 
        WHERE username = ? AND type = 'expense' AND date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
    """, (username, state["cycle_start"], state["cycle_end"]))
    daily_map = {row["date"]: float(row["amount"]) for row in cursor.fetchall()}
    
    # Build complete array for cycle days
    start_dt = datetime.fromisoformat(state["cycle_start"]).date()
    today_dt = date.today()
    
    daily_history = []
    curr_dt = start_dt
    cumulative_spend = 0.0
    
    while curr_dt <= datetime.fromisoformat(state["cycle_end"]).date():
        dt_str = curr_dt.isoformat()
        is_past_or_today = curr_dt <= today_dt
        day_spent = daily_map.get(dt_str, 0.0) if is_past_or_today else None
        
        if day_spent is not None:
            cumulative_spend += day_spent
            
        daily_history.append({
            "date": dt_str,
            "day": curr_dt.day,
            "day_name": curr_dt.strftime("%a"),
            "spent": day_spent,
            "sda": state["safe_daily_allowance"],
            "cumulative_spent": round(cumulative_spend, 2) if is_past_or_today else None,
            "budget_burndown": round(max(0, state["disposable_funds"] - cumulative_spend), 2) if is_past_or_today else None
        })
        curr_dt += timedelta(days=1)
        
    conn.close()
    
    # Forecast metrics
    estimated_total_spend = state["actual_daily_velocity"] * state["total_cycle_days"]
    projected_remaining = state["disposable_funds"] - estimated_total_spend
    runout_days = int(state["remaining_balance"] / state["actual_daily_velocity"]) if state["actual_daily_velocity"] > 0 else 999
    
    return {
        **state,
        "category_breakdown": category_breakdown,
        "category_status": category_status,
        "daily_history": daily_history,
        "forecast": {
            "projected_remaining_balance": round(projected_remaining, 2),
            "estimated_cycle_spending": round(estimated_total_spend, 2),
            "runout_days_early": max(0, state["days_remaining"] - runout_days) if runout_days < state["days_remaining"] else 0,
            "runout_date": (today_dt + timedelta(days=runout_days)).isoformat() if runout_days < state["days_remaining"] else None
        }
    }

# --- Transactions CRUD & Search/Filter ---
@app.get("/api/transactions")
def get_transactions(
    category: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    username: str = Depends(get_current_user)
):
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM transactions WHERE username = ?"
    params = [username]
    
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
        
    if search:
        query += " AND (note LIKE ? OR category LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
        
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
        
    query += " ORDER BY date DESC, id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

@app.post("/api/transactions")
def add_transaction(tx: TransactionCreate, username: str = Depends(get_current_user)):
    tx_date = tx.date if tx.date else date.today().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO transactions (username, amount, category, date, note, type) VALUES (?, ?, ?, ?, ?, ?)",
        (username, abs(tx.amount), tx.category, tx_date, tx.note, tx.type)
    )
    tx_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    updated_state = calculate_budget_state(username)
    return {"status": "success", "id": tx_id, "state": updated_state}

@app.put("/api/transactions/{tx_id}")
def update_transaction(tx_id: int, tx: TransactionUpdate, username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE transactions SET amount = ?, category = ?, date = ?, note = ?, type = ? WHERE id = ? AND username = ?",
        (abs(tx.amount), tx.category, tx.date, tx.note, tx.type, tx_id, username)
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Transaction not found")
    conn.commit()
    conn.close()
    
    updated_state = calculate_budget_state(username)
    return {"status": "success", "state": updated_state}

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int, username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ? AND username = ?", (tx_id, username))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Transaction not found")
    conn.commit()
    conn.close()
    
    updated_state = calculate_budget_state(username)
    return {"status": "success", "state": updated_state}

# --- BHIM UPI Statement Parsing & Batch Import ---
BHIM_TRANSACTION_PATTERN = re.compile(
    r"(?P<date>\d{2}/\d{2}/\d{4})\s+"
    r"(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<bank>.*?)\s+"
    r"(?P<account>X{4,}\d*)\s+"
    r"(?P<sender>.*?)\s{2,}"
    r"(?P<receiver>.*?)\s{2,}"
    r"(?P<reference>\d+)\s+"
    r"(?P<payment>PAY|COLLECT)\s+"
    r"(?P<amount>[\d,]+(?:\.\d{1,2})?)\s+"
    r"(?P<direction>DR|CR)\s+"
    r"(?P<status>SUCCESS|PENDING|FAILED)",
    re.IGNORECASE,
)

@app.post("/api/transactions/bhim-upi-preview")
async def preview_bhim_upi_statement(request: Request, username: str = Depends(get_current_user)):
    content_type = request.headers.get("content-type", "")
    if "application/pdf" not in content_type:
        raise HTTPException(status_code=415, detail="Please upload a PDF exported from the BHIM UPI app")

    pdf_bytes = await request.body()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="The uploaded PDF is empty")

    try:
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(pdf_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        try:
            result = subprocess.run(
                ["pdftotext", "-layout", "-", "-"],
                input=pdf_bytes,
                capture_output=True,
                check=True,
            )
            text = result.stdout.decode("utf-8", errors="replace")
        except (FileNotFoundError, subprocess.CalledProcessError) as exc:
            raise HTTPException(status_code=400, detail="We could not read that PDF. Please export the statement again from BHIM UPI.") from exc

    if "Transaction History" not in text or "DR/CR" not in text:
        raise HTTPException(status_code=400, detail="This does not look like a BHIM UPI transaction-statement PDF")

    transactions = []
    for match in BHIM_TRANSACTION_PATTERN.finditer(text.replace("\n", " ")):
        row = match.groupdict()
        if row["status"].upper() != "SUCCESS":
            continue
        transactions.append({
            "date": datetime.strptime(row["date"], "%d/%m/%Y").date().isoformat(),
            "description": row["receiver"] if row["direction"].upper() == "DR" else row["sender"],
            "amount": float(row["amount"].replace(",", "")),
            "type": "expense" if row["direction"].upper() == "DR" else "income",
            "reference": row["reference"],
        })

    if not transactions:
        raise HTTPException(status_code=400, detail="No successful BHIM UPI transactions were found in this PDF")
    return {"transactions": transactions}

@app.post("/api/transactions/import")
@app.post("/api/transactions/csv-import", deprecated=True, include_in_schema=False)
def import_statement_transactions(items: List[StatementImportItem], username: str = Depends(get_current_user)):
    if not items:
        raise HTTPException(status_code=400, detail="No transactions provided")
        
    conn = get_db()
    cursor = conn.cursor()
    
    # Duplicate check against existing database records
    cursor.execute("SELECT amount, date, note FROM transactions WHERE username = ?", (username,))
    existing_records = {(row["amount"], row["date"], (row["note"] or "").strip().lower()) for row in cursor.fetchall()}
    
    inserted_count = 0
    duplicate_count = 0
    
    for item in items:
        key = (item.amount, item.date, item.note.strip().lower())
        if key in existing_records:
            duplicate_count += 1
            continue
            
        cursor.execute(
            "INSERT INTO transactions (username, amount, category, date, note, type) VALUES (?, ?, ?, ?, ?, ?)",
            (username, abs(item.amount), item.category, item.date, item.note, item.type)
        )
        existing_records.add(key)
        inserted_count += 1
        
    conn.commit()
    conn.close()
    
    updated_state = calculate_budget_state(username)
    return {
        "status": "success",
        "inserted_count": inserted_count,
        "duplicate_count": duplicate_count,
        "state": updated_state
    }

# --- Upcoming / Reserved Expenses ---
@app.get("/api/upcoming-expenses")
def get_upcoming_expenses(username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM upcoming_expenses WHERE username = ? ORDER BY is_paid ASC, due_date ASC", (username,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/upcoming-expenses")
def add_upcoming_expense(expense: UpcomingExpenseCreate, username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO upcoming_expenses (username, title, amount, due_date, category, is_paid) VALUES (?, ?, ?, ?, ?, 0)",
        (username, expense.title, abs(expense.amount), expense.due_date, expense.category)
    )
    exp_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    updated_state = calculate_budget_state(username)
    return {"status": "success", "id": exp_id, "state": updated_state}

@app.put("/api/upcoming-expenses/{exp_id}")
def update_upcoming_expense(exp_id: int, expense: UpcomingExpenseUpdate, username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE upcoming_expenses SET title = ?, amount = ?, due_date = ?, category = ?, is_paid = ? WHERE id = ? AND username = ?",
        (expense.title, abs(expense.amount), expense.due_date, expense.category, expense.is_paid, exp_id, username)
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Upcoming expense not found")
        
    # If marked as paid, also auto-record transaction
    if expense.is_paid:
        cursor.execute(
            "INSERT INTO transactions (username, amount, category, date, note, type) VALUES (?, ?, ?, ?, ?, 'expense')",
            (username, abs(expense.amount), expense.category, date.today().isoformat(), f"[Paid Reserved] {expense.title}")
        )
        
    conn.commit()
    conn.close()
    
    updated_state = calculate_budget_state(username)
    return {"status": "success", "state": updated_state}

@app.delete("/api/upcoming-expenses/{exp_id}")
def delete_upcoming_expense(exp_id: int, username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM upcoming_expenses WHERE id = ? AND username = ?", (exp_id, username))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Upcoming expense not found")
    conn.commit()
    conn.close()
    
    updated_state = calculate_budget_state(username)
    return {"status": "success", "state": updated_state}

# --- Category Budgets Management ---
@app.get("/api/category-budgets")
def get_category_budgets(username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM category_budgets WHERE username = ?", (username,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/category-budgets")
def set_category_budgets(budgets: List[CategoryBudgetCreate], username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    for b in budgets:
        cursor.execute(
            "INSERT OR REPLACE INTO category_budgets (username, category, monthly_limit) VALUES (?, ?, ?)",
            (username, b.category, max(0.0, b.monthly_limit))
        )
    conn.commit()
    conn.close()
    return {"status": "success"}

# --- What-If Simulator API ---
@app.post("/api/simulator")
def run_what_if_simulator(req: SimulatorRequest, username: str = Depends(get_current_user)):
    state = calculate_budget_state(username)
    cost = abs(req.amount)
    
    current_sda = state["safe_daily_allowance"]
    days_remaining = state["days_remaining"]
    new_remaining = state["remaining_balance"] - cost
    new_sda = max(0.0, new_remaining / days_remaining) if days_remaining > 0 else 0.0
    daily_drop = current_sda - new_sda
    
    currency = state["currency"]
    
    if new_remaining < 0:
        score = "risk"
        verdict = "🔴 High Risk — Will cause budget deficit"
        analysis = f"This purchase exceeds your remaining disposable funds by {currency} {abs(new_remaining):.2f}. Your SDA will drop to zero."
    elif new_sda < 0.3 * state["initial_daily_pace"]:
        score = "caution"
        verdict = "🟡 Tight Squeeze — Significantly reduces daily flexibility"
        analysis = f"Buying this will reduce your daily allowance by {currency} {daily_drop:.2f}/day (from {currency} {current_sda:.2f} down to {currency} {new_sda:.2f}) for the remaining {days_remaining} days."
    else:
        score = "safe"
        verdict = "🟢 Safe to Buy — Well within budget"
        analysis = f"You can comfortably afford this. Your daily allowance will adjust slightly from {currency} {current_sda:.2f} to {currency} {new_sda:.2f} (-{currency} {daily_drop:.2f}/day)."

    return {
        "item_amount": cost,
        "category": req.category,
        "current_sda": current_sda,
        "new_sda": round(new_sda, 2),
        "daily_reduction": round(daily_drop, 2),
        "days_remaining": days_remaining,
        "affordability_score": score,
        "verdict": verdict,
        "analysis": analysis,
        "currency": currency
    }

# --- Spending Insights Engine ---
@app.get("/api/insights")
def get_insights(username: str = Depends(get_current_user)):
    state = calculate_budget_state(username)
    insights = []
    currency = state["currency"]
    
    # 1. Velocity insight
    diff = state["actual_daily_velocity"] - state["initial_daily_pace"]
    if diff > 10:
        insights.append({
            "type": "warning",
            "title": "Spending Velocity Alert",
            "message": f"You are spending {currency} {diff:.2f}/day faster than your sustainable baseline pace ({currency} {state['actual_daily_velocity']:.2f}/day vs {currency} {state['initial_daily_pace']:.2f}/day).",
            "icon": "TrendingUp"
        })
    elif diff < -10 and state["total_spent"] > 0:
        insights.append({
            "type": "positive",
            "title": "Excellent Pacing",
            "message": f"You are spending {currency} {abs(diff):.2f}/day below your baseline budget! Unspent money is boosting your future SDA.",
            "icon": "Sparkles"
        })

    # 2. Runway / Deficit insight
    if state["remaining_balance"] <= 0:
        insights.append({
            "type": "danger",
            "title": "Budget Limit Reached",
            "message": f"You have exhausted discretionary funds for this cycle. Switch to essential spending only.",
            "icon": "AlertTriangle"
        })
    elif state["actual_daily_velocity"] > 0:
        projected_runout_days = int(state["remaining_balance"] / state["actual_daily_velocity"])
        if projected_runout_days < state["days_remaining"]:
            early_days = state["days_remaining"] - projected_runout_days
            insights.append({
                "type": "warning",
                "title": "Early Depletion Risk",
                "message": f"At your current spending velocity, discretionary funds will run out {early_days} days before your cycle ends.",
                "icon": "CalendarX"
            })

    # 3. Micro-action tip (tailored to student budget)
    if state["days_remaining"] > 3:
        cut_amount = 30.0 if currency == "INR" else 2.0
        month_end_gain = cut_amount * state["days_remaining"]
        insights.append({
            "type": "tip",
            "title": "Micro-Savings Opportunity",
            "message": f"Trimming just {currency} {cut_amount:.0f}/day (like skipping one canteen treat) leaves you with {currency} {month_end_gain:.0f} extra at cycle end.",
            "icon": "PiggyBank"
        })

    # 4. Streak encouragement
    if state["streak_count"] >= 3:
        insights.append({
            "type": "achievement",
            "title": f"🔥 {state['streak_count']}-Day Streak Active!",
            "message": f"Fantastic discipline! You've stayed within your allowance for {state['streak_count']} consecutive days.",
            "icon": "Flame"
        })

    return {"insights": insights, "health_status": state["health_status"], "health_label": state["health_label"]}

# --- Streak Calendar API ---
@app.get("/api/calendar-streak")
def get_calendar_streak(username: str = Depends(get_current_user)):
    state = calculate_budget_state(username)
    conn = get_db()
    cursor = conn.cursor()
    
    start_dt = datetime.fromisoformat(state["cycle_start"]).date()
    end_dt = datetime.fromisoformat(state["cycle_end"]).date()
    today_dt = date.today()
    
    cursor.execute("""
        SELECT date, SUM(amount) as total_spent, COUNT(id) as count
        FROM transactions
        WHERE username = ? AND type = 'expense' AND date >= ? AND date <= ?
        GROUP BY date
    """, (username, state["cycle_start"], state["cycle_end"]))
    day_spend = {row["date"]: {"spent": float(row["total_spent"]), "count": int(row["count"])} for row in cursor.fetchall()}
    conn.close()
    
    calendar_days = []
    curr = start_dt
    sda = state["safe_daily_allowance"]
    
    while curr <= end_dt:
        d_str = curr.isoformat()
        is_today = curr == today_dt
        is_past = curr < today_dt
        is_future = curr > today_dt
        
        info = day_spend.get(d_str, {"spent": 0.0, "count": 0})
        spent = info["spent"]
        
        if is_future:
            status = "future"
        elif spent == 0:
            status = "under" # Zero spend is under budget
        elif spent <= sda * 0.9:
            status = "under" # 🟢 Under budget
        elif spent <= sda * 1.1:
            status = "near" # 🟡 Near limit
        else:
            status = "over" # 🔴 Over budget
            
        calendar_days.append({
            "date": d_str,
            "day": curr.day,
            "spent": round(spent, 2),
            "sda": round(sda, 2),
            "status": status,
            "is_today": is_today,
            "tx_count": info["count"]
        })
        curr += timedelta(days=1)
        
    return {
        "streak_count": state["streak_count"],
        "calendar_days": calendar_days,
        "cycle_start": state["cycle_start"],
        "cycle_end": state["cycle_end"]
    }

# --- Demo Data Seeder ---
@app.post("/api/demo-data")
def seed_demo_data(username: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Update config with student budget baseline (₹5,000 monthly allowance from parents)
    cursor.execute("""
        UPDATE config SET 
            monthly_income = 5000.0, 
            fixed_costs = 1000.0, 
            savings_target = 500.0, 
            emergency_buffer = 300.0, 
            cycle_start_day = 1,
            currency = 'INR'
        WHERE username = ?
    """, (username,))
    
    # 2. Reset transactions & upcoming expenses
    cursor.execute("DELETE FROM transactions WHERE username = ?", (username,))
    cursor.execute("DELETE FROM upcoming_expenses WHERE username = ?", (username,))
    
    today = date.today()
    cycle_info = get_cycle_dates(1, today)
    start_dt = cycle_info["cycle_start"]
    end_dt = cycle_info["cycle_end"]
    
    # 3. Realistic Student Daily Expenses across the whole month (₹5,000 monthly allowance scale)
    daily_templates = [
        [("Food", 40.0, "Canteen Samosa & Tea"), ("Transport", 20.0, "College Bus Ticket")],
        [("Food", 60.0, "Veg Thali at Canteen"), ("Transport", 30.0, "Metro Card Token")],
        [("Education", 25.0, "Assignment Printouts & Xerox"), ("Food", 15.0, "Chai")],
        [("Subscriptions", 59.0, "Spotify Student Plan"), ("Food", 40.0, "Cold Drink")],
        [("Shopping", 80.0, "Class Notebook & Pen"), ("Food", 35.0, "Snacks")],
        [("Food", 110.0, "Shawarma Roll with hostel mates"), ("Transport", 30.0, "Auto Share")],
        [], # Zero spend day (Hostel mess meals / Library study)
        [("Food", 50.0, "Late Night Maggi & Coffee"), ("Education", 25.0, "Photocopy Notes")],
        [("Transport", 40.0, "Auto share to Station"), ("Food", 30.0, "Tea & Biscuit")],
        [("Food", 70.0, "Fresh Fruit Juice & Toast")],
        [("Entertainment", 180.0, "Movie Ticket (Student Discount)"), ("Food", 60.0, "Popcorn")],
        [("Food", 45.0, "South Indian Dosa at Canteen"), ("Transport", 20.0, "Bus Fare")],
        [("Other", 60.0, "College Pharmacy - Bandages & Medicine")],
        [], # Zero spend day (Eating at hostel mess)
        [("Food", 120.0, "Weekend Canteen Treat"), ("Transport", 40.0, "Auto Ride")],
        [("Subscriptions", 79.0, "YouTube Student Plan"), ("Food", 20.0, "Chai Break")],
        [("Education", 150.0, "Used Textbook from Senior")],
        [("Food", 35.0, "Campus Snack"), ("Transport", 30.0, "Local Metro")],
        [("Shopping", 60.0, "Highlighters & Sticky Notes"), ("Food", 40.0, "Milkshake")],
        [("Food", 55.0, "Canteen Lunch"), ("Food", 25.0, "Evening Puff")],
        [("Entertainment", 80.0, "Gaming Session at Cybercafe"), ("Food", 35.0, "Snack Bar")],
        [], # Zero spend day (Studying in hostel)
        [("Food", 60.0, "Fresh Fruits from Campus Gate"), ("Transport", 30.0, "Auto Fare")],
        [("Food", 80.0, "Noodles & Momos"), ("Other", 40.0, "Hostel Laundry Service")],
        [("Transport", 50.0, "Shared Taxi"), ("Food", 30.0, "Lunch")],
        [("Food", 60.0, "Egg Fried Rice"), ("Food", 25.0, "Lemon Soda")],
        [("Entertainment", 120.0, "College Fest Entry Pass")],
        [("Food", 50.0, "Fruit Salad Bowl"), ("Transport", 30.0, "Metro")]
    ]
    
    # Iterate through all days of the cycle up to today
    curr = start_dt
    day_idx = 0
    while curr <= today:
        template = daily_templates[day_idx % len(daily_templates)]
        for cat, amt, note in template:
            cursor.execute(
                "INSERT INTO transactions (username, amount, category, date, note, type) VALUES (?, ?, ?, ?, ?, 'expense')",
                (username, amt, cat, curr.isoformat(), note)
            )
        curr += timedelta(days=1)
        day_idx += 1
        
    # 4. Realistic Student Upcoming Reserved Expenses
    sample_upcoming = [
        ("College Exam Registration Fee", 500.0, (today + timedelta(days=2)).isoformat() if (today + timedelta(days=2)) <= end_dt else today.isoformat(), "Education"),
        ("Mobile 5G Data Pack Recharge", 299.0, (today + timedelta(days=3)).isoformat() if (today + timedelta(days=3)) <= end_dt else today.isoformat(), "Bills"),
        ("Project Binding & Lab Report", 120.0, (today + timedelta(days=10)).isoformat(), "Education")
    ]
    for title, amt, due, cat in sample_upcoming:
        cursor.execute(
            "INSERT INTO upcoming_expenses (username, title, amount, due_date, category, is_paid) VALUES (?, ?, ?, ?, ?, 0)",
            (username, title, amt, due, cat)
        )
        
    # 5. Category budgets matching ₹5k student allowance
    cat_budgets = [
        ("Food", 1500.0),
        ("Transport", 600.0),
        ("Entertainment", 500.0),
        ("Shopping", 300.0),
        ("Education", 400.0),
        ("Bills", 300.0),
        ("Subscriptions", 200.0),
        ("Other", 200.0)
    ]
    for cat, lim in cat_budgets:
        cursor.execute("INSERT OR REPLACE INTO category_budgets (username, category, monthly_limit) VALUES (?, ?, ?)",
                       (username, cat, lim))
                       
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "Demo data populated for college student persona (₹5,000 monthly allowance)!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
