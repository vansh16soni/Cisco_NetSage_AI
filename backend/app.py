# app.py
# NetSage AI Python Backend running on port 5000.
# Integrates with MongoDB, rule checker, and AI diagnosis services.

import os
import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

from rule_checker import check_show_output
from ai_service import diagnose_case

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/netsage_ai")
PORT = int(os.getenv("PORT", 5000))

app = FastAPI(title="NetSage AI Backend")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local React development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.get_database()

# Serialization helpers
def serialize_doc(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime.datetime):
            doc[k] = v.isoformat() + "Z"
        elif isinstance(v, dict):
            doc[k] = serialize_doc(v)
        elif isinstance(v, list):
            doc[k] = [
                serialize_doc(item) if isinstance(item, dict)
                else (str(item) if isinstance(item, ObjectId) else item)
                for item in v
            ]
    return doc

def calculate_jaccard_similarity(text1, text2):
    if not text1 or not text2:
        return 0.0
    words1 = set(re_words(text1.lower()))
    words2 = set(re_words(text2.lower()))
    
    stop_words = {"the", "a", "is", "in", "to", "of", "and", "on", "for", "with", "at", "by", "from", "an", "this", "that", "it", "be", "are", "was", "were"}
    
    clean1 = {w for w in words1 if len(w) > 2 and w not in stop_words}
    clean2 = {w for w in words2 if len(w) > 2 and w not in stop_words}
    
    if not clean1 or not clean2:
        return 0.0
        
    intersection = clean1.intersection(clean2)
    union = clean1.union(clean2)
    
    return len(intersection) / len(union)

def re_words(text):
    import re
    return re.findall(r'\b[a-z0-9-]+\b', text)


# --- API Routes ---

@app.get("/api/cases")
async def list_cases(conceptTag: str = None, severity: str = None, osiLayer: str = None):
    query = {}
    if conceptTag:
        query["conceptTag"] = conceptTag
    if severity:
        query["severity"] = severity
    if osiLayer:
        query["osiLayer"] = osiLayer
        
    cases = list(db["cases"].find(query).sort("createdAt", -1))
    return [serialize_doc(c) for c in cases]

@app.get("/api/cases/{case_id}")
async def get_case(case_id: str):
    if not ObjectId.is_valid(case_id):
        raise HTTPException(status_code=400, detail="Invalid Case ID format")
    case_doc = db["cases"].find_one({"_id": ObjectId(case_id)})
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
        
    diagnosis = db["diagnoses"].find_one({"case": ObjectId(case_id)}, sort=[("createdAt", -1)])
    
    return {
        "case": serialize_doc(case_doc),
        "diagnosis": serialize_doc(diagnosis) if diagnosis else None
    }

@app.post("/api/cases")
async def create_case(payload: dict):
    # Ensure required fields are present
    required = ["title", "symptom", "topologyNotes", "expectedFault", "osiLayer", "conceptTag", "severity", "knownFix"]
    for field in required:
        if field not in payload:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
            
    payload["createdAt"] = datetime.datetime.utcnow()
    payload["updatedAt"] = datetime.datetime.utcnow()
    
    result = db["cases"].insert_one(payload)
    inserted = db["cases"].find_one({"_id": result.inserted_id})
    return serialize_doc(inserted)

@app.post("/api/cases/diagnose-custom")
async def diagnose_custom(payload: dict):
    symptom = payload.get("symptom")
    topology_notes = payload.get("topologyNotes")
    show_outputs = payload.get("showOutputs", [])
    
    if not symptom or not topology_notes:
        raise HTTPException(status_code=400, detail="Symptom and topology notes are required.")
        
    # 1. Fetch all cases and find similar ones
    all_cases = list(db["cases"].find({}))
    matches = []
    for c in all_cases:
        sym_sim = calculate_jaccard_similarity(symptom, c.get("symptom", ""))
        note_sim = calculate_jaccard_similarity(topology_notes, c.get("topologyNotes", ""))
        total_sim = (sym_sim * 0.6) + (note_sim * 0.4)
        matches.append({
            "case": serialize_doc(c),
            "score": round(total_sim, 3)
        })
        
    similar_cases = [m for m in matches if m["score"] > 0.12]
    similar_cases.sort(key=lambda x: x["score"], reverse=True)
    similar_cases = similar_cases[:3]
    
    # 2. Run AI diagnosis in memory
    diagnosis_result = await diagnose_case({
        "symptom": symptom,
        "topologyNotes": topology_notes,
        "showOutputs": show_outputs
    })
    
    return {
        "diagnosis": diagnosis_result,
        "similarCases": similar_cases
    }

@app.post("/api/diagnosis/{case_id}")
async def run_ai_diagnosis(case_id: str):
    if not ObjectId.is_valid(case_id):
        raise HTTPException(status_code=400, detail="Invalid Case ID format")
    case_doc = db["cases"].find_one({"_id": ObjectId(case_id)})
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
        
    result = await diagnose_case(case_doc)
    
    diag_doc = {
        "case": ObjectId(case_id),
        "status": "Pending",
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow(),
        **result
    }
    
    insert_result = db["diagnoses"].insert_one(diag_doc)
    inserted = db["diagnoses"].find_one({"_id": insert_result.inserted_id})
    return serialize_doc(inserted)

@app.get("/api/diagnosis/{case_id}")
async def get_diagnosis_history(case_id: str):
    if not ObjectId.is_valid(case_id):
        raise HTTPException(status_code=400, detail="Invalid Case ID format")
    diagnoses = list(db["diagnoses"].find({"case": ObjectId(case_id)}).sort("createdAt", -1))
    return [serialize_doc(d) for d in diagnoses]

@app.post("/api/review/{diagnosis_id}/accept")
async def accept_diagnosis(diagnosis_id: str, body: dict = None):
    if not ObjectId.is_valid(diagnosis_id):
        raise HTTPException(status_code=400, detail="Invalid Diagnosis ID format")
    diagnosis = db["diagnoses"].find_one({"_id": ObjectId(diagnosis_id)})
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
        
    reviewer_name = (body or {}).get("reviewerName", "Anonymous Reviewer")
    
    # Update status
    db["diagnoses"].update_one(
        {"_id": ObjectId(diagnosis_id)},
        {"$set": {"status": "Accepted", "updatedAt": datetime.datetime.utcnow()}}
    )
    
    review_doc = {
        "diagnosis": ObjectId(diagnosis_id),
        "case": diagnosis["case"],
        "action": "Accepted",
        "reviewerName": reviewer_name,
        "beforeSnapshot": serialize_doc(diagnosis),
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    db["reviews"].insert_one(review_doc)
    
    return {"message": "Diagnosis accepted"}

@app.post("/api/review/{diagnosis_id}/edit")
async def edit_diagnosis(diagnosis_id: str, body: dict):
    if not ObjectId.is_valid(diagnosis_id):
        raise HTTPException(status_code=400, detail="Invalid Diagnosis ID format")
    diagnosis = db["diagnoses"].find_one({"_id": ObjectId(diagnosis_id)})
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
        
    corrected = body.get("correctedDiagnosis")
    reason = body.get("reason", "")
    reviewer = body.get("reviewerName", "Anonymous Reviewer")
    
    if not corrected or "rootCause" not in corrected:
        raise HTTPException(status_code=400, detail="Corrected diagnosis fields are required.")
        
    # Update status and data in diagnoses collection
    update_data = {
        "status": "Edited",
        "rootCause": corrected.get("rootCause"),
        "confidence": float(corrected.get("confidence", diagnosis.get("confidence"))),
        "evidence": corrected.get("evidence", diagnosis.get("evidence")),
        "nextCommand": corrected.get("nextCommand", diagnosis.get("nextCommand")),
        "fixSteps": corrected.get("fixSteps", diagnosis.get("fixSteps")),
        "osiLayer": corrected.get("osiLayer", diagnosis.get("osiLayer")),
        "updatedAt": datetime.datetime.utcnow()
    }
    db["diagnoses"].update_one({"_id": ObjectId(diagnosis_id)}, {"$set": update_data})
    
    # Create review
    review_doc = {
        "diagnosis": ObjectId(diagnosis_id),
        "case": diagnosis["case"],
        "action": "Edited",
        "reviewerName": reviewer,
        "beforeSnapshot": serialize_doc(diagnosis),
        "afterSnapshot": {**serialize_doc(diagnosis), **corrected, "status": "Edited"},
        "reason": reason,
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    review_result = db["reviews"].insert_one(review_doc)
    
    # Create AICorrectionLog
    case_doc = db["cases"].find_one({"_id": diagnosis["case"]})
    log_doc = {
        "case": diagnosis["case"],
        "diagnosis": ObjectId(diagnosis_id),
        "review": review_result.inserted_id,
        "originalAIOutput": {
            "rootCause": diagnosis.get("rootCause"),
            "confidence": diagnosis.get("confidence"),
            "evidence": diagnosis.get("evidence"),
            "nextCommand": diagnosis.get("nextCommand"),
            "fixSteps": diagnosis.get("fixSteps")
        },
        "correctedHumanVersion": corrected,
        "reasonForCorrection": reason,
        "correctionType": "Edited",
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    db["aicorrectionlogs"].insert_one(log_doc)
    
    return {"message": "Diagnosis edit registered"}

@app.post("/api/review/{diagnosis_id}/reject")
async def reject_diagnosis(diagnosis_id: str, body: dict):
    if not ObjectId.is_valid(diagnosis_id):
        raise HTTPException(status_code=400, detail="Invalid Diagnosis ID format")
    diagnosis = db["diagnoses"].find_one({"_id": ObjectId(diagnosis_id)})
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
        
    reason = body.get("reason", "")
    reviewer = body.get("reviewerName", "Anonymous Reviewer")
    
    db["diagnoses"].update_one(
        {"_id": ObjectId(diagnosis_id)},
        {"$set": {"status": "Rejected", "updatedAt": datetime.datetime.utcnow()}}
    )
    
    review_doc = {
        "diagnosis": ObjectId(diagnosis_id),
        "case": diagnosis["case"],
        "action": "Rejected",
        "reviewerName": reviewer,
        "beforeSnapshot": serialize_doc(diagnosis),
        "reason": reason,
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    review_result = db["reviews"].insert_one(review_doc)
    
    case_doc = db["cases"].find_one({"_id": diagnosis["case"]})
    log_doc = {
        "case": diagnosis["case"],
        "diagnosis": ObjectId(diagnosis_id),
        "review": review_result.inserted_id,
        "originalAIOutput": {
            "rootCause": diagnosis.get("rootCause"),
            "confidence": diagnosis.get("confidence"),
            "evidence": diagnosis.get("evidence"),
            "nextCommand": diagnosis.get("nextCommand"),
            "fixSteps": diagnosis.get("fixSteps")
        },
        "correctedHumanVersion": {
            "rootCause": "Rejected by Reviewer",
            "confidence": 0.0,
            "evidence": "N/A",
            "nextCommand": "N/A",
            "fixSteps": "N/A"
        },
        "reasonForCorrection": reason,
        "correctionType": "Rejected",
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    db["aicorrectionlogs"].insert_one(log_doc)
    
    return {"message": "Diagnosis rejected successfully"}

@app.get("/api/review/logs")
async def get_correction_logs():
    logs = list(db["aicorrectionlogs"].find({}).sort("createdAt", -1))
    results = []
    for log in logs:
        # Populate case
        case_doc = db["cases"].find_one({"_id": log["case"]}, {"title": 1, "conceptTag": 1, "severity": 1})
        log["case"] = case_doc
        results.append(serialize_doc(log))
    return results

@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    # Run aggregations
    issues_by_type = list(db["cases"].aggregate([
        {"$group": {"_id": "$conceptTag", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]))
    
    severity_breakdown = list(db["cases"].aggregate([
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]))
    
    status_breakdown = list(db["diagnoses"].aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]))
    
    total_cases = db["cases"].count_documents({})
    total_diagnoses = db["diagnoses"].count_documents({})
    
    reviewed_count = sum(s["count"] for s in status_breakdown if s["_id"] != "Pending")
    accepted_count = next((s["count"] for s in status_breakdown if s["_id"] == "Accepted"), 0)
    
    agreement_rate = round((accepted_count / reviewed_count) * 100, 1) if reviewed_count > 0 else None
    
    raw_recent = list(db["aicorrectionlogs"].find({}).sort("createdAt", -1).limit(5))
    recent_corrections = []
    for log in raw_recent:
        case_doc = db["cases"].find_one({"_id": log["case"]}, {"title": 1, "conceptTag": 1, "severity": 1})
        log["case"] = case_doc
        recent_corrections.append(serialize_doc(log))
        
    return {
        "totalCases": total_cases,
        "totalDiagnoses": total_diagnoses,
        "issuesByType": [dict(i) for i in issues_by_type],
        "severityBreakdown": [dict(s) for s in severity_breakdown],
        "statusBreakdown": [dict(st) for st in status_breakdown],
        "agreementRate": agreement_rate,
        "recentCorrections": recent_corrections
    }

@app.post("/api/check")
async def run_deterministic_check(payload: dict):
    show_outputs = payload.get("showOutputs", [])
    findings = check_show_output(show_outputs)
    return {"findings": findings}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=True)
