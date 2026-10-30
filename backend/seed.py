# seed.py
# Seeding script for NetSage AI in Python
# Connects to MongoDB, seeds the database, and exports cases.csv.

import os
import json
import csv
from pymongo import MongoClient
from dotenv import load_dotenv
from auth import seed_default_admin

# Load env variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/netsage_ai")

def seed():
    # Read seed JSON
    seed_file_path = os.path.join(os.path.dirname(__file__), "cases_seed.json")
    with open(seed_file_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    # 1. Connect to MongoDB
    client = MongoClient(MONGO_URI)
    try:
        db = client.get_default_database(default="netsage_ai")
    except Exception:
        db = client["netsage_ai"]
    
    # We clear the cases, diagnoses, reviews, and aicorrectionlogs collections
    db["cases"].delete_many({})
    db["diagnoses"].delete_many({})
    db["reviews"].delete_many({})
    db["aicorrectionlogs"].delete_many({})
    print("[seed] cleared all existing collections in MongoDB")

    # 2. Insert cases
    result = db["cases"].insert_many(cases)
    print(f"[seed] inserted {len(result.inserted_ids)} cases into MongoDB")

    # 3. Seed default admin and create indexes
    db["users"].create_index("email", unique=True)
    seed_default_admin(db)

    # 3. Export to cases.csv in the workspace root
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    csv_file_path = os.path.join(root_dir, "cases.csv")

    with open(csv_file_path, "w", newline="", encoding="utf-8") as csvfile:
        fieldnames = ["Title", "Symptom", "TopologyNotes", "ShowOutputs", "ExpectedFault", "OsiLayer", "ConceptTag", "Severity", "KnownFix"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for case in cases:
            # Flatten or stringify showOutputs array
            show_outputs_str = json.dumps(case.get("showOutputs", []))
            writer.writerow({
                "Title": case.get("title", ""),
                "Symptom": case.get("symptom", ""),
                "TopologyNotes": case.get("topologyNotes", ""),
                "ShowOutputs": show_outputs_str,
                "ExpectedFault": case.get("expectedFault", ""),
                "OsiLayer": case.get("osiLayer", ""),
                "ConceptTag": case.get("conceptTag", ""),
                "Severity": case.get("severity", ""),
                "KnownFix": case.get("knownFix", "")
            })
    
    print(f"[seed] successfully exported cases dataset to {csv_file_path}")
    client.close()

if __name__ == "__main__":
    seed()
