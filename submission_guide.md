# PROJECT 2 | APPLIED AI + NETWORK TROUBLESHOOTING: NetSage AI
## Submission Guide & Deliverables Report

This document outlines the exact deliverables you need to submit for **Project 2: NetSage AI**, including the details of each file, their precise locations in your workspace, and step-by-step submission instructions.

---

## 📋 Table of Deliverables & File Locations

Every deliverable required by the project specification has been built and is located in your workspace:

| Specification Deliverable Item | File Name | Workspace Location Path | Purpose / Description |
| :--- | :--- | :--- | :--- |
| **Case Dataset (At least 30)** | `cases.csv` | [`/cases.csv`](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/cases.csv) | CSV file containing all 32 realistic Packet Tracer lab cases with symptoms, topology notes, CLI outputs, expected faults, OSI layers, concepts, and severities. |
| **AI Prompt Library** | `diagnose_prompt.md` | [`/prompts/diagnose_prompt.md`](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/prompts/diagnose_prompt.md) | Structured prompt templates used by the AI Service to enforce structured JSON output and worked examples. |
| **Python Checker Script** | `rule_checker.py` | [`/backend/rule_checker.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/backend/rule_checker.py) | Deterministic Python module that checks CLI output for duplicate IPs, bad subnets, gateway mismatch, down interfaces, ports left in default VLAN 1, and missing routes. Also adjusts AI confidence. |
| **Responsible AI Log** | `responsible_ai_log.md` | [`/responsible_ai_log.md`](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/responsible_ai_log.md) | Notes documenting at least 5 realistic cases where the AI diagnosis was wrong and required human correction (e.g. Edited/Rejected). |
| **Interactive Dashboard** | `Dashboard.js` & `app.py` | [Dashboard.js](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/frontend/src/pages/Dashboard.js)<br>[app.py](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/backend/app.py) | Displays charts showing counts by issue type, severity breakdown, and AI vs human agreement rate, backed by MongoDB aggregates. |
| **Database Seeder** | `seed.py` & `cases_seed.json` | [seed.py](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/backend/seed.py)<br>[cases_seed.json](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/backend/cases_seed.json) | Python script that clears and seeds the MongoDB database collections, and automatically generates the `cases.csv` file. |
| **Custom Troubleshooter Page** | `CustomTroubleshooter.js` | [CustomTroubleshooter.js](file:///c:/Users/LENOVO/OneDrive/Desktop/Experiments/7th%20sem/netsage-ai/netsage-ai/frontend/src/pages/CustomTroubleshooter.js) | Frontend interface enabling custom user ticket input, real-time Jaccard similarity comparison with case library, rule checker findings, and case-saving options. |
| **Demo Video** | *(To be recorded)* | — | 5 to 10-minute walkthrough demonstration of the troubleshooting loop (see guide below). |

---

## 🔍 Detailed Deliverable Verification

### 1. Case Dataset (`cases.csv`)
* **Requirement**: At least 30 cases covering VLAN, gateway, DHCP, DNS, routing, ACL, NAT, and wireless issues.
* **Our Implementation**: The seeder inserts **32 cases** across 12 concept categories (`VLAN`, `Gateway`, `DHCP`, `DNS`, `Routing`, `ACL`, `NAT`, `Wireless`, `Switchport`, `Trunking`, `Interface`, `STP`). 
* **Columns included**: `Title`, `Symptom`, `TopologyNotes`, `ShowOutputs` (JSON stringified array of commands/outputs), `ExpectedFault`, `OsiLayer`, `ConceptTag`, `Severity`, `KnownFix`.

### 2. AI Prompt Library (`diagnose_prompt.md`)
* **Requirement**: Structured prompts that force JSON output with fields: `rootCause`, `confidence`, `evidence`, `nextCommand`, and `fixSteps`. Include 2-3 worked examples.
* **Our Implementation**: Prompt template located in `/prompts/diagnose_prompt.md`. It forces JSON schema compliance and includes worked examples for:
  - An Access Control List (ACL) block.
  - A DHCP/VLAN port assignment issue.
  - A Gateway subnet mask mismatch.

### 3. Python Checker (`rule_checker.py`)
* **Requirement**: Python script with deterministic checks for common config mistakes before or after AI diagnosis.
* **Our Implementation**: The deterministic rule checker parses raw CLI output to raise warnings:
  - `DUPLICATE_IP`: Duplicate IP allocations in ARP tables.
  - `INCONSISTENT_SUBNET_MASK`: Mismatched subnet masks on the same segment.
  - `GATEWAY_MISMATCH`: Mismatched default gateway configurations against SVI/router addresses.
  - `INTERFACE_DOWN`: Interfaces left in down or administratively down status.
  - `MISSING_VLAN_ASSIGNMENT`: Access ports left in default VLAN 1 when custom subnets are configured.
  - `MISSING_ROUTE`: Lack of default gateway or static routing paths.
  - `ACL_BLOCKING_ALL`: Standard/extended ACL containing implicit/explicit deny-all with no permits.
  - `NAT_NO_TRANSLATIONS` / `NAT_MISSING_OUTSIDE`: Misconfigured inside/outside NAT interface bindings.

### 4. Responsible AI Log (`responsible_ai_log.md`)
* **Requirement**: Notes on at least 5 cases where the AI answer was corrected by a human.
* **Our Implementation**: Stored in `/responsible_ai_log.md`. It details 5 scenarios with:
  - Symptoms and CLI outputs.
  - Original incorrect/incomplete AI output.
  - Human review corrections (Edits/Rejections).
  - Justification reasoning for the human correction.

### 5. Interactive Dashboard
* **Requirement**: Counts of issues by type, severity, and AI vs human agreement rate.
* **Our Implementation**:
  - Main charts and metrics live at `/dashboard` route.
  - AI-Human Agreement Rate calculated on the fly: $\text{Agreement Rate} = \frac{\text{Accepted Diagnoses}}{\text{Total Reviewed (Accepted + Edited + Rejected)}} \times 100$.

---

## 📹 How to Record the Demo Video (5 to 10 mins)

Use a screen recording tool (e.g. OBS Studio, Zoom, or Windows Game Bar) to show the full network troubleshooting loop:

1. **Introduction (1 min)**:
   - State your team details.
   - Explain the NetSage AI architecture (FastAPI backend, React frontend, MongoDB database, Python rule-checker, and the LLM).
2. **Deterministic Python Rule Checker (1-2 mins)**:
   - Go to **Rule Checker** in the sidebar.
   - Paste a raw `show ip interface brief` command output showing a shutdown interface.
   - Run the checker and point out the `INTERFACE_DOWN` finding running purely on Python logic in the backend.
3. **Primary Diagnosis & Review Flow (2-3 mins)**:
   - Go to **Cases**, filter by concept `ACL`.
   - Open *"Inter-VLAN routing ACL blocks server access (reference case)"*.
   - Point out the symptom, topology notes, and CLI show command output.
   - Click **Run AI Diagnosis**. Explain the resulting fields (root cause, evidence quote, next command, fix).
   - Point out the **Rule Adjusted Confidence** (corroborated by the Python rule checker findings).
   - Show the **Human Review Action** (Click **Accept**). Point out the badge status change.
4. **Human Correction / Responsible AI Log (2 mins)**:
   - Open another case, run diagnosis, click **Edit**.
   - Modify the Root Cause, type a correction reason, and click **Save**.
   - Show the **Responsible AI Log** in the sidebar. Verify that the original AI diagnosis, corrected human version, and reason appear side-by-side.
5. **Dashboard & Custom Troubleshooter (2 mins)**:
   - Go to **Dashboard** and show:
     - Total Cases & AI Diagnoses count.
     - The AI-Human Agreement Rate metric.
     - Recent Corrections list.
   - Go to **Custom Troubleshooter**:
     - Input a custom network symptom (e.g., OSPF MTU mismatch).
     - Show the Jaccard similarity case comparison finding matching cases in the library.
     - Show the **Save Case to Case Library Database** button, save the case, and show it updated on the Dashboard.

---

## 📦 How to Submit the Project

1. **Run the Seeder** (to ensure the database is clean, seeded, and `cases.csv` is fully generated):
   ```bash
   cd backend
   uv run seed.py
   ```
2. **Remove temporary logs and dependencies** (to keep the zip file size small):
   *Do NOT zip `node_modules` or `.git` folders.*
3. **Zip the Project Directory**:
   - Right-click the root `netsage-ai` folder -> **Send to** -> **Compressed (zipped) folder**.
   - Ensure the zip file contains:
     - `cases.csv` (Root)
     - `responsible_ai_log.md` (Root)
     - `submission_guide.md` (Root)
     - `prompts/` (contains `diagnose_prompt.md`)
     - `backend/` (contains `app.py`, `rule_checker.py`, `seed.py`, `requirements.txt`)
     - `frontend/` (contains React frontend files, e.g. `src/`)
4. **Submit to Portal**:
   - Upload the **ZIP file** containing the codebase.
   - Upload your **Demo Video** link (e.g. YouTube unlisted or Drive link).
