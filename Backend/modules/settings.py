import sqlite3
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel

# Define the router
router = APIRouter()

# Database file path
DB_FILE = "database.db"

# Function to connect to the database
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # Allows dictionary-like row access
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

# ✅ API: Fetch all units
@router.get("/units")
def get_units():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM units;")
    units = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return units

# ✅ API: Update default unit for a category
class UnitUpdateModel(BaseModel):
    default_unit: str

@router.put("/units/{category}/{unit_name}")
def update_unit(category: str, unit_name: str, update_data: UnitUpdateModel):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM units WHERE category = ? AND unit_name = ?", (category, unit_name))
    unit = cursor.fetchone()
    if not unit:
        raise HTTPException(status_code=404, detail=f"Unit '{unit_name}' not found in category '{category}'.")

    cursor.execute("UPDATE units SET unit_name = ? WHERE id = ?", (update_data.default_unit, unit["id"]))
    conn.commit()
    conn.close()
    return {"message": f"Default unit updated successfully for {unit_name} in {category}."}

# ✅ API: Add a new custom unit
class CustomUnitModel(BaseModel):
    category: str
    unit_type: str
    unit_name: str
    symbol: Optional[str] = None

@router.post("/units/custom_units/{unit_name}")
def add_custom_unit(unit_name: str, unit_data: CustomUnitModel):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("INSERT INTO units (category, unit_type, unit_name, symbol) VALUES (?, ?, ?, ?)", 
                   (unit_data.category, unit_data.unit_type, unit_name, unit_data.symbol))
    conn.commit()
    conn.close()
    return {"message": f"Custom unit '{unit_name}' added successfully."}

# ✅ API: Fetch all costing defaults
@router.get("/costing_defaults")
def get_costing_defaults():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM costing_defaults;")
    costing_defaults = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return costing_defaults

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
