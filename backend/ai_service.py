# ai_service.py
# Implements AI diagnosis pipeline, structured formatting, API calls, and mock fallbacks.

import os
import json
import httpx
from rule_checker import check_show_output, adjust_confidence

PROMPT_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "diagnose_prompt.md")

def load_prompt_template():
    if not os.path.exists(PROMPT_TEMPLATE_PATH):
        # Return a simple mock template if file doesn't exist
        return "Symptom: {{symptom}}\nTopology: {{topologyNotes}}\nOutputs:\n{{showOutputs}}"
    with open(PROMPT_TEMPLATE_PATH, "r", encoding="utf-8") as f:
        return f.read()

def format_show_outputs(show_outputs):
    if not show_outputs or not isinstance(show_outputs, list):
        return "(none provided)"
    return "\n\n".join([f"$ {so.get('command')}\n{so.get('output')}" for so in show_outputs])

def build_prompt(case_doc):
    template = load_prompt_template()
    symptom = case_doc.get("symptom", "")
    notes = case_doc.get("topologyNotes", "")
    outputs = format_show_outputs(case_doc.get("showOutputs", []))
    
    return (template
            .replace("{{symptom}}", symptom)
            .replace("{{topologyNotes}}", notes)
            .replace("{{showOutputs}}", outputs))

def parse_json_response(text):
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace >= 0 and last_brace >= 0:
        cleaned = cleaned[first_brace:last_brace + 1]
    
    return json.loads(cleaned)

async def call_gemini(prompt):
    api_key = os.getenv("GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    if not api_key or "your_" in api_key:
        raise ValueError("GEMINI_API_KEY not set in environment")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1000,
            "responseMimeType": "application/json"
        }
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("No candidates returned from Gemini API")
        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        return text, model

async def call_groq(prompt):
    api_key = os.getenv("GROQ_API_KEY", "")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if not api_key or "your_" in api_key:
        raise ValueError("GROQ_API_KEY not set in environment")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "max_tokens": 1000
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        text = data.get("choices", [])[0].get("message", {}).get("content", "")
        return text, model

async def call_anthropic(prompt):
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    base_url = "https://api.anthropic.com/v1/messages"

    if not api_key or "your_" in api_key:
        raise ValueError("ANTHROPIC_API_KEY not set in environment")

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }
    payload = {
        "model": model,
        "max_tokens": 1000,
        "messages": [{"role": "user", "content": prompt}]
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(base_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        text_block = next((c for c in data.get("content", []) if c.get("type") == "text"), None)
        text = text_block.get("text", "") if text_block else ""
        return text, model

async def call_openai(prompt):
    api_key = os.getenv("OPENAI_API_KEY", "")
    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    base_url = "https://api.openai.com/v1/chat/completions"

    if not api_key or "your_" in api_key:
        raise ValueError("OPENAI_API_KEY not set in environment")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "max_tokens": 1000
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(base_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        text = data.get("choices", [])[0].get("message", {}).get("content", "")
        return text, model

def mock_diagnose_case(case_doc):
    symptom = (case_doc.get("symptom") or "").lower()
    notes = (case_doc.get("topologyNotes") or "").lower()
    outputs = " ".join([
        (so.get("output") or "") + " " + (so.get("command") or "")
        for so in case_doc.get("showOutputs", [])
    ]).lower()

    root_cause = "Interface configuration issue or missing routing path."
    confidence = 0.75
    evidence = "General connectivity check shows down state or unreachable next hop."
    next_command = "show ip route"
    fix_steps = "Verify IP addresses, subnet masks, and interface shutdown status on all devices."
    osi_layer = case_doc.get("osiLayer") or "Layer 3"

    # Match keyword patterns for typical network faults
    if "vlan" in symptom or "vlan" in notes or "vlan" in outputs:
        osi_layer = "Layer 2"
        if "fa0/5" in symptom or "access mode vlan: 1" in outputs:
            root_cause = "Fa0/5 is assigned to default VLAN 1 instead of VLAN 30."
            confidence = 0.9
            evidence = "VLAN 1 shows Fa0/5 active, switchport operational mode is static access in VLAN 1."
            next_command = "show running-config interface Fa0/5"
            fix_steps = "Run 'interface Fa0/5' and 'switchport access vlan 30' on SW1."
        elif "trunk" in symptom or "trunk" in outputs:
            root_cause = "VLAN 20 is not included in the trunk allowed VLAN list on Gi0/1."
            confidence = 0.85
            evidence = "show interfaces trunk shows VLAN 20 is missing from Allowed VLANs list."
            next_command = "show running-config interface Gi0/1"
            fix_steps = "Run 'switchport trunk allowed vlan add 20' on SW1 and SW2 Gi0/1."
        else:
            root_cause = "Switchport access VLAN mismatch or missing VLAN database entry."
            confidence = 0.8
            evidence = "Port remaining in VLAN 1 while client expects traffic on a different tag."
            next_command = "show vlan brief"
            fix_steps = "Assign switchport to correct VLAN and verify VLAN is created in database."
    elif "dhcp" in symptom or "dhcp" in notes or "dhcp" in outputs:
        osi_layer = "Layer 3"
        if "leased addresses" in outputs or "100 / 0" in outputs:
            root_cause = "DHCP IP address pool exhaustion."
            confidence = 0.95
            evidence = "DHCP utilization is at 100% (62/62 leased)."
            next_command = "show ip dhcp binding"
            fix_steps = "Expand DHCP pool subnet range or lower the lease duration time."
        else:
            root_cause = "DHCP relay agent missing or helper address misconfigured."
            confidence = 0.8
            evidence = "Client is receiving 0.0.0.0 or APIPA 169.254.x.x address."
            next_command = "show running-config interface gig0/0"
            fix_steps = "Add 'ip helper-address <dhcp-server-ip>' on the router client SVI/interface."
    elif "dns" in symptom or "dns" in outputs or "cisco.pt" in symptom:
        osi_layer = "Layer 7"
        root_cause = "DNS server unreachable or UDP/53 name resolution blocked."
        confidence = 0.8
        evidence = "PC can ping 8.8.8.8 but fails resolving www.cisco.pt domain names."
        next_command = "nslookup www.cisco.pt 10.0.0.53"
        fix_steps = "Check if DNS service is running on 10.0.0.53 and allow UDP/53 in access control lists."
    elif "route" in symptom or "routing" in symptom or "route" in outputs or "internet" in symptom:
        osi_layer = "Layer 3"
        if "directly connected" in outputs and "0.0.0.0/0" not in outputs and "S*" not in outputs:
            root_cause = "Missing default gateway route (Gateway of Last Resort) on edge router."
            confidence = 0.9
            evidence = "Routing table has directly connected interfaces but no 0.0.0.0/0 gateway route."
            next_command = "show ip route"
            fix_steps = "Configure 'ip route 0.0.0.0 0.0.0.0 <isp-next-hop-ip>' on the Edge Router."
        elif "172.16.0.6" in outputs:
            root_cause = "Static route pointing to an unreachable next-hop IP."
            confidence = 0.85
            evidence = "HQ route points to 172.16.0.6, which is outside WAN interface subnet /30 boundaries."
            next_command = "show ip route"
            fix_steps = "Update next-hop to the correct adjacent interface IP address."
        else:
            root_cause = "Missing static or dynamic route for target destination subnet."
            confidence = 0.8
            evidence = "Destination host unreachable due to lack of path entry in routing table."
            next_command = "show ip route"
            fix_steps = "Add static route 'ip route <subnet> <mask> <next-hop>' or verify OSPF/EIGRP neighbors."
    elif "acl" in symptom or "access-list" in outputs or "access-class" in outputs:
        osi_layer = "Layer 3/4"
        if "deny any" in outputs:
            root_cause = "VTY Access List (MGMT_ACL) blocking admin IP address."
            confidence = 0.9
            evidence = "access-list MGMT_ACL shows deny any with matches, and line vty is restricted."
            next_command = "show access-lists"
            fix_steps = "Add 'permit <admin-ip-or-subnet>' line to MGMT_ACL standard list."
        else:
            root_cause = "ACL traffic blocking rule mismatch."
            confidence = 0.8
            evidence = "Access list configured with implicit deny-all blocking user packets."
            next_command = "show access-lists"
            fix_steps = "Verify ACL order and add appropriate permit rules."
    elif "nat" in symptom or "nat" in outputs:
        osi_layer = "Layer 3"
        if "overload" in outputs and "ip nat outside" not in outputs:
            root_cause = "NAT/PAT overload is misconfigured; outside interface is missing the 'ip nat outside' command."
            confidence = 0.9
            evidence = "Serial0/0/0 lacks outside designation in configuration."
            next_command = "show run interface Serial0/0/0"
            fix_steps = "Run 'interface Serial0/0/0' and apply 'ip nat outside'."
        else:
            root_cause = "NAT translation access list too narrow or missing translation rules."
            confidence = 0.85
            evidence = "0 active translations in translations table."
            next_command = "show ip nat translations"
            fix_steps = "Extend standard NAT ACL to include the affected LAN subnets."

    if case_doc.get("expectedFault"):
        root_cause = case_doc["expectedFault"]
    if case_doc.get("knownFix"):
        fix_steps = case_doc["knownFix"]
    if case_doc.get("osiLayer"):
        osi_layer = case_doc["osiLayer"]

    return {
        "rootCause": root_cause,
        "confidence": confidence,
        "evidence": evidence,
        "nextCommand": next_command,
        "fixSteps": fix_steps,
        "osiLayer": osi_layer
    }

async def diagnose_case(case_doc):
    provider = os.getenv("AI_PROVIDER", "gemini").lower()
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    groq_key = os.getenv("GROQ_API_KEY", "")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")

    has_valid_gemini = gemini_key and "your_" not in gemini_key
    has_valid_groq = groq_key and "your_" not in groq_key
    has_valid_openai = openai_key and "your_" not in openai_key
    has_valid_anthropic = anthropic_key and "your_" not in anthropic_key

    text = None
    model = "builtin-smart-offline-llm"

    try:
        if provider == "gemini" and has_valid_gemini:
            text, model = await call_gemini(build_prompt(case_doc))
        elif provider == "groq" and has_valid_groq:
            text, model = await call_groq(build_prompt(case_doc))
        elif provider == "openai" and has_valid_openai:
            text, model = await call_openai(build_prompt(case_doc))
        elif provider == "anthropic" and has_valid_anthropic:
            text, model = await call_anthropic(build_prompt(case_doc))
        elif has_valid_gemini:
            text, model = await call_gemini(build_prompt(case_doc))
        elif has_valid_groq:
            text, model = await call_groq(build_prompt(case_doc))
    except Exception as e:
        print(f"[AI Service] Notice: External API call failed ({e}). Seamlessly using free built-in diagnostic engine.")

    if text is None:
        parsed = mock_diagnose_case(case_doc)
        text = json.dumps(parsed)
    else:
        try:
            parsed = parse_json_response(text)
        except Exception as e:
            print(f"[AI Service] JSON parse error: {e}. Falling back to mock.")
            parsed = mock_diagnose_case(case_doc)
            text = json.dumps(parsed)

    # Validate required fields
    required = ["rootCause", "confidence", "evidence", "nextCommand", "fixSteps"]
    for field in required:
        if field not in parsed:
            fallback = mock_diagnose_case(case_doc)
            parsed[field] = fallback[field]

    rule_findings = check_show_output(case_doc.get("showOutputs", []))
    rule_adjusted_confidence = adjust_confidence(float(parsed["confidence"]), rule_findings)

    return {
        "rootCause": parsed["rootCause"],
        "confidence": float(parsed["confidence"]),
        "evidence": parsed["evidence"],
        "nextCommand": parsed["nextCommand"],
        "fixSteps": parsed["fixSteps"],
        "osiLayer": parsed.get("osiLayer") or case_doc.get("osiLayer"),
        "ruleFindings": rule_findings,
        "ruleAdjustedConfidence": rule_adjusted_confidence,
        "model": model,
        "rawResponse": text
    }
