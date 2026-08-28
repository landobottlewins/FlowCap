# FlowCap Development Log

## Why I chose this idea

I chose to build FlowCap because budgeting is often presented as one large number for the month, which makes it easy to overspend early and difficult to understand what is actually safe to spend today. FlowCap turns a monthly budget into a dynamic **Safe Daily Allowance (SDA)** that adapts after every expense.

The idea also gave me the opportunity to build a complete product rather than only a UI: authentication, backend APIs, database storage, financial calculations, charts, imports, and Docker deployment. As my first full-stack development project for the Finova recruitment challenge, I wanted to make something practical for students and young professionals managing a fixed stipend or monthly income.

## Features implemented

- User registration and login using JWT authentication
- Budget onboarding for monthly income, fixed costs, savings target, emergency buffer, currency, and cycle start day
- Dynamic Safe Daily Allowance calculation based on remaining disposable money and days in the current cycle
- Dashboard with remaining balance, daily allowance, spending totals, budget health, and spending velocity
- Manual transaction creation, editing, deletion, search, filtering, and categorisation
- BHIM UPI transaction-statement PDF import with a reviewable, editable transaction preview
- Debit/credit recognition, automatic category suggestions, and duplicate detection during imports
- Upcoming-expense reservations that reduce the available budget before a bill is paid
- Category budgets and progress indicators
- Spending insights, forecast analytics, and charts
- Under-budget streak tracking and calendar view
- What-if purchase simulator to show how a possible expense changes the SDA
- Demo-data generation for exploring the dashboard
- Responsive React interface with a modern FinTech-style design
- Dockerfiles and Docker Compose configuration for running the frontend and backend together

## Challenges and how I solved them

### Building a real dynamic budget calculation

The main challenge was making the Safe Daily Allowance update consistently whenever a user changed their financial data. I centralised the budget-state calculation in the backend and refreshed the dashboard after transactions, imports, category changes, and upcoming-expense updates. This kept the calculation functional rather than presenting it as a static UI number.

### Parsing BHIM UPI statements

BHIM exports transaction history as a PDF rather than CSV. I changed the import flow to accept the PDF, extract its transaction rows, ignore unsuccessful payments, identify debit versus credit entries, and give the user a chance to review the results before import. I also added duplicate checks so importing the same statement again does not create duplicate transactions.

### PDF upload in Docker

I faced an issue where the PDF upload works when I run the Python server locally, but not reliably in the Docker deployment. The PDF extraction depends on the runtime PDF-reading tools and their dependencies being available inside the backend container. The current implementation includes a Python PDF reader and a command-line fallback, but the Docker image needs to include and verify the same tools as the local Python environment.

### Connecting frontend and backend services

Running frontend and backend services together required CORS configuration, API authentication headers, and Docker Compose port mappings. Docker Compose makes local startup straightforward, but a public deployment also needs a production API URL, HTTPS, and persistent database storage.

## What I would improve with more time

- Fix and fully test BHIM PDF upload in Docker by installing the required PDF tooling in the backend image and adding automated tests using sample statements.
- Replace the hard-coded frontend API URL with environment-based configuration for local, Docker, and public deployments.
- Move SQLite data to a persistent Docker volume and migrate production deployments to PostgreSQL for safer concurrent, multi-user usage and managed backups.
- Move the JWT secret into environment variables and strengthen production security settings.
- Add automated frontend, API, PDF-import, and end-to-end tests.

