# FlowCap — Micro-Budgeting & Dynamic Allowance Web App

Build a modern, responsive FinTech web app called **FlowCap** for students and young professionals managing a fixed monthly income/stipend.

## Core Idea

Traditional budgets give users a large monthly number that is easy to overspend. FlowCap converts the monthly budget into a **dynamic Safe Daily Allowance (SDA)** that automatically changes whenever the user spends money.

The core loop is:

**Set Budget → Track Spending → Recalculate SDA → Warn/Explain → Adapt**

---

## 1. Dashboard

Create a clean dashboard showing:

* **Safe Daily Allowance (SDA)** — the most prominent number
* Remaining disposable money
* Days remaining in the budget cycle
* Total spent this month
* Today's spending
* Current spending velocity
* Budget health/status: 🟢 Healthy / 🟡 Caution / 🔴 At Risk
* Current under-budget streak

Include:

* Daily spending vs SDA chart
* Category spending breakdown
* Budget progress/burn-down chart

---

## 2. Dynamic SDA Engine

Use this basic formula:

**SDA = (Disposable Funds − Fixed Expenses − Total Spent − Reserved Upcoming Expenses − Emergency Buffer) / Days Remaining**

Recalculate the SDA whenever a transaction is added, edited, deleted, or imported.

### Underspending

If the user spends less than today's SDA, the unused amount effectively rolls into the remaining budget, slightly increasing future SDA.

### Overspending

If the user spends more than today's SDA, distribute the overspend across the remaining days instead of simply marking the user as failed.

Example:

> Today's SDA: ₹400
> Spent: ₹600
> Overspent: ₹200
> New SDA for remaining days: automatically reduced.

Always show **why the SDA changed**.

---

## 3. Transactions

Allow users to:

* Add transaction manually
* Edit/delete transactions
* Enter amount, description, category and date
* Search/filter transactions
* View transaction history

Categories:

* Food
* Transport
* Entertainment
* Shopping
* Education
* Bills
* Subscriptions
* Other

---

## 4. BHIM UPI PDF Import

Allow users to upload a BHIM UPI transaction-statement PDF.

Features:

* Drag-and-drop upload
* Preview transactions before importing
* Extract Date, recipient/sender, Amount, and Debit/Credit from the BHIM format
* Import transactions into the dashboard
* Recalculate SDA after import
* Basic duplicate/invalid transaction detection

---

## 5. Budget Setup

During onboarding, ask for:

* Monthly income/stipend
* Fixed expenses
* Savings target
* Emergency buffer
* Budget cycle dates
* Category limits

Calculate the user's initial disposable funds and SDA.

Also allow upcoming expenses such as:

> College fee — ₹2,500 — September 5

Reserved expenses should automatically reduce available spending money.

---

## 6. Category Budgets & Alerts

Allow users to set category caps.

Example:

**Food: ₹3,000 / ₹4,000**

Show progress bars and warn users when they approach/exceed a category limit.

Examples:

* 🟡 80% used
* 🔴 Category budget exceeded
* 🟢 Under normal pace

---

## 7. Spending Insights

Provide simple rule-based insights such as:

* "You are spending ₹80/day faster than your sustainable pace."
* "Food spending is 20% higher than last month."
* "You are projected to run out of discretionary money 4 days early."
* "Reducing spending by ₹100/day would increase your month-end balance by ₹2,300."

---

## 8. Streak Tracking

Track consecutive days where spending stays within the SDA.

Display prominently:

**🔥 7 Day Under-Budget Streak**

Also provide a calendar showing daily status:

🟢 Under budget
🟡 Near limit
🔴 Over budget

---

## 9. What-If Simulator

Add a simple calculator where users can enter a hypothetical purchase.

Example:

> "Can I afford ₹2,000 shoes?"

Show:

**Current SDA: ₹400/day**
**After purchase: ₹313/day**

Explain how the purchase affects their remaining daily spending capacity.

---

## 10. Forecast

Show projected end-of-month results based on current spending velocity:

* Projected remaining balance
* Estimated spending until cycle end
* Estimated date money will run out, if applicable

---

## 11. UI/UX

Design should feel like a polished modern FinTech product.

* Clean minimal interface
* Mobile responsive
* Dashboard-first
* Cards and charts
* Clear green/yellow/red budget states
* Prominent SDA number
* Smooth animations where appropriate
* Dark/light mode if easy to implement

Use **INR (₹)** by default.

---

## 12. Tech Stack

Frontend:

* React or Vue
* Modern CSS/Tailwind

Backend:

* Python FastAPI

Database:

* SQLite

Charts:

* Recharts or equivalent

Keep the architecture simple and modular.

---

## Most Important Requirement

The app must **actually work**, not just be a UI mockup.

The SDA calculation and transaction updates must be functional.

The main differentiator should be clearly visible:

### Traditional Budget

"₹15,000 left this month."

### FlowCap

"₹487 is safe to spend today."

Every transaction should immediately affect the user's future spending allowance.
