import sqlite3
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel
from collections import defaultdict
import json

# ✅ Define the router for Units
router = APIRouter()

# ✅ Database file path
DB_FILE = "database.db"

# ✅ Function to connect to the database
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Prevent DB lock issues
    return conn

# ✅ API: Fetch all units
@router.get("/")
def get_units():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category, unit_type, unit_name, symbol FROM units")
    units = cursor.fetchall()
    conn.close()

    structured_units = defaultdict(lambda: defaultdict(lambda: {"default": None, "options": []}))

    for unit in units:
        category = unit["category"]
        unit_type = unit["unit_type"]
        unit_name = unit["unit_name"]

        options = unit["symbol"]
        if isinstance(options, str):  
            try:
                options = json.loads(options)
                if not isinstance(options, list):
                    options = []
            except json.JSONDecodeError:
                options = [] 
        else:
            options = []  

        if not structured_units[category][unit_type]["default"]:
            structured_units[category][unit_type]["default"] = unit_name

        structured_units[category][unit_type]["options"] = options  

    return structured_units

# ✅ API: Add a new custom unit
class CustomUnitModel(BaseModel):
    category: str
    unit_type: str
    unit_name: str
    symbol: Optional[List[str]] = []

@router.post("/custom_units/{unit_type}")
def add_custom_unit(unit_type: str, unit_data: CustomUnitModel):
    conn = get_db_connection()
    cursor = conn.cursor()

    options_str = json.dumps(unit_data.symbol) if unit_data.symbol else "[]"

    try:
        cursor.execute("""
            INSERT INTO units (category, unit_type, unit_name, symbol) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(unit_type) DO UPDATE SET 
                unit_name = excluded.unit_name, 
                symbol = excluded.symbol
        """, (unit_data.category, unit_type, unit_data.unit_name, options_str))

        conn.commit()
        return {"message": f"Custom unit '{unit_data.unit_name}' added/updated successfully under '{unit_type}'."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()

# ✅ API: Update custom units
class UnitUpdateModel(BaseModel):
    unit_name: str
    symbol: Optional[List[str]] = []

@router.put("/custom_units/{unit_type}")
def update_custom_unit(unit_type: str, update_data: UnitUpdateModel):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT category FROM units WHERE unit_type = ?",
            (unit_type,),
        )
        unit = cursor.fetchone()

        if not unit:
            raise HTTPException(
                status_code=404, detail=f"Custom unit '{unit_type}' not found."
            )

        if unit["category"] != "custom_units":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot update '{unit_type}' because it is not a custom unit.",
            )

        cursor.execute(
            "UPDATE units SET unit_name = ?, symbol = ? WHERE unit_type = ?",
            (update_data.unit_name, json.dumps(update_data.symbol), unit_type),
        )

        conn.commit()
        return {"message": f"Custom unit '{unit_type}' updated successfully."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()

# ✅ API: Delete custom units
@router.delete("/custom_units/{unit_type}")
def delete_custom_unit(unit_type: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT category FROM units WHERE unit_type = ?",
            (unit_type,),
        )
        unit = cursor.fetchone()

        if not unit:
            raise HTTPException(
                status_code=404, detail=f"Custom unit '{unit_type}' not found."
            )

        if unit["category"] != "custom_units":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete '{unit_type}' because it is not a custom unit.",
            )

        cursor.execute("DELETE FROM units WHERE unit_type = ?", (unit_type,))
        conn.commit()

        return {"message": f"Custom unit '{unit_type}' deleted successfully."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()

# ✅ API: Get all symbols grouped by unit type
@router.get("/symbols")
def get_unit_symbols():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT unit_type, symbol FROM units WHERE symbol IS NOT NULL AND symbol != ''")
    
    grouped_symbols = defaultdict(set)

    for row in cursor.fetchall():
        unit_type = row["unit_type"]
        symbol_value = row["symbol"]

        if symbol_value.startswith("["):
            try:
                parsed_symbols = json.loads(symbol_value)
                if isinstance(parsed_symbols, list):
                    grouped_symbols[unit_type].update(parsed_symbols)
                else:
                    grouped_symbols[unit_type].add(symbol_value)
            except json.JSONDecodeError:
                grouped_symbols[unit_type].add(symbol_value)
        else:
            grouped_symbols[unit_type].add(symbol_value)

    conn.close()
    
    return {unit_type: sorted(symbols) for unit_type, symbols in grouped_symbols.items()}


# ✅ API: Bulk update unit defaults within a category
@router.put("/{category}")
def bulk_update_units(category: str, updates: Dict[str, str]):
    """
    Updates multiple unit defaults within a given category (e.g., "basic_units").
    The request payload should be a dictionary where keys are `unit_type` and values are the selected default unit.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    for unit_type, default_unit in updates.items():
        # Ensure the provided unit exists in the database for the given category and unit type
        cursor.execute(
            "SELECT unit_name, symbol FROM units WHERE category = ? AND unit_type = ?",
            (category, unit_type),
        )
        unit = cursor.fetchone()

        if not unit:
            raise HTTPException(
                status_code=404,
                detail=f"Unit type '{unit_type}' not found in category '{category}'."
            )

        existing_options = json.loads(unit["symbol"]) if unit["symbol"] else []

        if default_unit not in existing_options:
            raise HTTPException(
                status_code=400,
                detail=f"Unit '{default_unit}' is not a valid option for '{unit_type}' in category '{category}'. Valid options: {existing_options}"
            )

        # ✅ Update the unit_name field in the database
        cursor.execute(
            "UPDATE units SET unit_name = ? WHERE category = ? AND unit_type = ?",
            (default_unit, category, unit_type),
        )

    conn.commit()
    conn.close()

    return {"message": f"Units in '{category}' updated successfully."}