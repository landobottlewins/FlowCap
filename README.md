# FlowCap

FlowCap is my first full-stack development project, built for the Finova recruitment challenge. It is a personal-finance app for students and young professionals who want a clearer answer than “how much money is left this month?”

Instead, FlowCap calculates a **Safe Daily Allowance (SDA)**: the amount that is safe to spend today while staying on track for the rest of the budget cycle.

## Features

- Dynamic Safe Daily Allowance that updates after every transaction
- Budget onboarding for income, fixed expenses, savings target, emergency buffer, and cycle start date
- Manual transaction creation, editing, deletion, search, and filters
- BHIM UPI transaction-statement PDF import with an editable preview
- Automatic debit/credit detection, categorisation, and duplicate detection for imported UPI transactions
- Upcoming-expense reservations so planned bills reduce available spending
- Category spending caps with progress indicators
- Dashboard metrics, spending charts, budget health, and rule-based insights
- Under-budget streak calendar
- What-if purchase simulator and end-of-cycle forecast
- JWT-based authentication and per-user data

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS |
| Visuals | Recharts, Lucide React |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite |
| Authentication | JSON Web Tokens (PyJWT) |
| PDF parsing | pypdf, with a `pdftotext` fallback |
| Deployment | Docker and Docker Compose |

## Run with Docker

### Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) with Docker Compose v2

### Start the application

From the repository root, build the images and start both services:

```bash
docker compose up --build -d
```

Open the app at [http://localhost:5173](http://localhost:5173). The FastAPI API is available at [http://localhost:8000](http://localhost:8000), with interactive API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

### Useful commands

```bash
# Follow logs from both services
docker compose logs -f

# Stop the services without removing containers
docker compose stop

# Start stopped services again
docker compose start

# Stop and remove the containers
docker compose down
```

> FlowCap uses SQLite. The current Docker setup keeps the database inside the backend container, so avoid `docker compose down` if you need to retain local data. For a production deployment, mount the SQLite database on persistent storage or move to a managed database.

## Project structure

```text
FlowCap/
├── frontend/          # React/Vite client served by Nginx in Docker
├── backend/           # FastAPI API and SQLite database logic
├── docker-compose.yml # Starts the frontend and backend together
└── features.md        # Product requirements and feature notes
```

## Safe Daily Allowance

```text
SDA = (disposable funds − fixed expenses − total spent
       − reserved upcoming expenses − emergency buffer) / days remaining
```

This makes the budget adapt as spending changes, so overspending today is reflected in the amount available for the remaining days.

<img width="961" height="1384" alt="image" src="https://github.com/user-attachments/assets/6df7991c-49ce-4e50-9979-c7bb73c4c4d6" />

