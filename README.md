Here is a clear breakdown of all the technologies, tools, and concepts used to build and deploy **FlowCap**.

---

### **1. Core Software Stack**

* **Node.js & npm:** The JavaScript runtime and package manager used to install libraries and manage project dependencies.
* **React (v18+):** The frontend UI library used to build the single-page application and manage component states (`useState`, `useEffect`).
* **Vite:** The lightning-fast frontend build tool and local development server used to create and serve the React app.
* **Tailwind CSS (v4) & `@tailwindcss/vite`:** The utility-first CSS framework and Vite plugin used to build the dark-mode dashboard UI without writing custom CSS files.
* **Python (3.x):** The backend programming language used to write the application business logic and financial calculations.
* **FastAPI:** The modern, high-performance Python web framework used to build the REST API endpoints (`/api/dashboard`, `/api/transactions`).
* **Uvicorn & Gunicorn:** The ASGI web server implementation (Uvicorn) and production HTTP server (Gunicorn) used to run the FastAPI application locally and in production.
* **SQLite:** The lightweight, file-based SQL database engine built into Python, used to store budget configurations and expense logs.

---

### **2. Development Tools & Utilities**

* **Git & GitHub:** Version control software (Git) and online repository host (GitHub) used to track code changes and trigger automatic cloud deployments.
* **Pydantic:** Python data validation library (used internally by FastAPI) to define and validate incoming JSON data payloads.
* **CORS Middleware (`CORSMiddleware`):** Security configuration enabled on the FastAPI backend allowing cross-origin requests from the React frontend browser client.

---

### **3. Production & Hosting Platforms**

* **Vercel:** Cloud platform used to host and serve the static React frontend app globally via CDN.
* **Render:** Cloud platform used to host the live Python/FastAPI backend Web Service.

---

### **4. Financial & Algorithmic Concepts**

* **Safe Daily Allowance (SDA) Algorithm:** The dynamic formula ($(\text{Disposable Funds} - \text{Total Spent}) / \text{Days Remaining}$) that auto-adjusts daily spending limits.
* **Pacing Velocity Model:** The core financial logic that replaces static monthly limits with real-time daily budget feedback loops.
