import sqlite3
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

# ✅ Define the router for advanced settings
router = APIRouter()

# ✅ Database file path
DB_FILE = "database.db"

# ✅ Function to connect to the database with lock prevention
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Prevent DB lock issues
    return conn

# ✅ API: Fetch all advanced settings
import json

@router.get("/")
def get_advanced_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM advanced_settings;")
    settings = {row["setting"]: row["value"] for row in cursor.fetchall()}
    conn.close()

    # ✅ Fix: Ensure folders are stored as proper JSON
    if "folders" in settings:
        try:
            settings["folders"] = json.loads(settings["folders"].replace("'", '"'))  # Convert to valid JSON
        except json.JSONDecodeError:
            settings["folders"] = {}  # Fallback to empty object if parsing fails

    return settings


# ✅ API: Update advanced settings dynamically
@router.put("/")
def update_advanced_settings(updates: Dict[str, Any]):
    """Update advanced settings."""
    conn = get_db_connection()
    cursor = conn.cursor()

    for setting, value in updates.items():
        cursor.execute(
            "UPDATE advanced_settings SET value = ? WHERE setting = ?",
            (value, setting),
        )

    conn.commit()
    conn.close()
    return {"message": "Advanced settings updated successfully."}
