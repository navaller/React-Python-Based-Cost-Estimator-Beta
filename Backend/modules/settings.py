import sqlite3
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from .units_settings import router as units_router  # ✅ Import units module
from .costing_defaults_settings import router as costing_defaults_router  # ✅ Import costing defaults module

# ✅ Define the main settings router
router = APIRouter()

# ✅ Include routers
router.include_router(units_router, prefix="/units", tags=["Units"])
router.include_router(costing_defaults_router, prefix="/costing_defaults", tags=["Costing Defaults"])

# ✅ Database file path
DB_FILE = "database.db"

# ✅ Function to connect to the database with lock prevention
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Prevent DB lock issues
    return conn

# ✅ API: Fetch all settings
@router.get("/")
def fetch_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT setting, value FROM advanced_settings;")
    settings = {row["setting"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings

# ✅ API: Update settings dynamically
@router.put("/")
def update_settings(updates: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()

    for setting, value in updates.items():
        cursor.execute("UPDATE advanced_settings SET value = ? WHERE setting = ?", (value, setting))

    conn.commit()
    conn.close()
    return {"message": "Settings updated successfully."}

# ✅ API: Fetch all operations
@router.get("/operations")
def get_operations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM operations;")
    operations = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return operations

# ✅ API: Fetch all part classifications
@router.get("/part_classification")
def get_part_classification():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM part_classification;")
    part_classifications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return part_classifications

# ✅ API: Fetch advanced settings
@router.get("/advanced_settings")
def get_advanced_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM advanced_settings;")
    settings = {row["setting"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings
