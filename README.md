# NetSage AI

**AI-Assisted Network Troubleshooting Helper for Cisco Packet Tracer Labs**

NetSage AI bridges network engineering theory and automated diagnostics. Given a fault symptom, topology context, and Cisco IOS `show` command outputs from a Packet Tracer lab, NetSage AI suggests a root cause, OSI layer, confidence score, next diagnostic commands, and concrete remediation steps.

Every AI diagnosis is reviewed by a human engineer (Accept / Edit / Reject), and all corrections are captured in a transparent **Responsible AI Audit Log** with real-time telemetry on an **Analytics Dashboard**.

---

## Key Features

- **32 Realistic Packet Tracer Lab Scenarios:** Covering VLANs, Subnetting, Inter-VLAN Routing, ACLs, NAT/PAT, DHCP, DNS, STP, Switching, and Interface misconfigurations across OSI Layers 1–4.
- **Dual-Engine Diagnosis:**
  - **Free-Tier AI LLMs:** Powered by Google Gemini (`gemini-1.5-flash`) or Groq (`llama-3.3-70b-versatile`) with structured JSON schema output.
  - **Offline Heuristic Engine:** Works seamlessly out-of-the-box even without an active internet connection or API keys.
- **Deterministic Rule Checker:** A pure Python safety net that validates interface states, subnet masks, gateway matches, duplicate IPs, VLAN assignments, default routes, and ACLs without LLM hallucinations.
- **Human-in-the-Loop Review:** Engineers verify, edit, or reject AI diagnoses. Modifications automatically generate audit trail records.
- **Role-Based Access Control & User Management:**
  - Secure PBKDF2 salted password hashing & HMAC signed tokens.
  - Role-based separation for **Regular Users** and **Administrators**.
  - **Admin Console:** Real-time visibility into registered users, individual user activity audits, account suspension/reactivation, and user deletion.
- **Interactive Telemetry Dashboard:** Visualizes AI-Human agreement rates, fault distributions by OSI layer and concept, severity breakdowns, and review progress.
- **Cloud & Production Ready:** Engineered with dual-route compatibility (`/api` and root paths), Render Blueprint specification (`render.yaml`), CORS origin negotiation, and `/healthz` health monitoring.

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, React Router v6 | Single Page App, Context API, Lucide Icons, Recharts, Custom CSS |
| **Backend** | Python 3.10+, FastAPI, Uvicorn | Async REST API, Pydantic data validation, PyMongo |
| **Database** | MongoDB Atlas / Local MongoDB | Automated index creation, auto-seeding of 32 cases and admin |
| **AI Layer** | Google Gemini / Groq / Heuristic | Free-tier LLMs via HTTP APIs + offline fallback engine |
| **Security** | PBKDF2-HMAC-SHA256, HMAC Tokens | Secure authentication, role verification, and audit logging |

---

## Project Structure

```
netsage-ai/
├── backend/
│   ├── app.py                # FastAPI main application & API routes
│   ├── auth.py               # Authentication, token management, RBAC & audit logging
│   ├── ai_service.py         # Multi-provider AI diagnosis (Gemini, Groq, offline heuristic)
│   ├── rule_checker.py       # Deterministic network rule checking engine
│   ├── seed.py               # MongoDB seeder & dataset CSV exporter
│   ├── cases_seed.json       # 32 curated Packet Tracer troubleshooting cases
│   └── requirements.txt      # Python dependencies (fastapi, uvicorn, pymongo, etc.)
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js     # Central Axios client with URL normalization & auth headers
│   │   ├── components/
│   │   │   ├── Sidebar.js    # Collapsible navigation & reviewer attribution
│   │   │   ├── AuthModal.js  # Sign In / Sign Up modal dialog
│   │   │   ├── DiagnosisPanel.js # AI output, rule checks & confidence score display
│   │   │   ├── ReviewForm.js # Accept / Edit / Reject human review form
│   │   │   ├── Badge.js      # Styled severity, OSI layer, and status tags
│   │   │   └── Toast.js      # Notification popups
│   │   ├── context/
│   │   │   └── AppContext.js # Global state (auth, cases, filters, notifications)
│   │   └── pages/
│   │       ├── CaseList.js   # 32-case repository with search & filters
│   │       ├── CaseDetail.js # Case workbench & diagnosis interface
│   │       ├── CustomTroubleshooter.js # Ad-hoc troubleshooting for user lab inputs
│   │       ├── RuleChecker.js # Standalone deterministic rule analyzer
│   │       ├── Dashboard.js  # Telemetry, agreement rates & fault distribution charts
│   │       ├── CorrectionLog.js # Responsible AI audit trail
│   │       └── AdminPanel.js # Admin user management & activity inspector
│   └── package.json          # Frontend dependencies & build scripts
├── prompts/
│   └── diagnose_prompt.md    # System prompt enforcing structured diagnosis JSON
├── cases.csv                 # Exported dataset of all 32 network lab cases
├── render.yaml               # Infrastructure-as-Code Blueprint for Render deployment
├── start_servers.bat         # 1-click local launcher for Windows
├── .env.example              # Environment variable template
└── README.md                 # Project documentation
```

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+ & npm**
- **MongoDB** (Local instance or free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)

---

### Local Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/vansh16soni/Cisco_NetSage_AI.git
cd Cisco_NetSage_AI
```

#### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
copy ..\.env.example .env   # On Windows
# cp ../.env.example .env    # On Linux/macOS
```

Edit `backend/.env` with your settings:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/netsage_ai?retryWrites=true&w=majority
JWT_SECRET=your_secret_key_here
AI_PROVIDER=gemini
GEMINI_API_KEY=your_free_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Seed the database and start the server:
```bash
python seed.py   # Populates 32 cases and default administrator
python app.py    # Runs on http://localhost:5000
```

#### 3. Frontend Setup

In a new terminal window:
```bash
cd frontend
npm install
npm start        # Starts development server on http://localhost:3000
```

Open `http://localhost:3000` in your browser.

> **Windows 1-Click Launch:** You can also simply double-click `start_servers.bat` in the project root to start both backend and frontend automatically in dedicated terminal windows.

---

## Default Administrator Account

On initial seed/startup, NetSage AI automatically provisions the default administrator account:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@net` | `admin@netsage` | Full access: User Management, Account Suspension, Activity Audits, Deletion |

*(Standard users can register an account directly from the frontend "Sign In" &rarr; "Register here" link).*

---

## API Reference

### Authentication & User Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user account | Public |
| `POST` | `/api/auth/login` | Authenticate with email/password and obtain JWT | Public |
| `GET` | `/api/auth/me` | Fetch profile of currently authenticated user | Authenticated |
| `GET` | `/api/admin/users` | List all users with activity counts & status | Admin Only |
| `GET` | `/api/admin/users/{id}/activity` | Fetch detailed action audit log for a user | Admin Only |
| `POST` | `/api/admin/users/{id}/status` | Suspend or reactivate a user account | Admin Only |
| `DELETE` | `/api/admin/users/{id}` | Permanently delete a user account | Admin Only |

### Troubleshooting Cases & AI Diagnosis

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/cases` | Filterable list of all troubleshooting cases | Public |
| `GET` | `/api/cases/{id}` | Retrieve specific case details and latest diagnosis | Public |
| `POST` | `/api/cases` | Create a new custom troubleshooting case | Authenticated |
| `POST` | `/api/diagnosis/{case_id}` | Trigger AI diagnosis for a pre-loaded case | Public |
| `POST` | `/api/cases/diagnose-custom` | Trigger AI diagnosis for custom user-submitted lab input | Public |
| `POST` | `/api/cases/{case_id}/verify` | Mark a case as verified after lab fix confirmation | Authenticated |

### Human Review & Responsible AI

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/review/{diagnosis_id}/accept` | Accept an AI diagnosis as accurate | Public |
| `POST` | `/api/review/{diagnosis_id}/edit` | Edit diagnosis details (logs correction) | Public |
| `POST` | `/api/review/{diagnosis_id}/reject` | Reject diagnosis with explanation (logs correction) | Public |
| `GET` | `/api/review/logs` | Fetch Responsible AI human correction audit trail | Public |
| `GET` | `/api/dashboard/stats` | Aggregated dashboard telemetry metrics | Public |
| `POST` | `/api/check` | Execute deterministic rule checker on raw `show` output | Public |

---

## Deployment to Render

NetSage AI is pre-configured for separate frontend and backend hosting on [Render](https://render.com):

1. **Backend Web Service:**
   - **Runtime:** `Python 3`
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/healthz`
   - **Environment Variables:** `MONGO_URI`, `JWT_SECRET`, `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

2. **Frontend Static Site:**
   - **Runtime:** `Static`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
   - **Rewrite Rule:** `/*` &rarr; `/index.html`
   - **Environment Variable:** `REACT_APP_API_URL=https://<your-backend-service>.onrender.com/api`

---

## License

This project was developed for educational and research purposes in network engineering automation and responsible AI troubleshooting.
