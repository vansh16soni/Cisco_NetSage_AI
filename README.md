# NetSage AI

AI-assisted network troubleshooting helper for Cisco Packet Tracer labs. Given a symptom,
topology notes, and `show` command output, the AI suggests a root cause, OSI layer, confidence
score, next diagnostic command, and fix steps. Every AI diagnosis is reviewed by a human
(Accept / Edit / Reject), and corrections are logged for transparency.

## Stack

- **Frontend:** React (Router, Context, Recharts) - no heavy UI framework, custom lightweight CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **AI:** Anthropic Claude or OpenAI GPT-4 (switchable via `.env`), structured JSON output
- **Rule Checker:** Pure Node.js, no Python anywhere in the stack

## Project Structure

```
netsage-ai/
  backend/
    server.js
    models/          Case, Diagnosis, Review, AICorrectionLog
    routes/          cases, diagnosis, review, dashboard, check
    services/        aiService.js, ruleChecker.js
    config/          index.js (env loader)
    seed.js          seeds 32 realistic troubleshooting cases
    package.json
  frontend/
    src/
      components/    Sidebar, DiagnosisPanel, ReviewForm, Badge, Toast
      pages/         CaseList, CaseDetail, Dashboard, CorrectionLog, RuleChecker
      api/           client.js (axios)
      context/       AppContext.js
    package.json
  prompts/
    diagnose_prompt.md   the exact system prompt used by aiService.js
  .env.example
  README.md
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string to a hosted instance, e.g. Atlas)
- An Anthropic or OpenAI API key

## Setup

### 1. Clone / unzip the project

```bash
cd netsage-ai
```

### 2. Backend

```bash
cd backend
npm install
cp ../.env.example .env
# edit .env: set MONGO_URI, AI_PROVIDER, and the matching API key
npm run seed     # populates MongoDB with 32 realistic cases
npm run dev       # starts on http://localhost:5000 (or `npm start`)
```

### 3. Frontend

```bash
cd ../frontend
npm install
# optional: create .env with REACT_APP_API_URL=http://localhost:5000/api (this is the default)
npm start          # starts on http://localhost:3000
```

Open `http://localhost:3000`. The app talks to the backend at `http://localhost:5000/api`.

## API Reference

| Method | Route                              | Purpose                                    |
|--------|-------------------------------------|---------------------------------------------|
| GET    | `/api/cases`                        | List cases (filter by `conceptTag`, `severity`, `osiLayer`) |
| GET    | `/api/cases/:id`                    | Get one case + its latest diagnosis        |
| POST   | `/api/cases`                        | Create a new case                          |
| POST   | `/api/diagnosis/:caseId`            | Run AI diagnosis for a case, store result  |
| GET    | `/api/diagnosis/:caseId`            | Diagnosis history for a case               |
| POST   | `/api/review/:diagnosisId/accept`   | Accept a diagnosis                         |
| POST   | `/api/review/:diagnosisId/edit`     | Edit a diagnosis (logs a correction)       |
| POST   | `/api/review/:diagnosisId/reject`   | Reject a diagnosis (logs a correction)     |
| GET    | `/api/review/logs`                  | Responsible AI correction log              |
| GET    | `/api/dashboard/stats`              | Aggregated dashboard stats                 |
| POST   | `/api/check`                        | Run the deterministic rule checker directly|

## Rule Checker

`backend/services/ruleChecker.js` exposes `checkShowOutput(showOutputs)` - a pure, deterministic
function (no AI, no network calls) that parses raw `show` command text and flags:

- Duplicate IP addresses
- Inconsistent subnet masks
- Gateway IP mismatches
- Interfaces down / administratively down
- Ports left in default VLAN 1 when other VLANs are defined
- Missing default/static routes
- ACL deny-all or missing permits
- NAT missing `ip nat outside`, or NAT ACL producing zero translations

Its findings feed into `adjustConfidence()`, which nudges the AI's raw confidence score up or
down based on deterministic corroboration - this adjusted score is shown next to the AI's raw
confidence in the Diagnosis Panel.

## Demo / Walkthrough Script

Use this script to demo the full loop: broken case -> AI diagnosis -> human review -> fix -> verification.

1. **Show a broken case.** Open the app, go to "Cases", filter by `conceptTag = ACL`, and open
   "Inter-VLAN routing ACL blocks server access (reference case)". Walk through the symptom,
   topology notes, and the two `show` outputs (`show ip route`, `show access-lists`).

2. **Run AI diagnosis.** Click "Run AI Diagnosis". Point out the returned JSON fields rendered
   in the Diagnosis Panel: root cause, OSI layer, confidence (plus rule-adjusted confidence),
   evidence quote, next command, and fix steps.

3. **Cross-check with the rule checker.** Note the "Rule Checker Findings" section under the AI
   output - this is the deterministic Node.js module corroborating (or not) the AI's claim
   independently.

4. **Human review - Accept path.** If the diagnosis looks correct, click "Accept". Status badge
   changes to `Accepted`; this feeds the AI-Human agreement rate on the Dashboard.

5. **Human review - Edit path (to show correction logging).** Open a different case, run
   diagnosis, click "Edit", change the root cause slightly, type a reason (e.g. "AI missed that
   the ACL is also missing a permit for ICMP"), and save. Show that the status becomes `Edited`.

6. **Human review - Reject path.** Open a third case, run diagnosis, click "Reject", provide a
   reason, and confirm. Status becomes `Rejected`.

7. **Show the Responsible AI Log.** Navigate to "Responsible AI Log" in the sidebar. Show the
   Edited and Rejected cases now appear with original AI output side-by-side with the corrected
   human version and the reason.

8. **Show the Dashboard.** Navigate to "Dashboard". Point out:
   - Issues by type (bar chart)
   - Severity breakdown (pie chart)
   - AI-Human agreement rate (Accepted / total reviewed)
   - Recent corrections list, linking back to the correction log

9. **Standalone rule checker.** Navigate to "Rule Checker" in the sidebar, paste a raw
   `show ip interface brief` output showing an interface `administratively down`, click
   "Add Command Output" then "Run Rule Checker", and show the `INTERFACE_DOWN` finding appear
   with no AI call involved - demonstrating the deterministic safety net works independently.

10. **Verification.** Return to the original case, note the fix steps recommended, and explain
    that in a live Packet Tracer lab the engineer would now apply the fix (e.g. `no shutdown`,
    correcting an ACL permit line, etc.) and re-run the relevant `show` command to confirm
    resolution - closing the loop from symptom to verified fix.

## Notes on the AI Prompt

The exact system prompt sent to the LLM lives in `prompts/diagnose_prompt.md` and is loaded
verbatim by `aiService.js`. It enforces JSON-only output and includes three worked examples
(ACL block, DHCP/VLAN port issue, gateway subnet mismatch) to anchor the model's response format
and reasoning style before it sees the real case.
