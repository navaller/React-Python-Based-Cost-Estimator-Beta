import sqlite3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

# ✅ Define the router for costing defaults
router = APIRouter()

# ✅ Database file path
DB_FILE = "database.db"

# ✅ Function to connect to the database with lock prevention
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Prevent DB lock issues
    return conn

# ✅ API: Fetch all costing defaults
@router.get("/")
def get_costing_defaults():
    """Fetch all costing defaults from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM costing_defaults;")
    costing_defaults = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return costing_defaults

# ✅ Define the request model for updating costing defaults
class CostingDefaultUpdate(BaseModel):
    category: Optional[str] = None  # Renamed from `type`
    unit_type: Optional[str] = None
    default_unit: Optional[str] = None
    description: Optional[str] = None

# ✅ API: Update a specific costing default
@router.put("/{costing_type}")
def update_costing_default(costing_type: str, update_data: CostingDefaultUpdate):
    """Update the category, unit_type, default_unit, or description of a costing default."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # ✅ Ensure the costing type exists
        cursor.execute("SELECT * FROM costing_defaults WHERE type = ?", (costing_type,))
        existing_entry = cursor.fetchone()

        if not existing_entry:
            raise HTTPException(status_code=404, detail=f"Costing type '{costing_type}' not found.")

        # ✅ Prepare updates dynamically
        updates = []
        values = []

        if update_data.category:
            updates.append("type = ?")
            values.append(update_data.category)

        if update_data.unit_type:
            updates.append("unit_type = ?")
            values.append(update_data.unit_type)

        if update_data.default_unit:
            updates.append("default_unit = ?")
            values.append(update_data.default_unit)

        if update_data.description:
            updates.append("description = ?")
            values.append(update_data.description)

        # ✅ Ensure there's something to update
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields provided for update.")

        values.append(costing_type)  # Append `costing_type` for WHERE clause

        # ✅ Perform the update
        query = f"UPDATE costing_defaults SET {', '.join(updates)} WHERE type = ?"
        cursor.execute(query, values)

        conn.commit()
        return {"message": f"Costing type '{costing_type}' updated successfully."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()

# ✅ Data Model for Creating Costing Default
class CostingDefaultCreate(BaseModel):
    category: str
    unit_type: str
    default_unit: str
    description: str

# ✅ API: Create a New Costing Default
@router.post("/")
def create_costing_default(new_costing: CostingDefaultCreate):
    """Create a new costing default entry."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # ✅ Check if the costing type already exists
    cursor.execute("SELECT * FROM costing_defaults WHERE type = ?", (new_costing.category,))
    existing_entry = cursor.fetchone()

    if existing_entry:
        raise HTTPException(
            status_code=400,
            detail=f"Costing type '{new_costing.category}' already exists.",
        )

    try:
        # ✅ Insert the new costing default
        cursor.execute("""
            INSERT INTO costing_defaults (type, unit_type, default_unit, description) 
            VALUES (?, ?, ?, ?)
        """, (new_costing.category, new_costing.unit_type, new_costing.default_unit, new_costing.description))

        conn.commit()
        return {"message": f"Costing default '{new_costing.category}' created successfully."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()

# ✅ API: Delete a Costing Default by Category
@router.delete("/{costing_type}")
def delete_costing_default(costing_type: str):
    """Delete a costing default by category (type)."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # ✅ Ensure the costing type exists before deletion
        cursor.execute("SELECT * FROM costing_defaults WHERE type = ?", (costing_type,))
        existing_entry = cursor.fetchone()

        if not existing_entry:
            raise HTTPException(
                status_code=404, detail=f"Costing type '{costing_type}' not found."
            )

        # ✅ Perform deletion
        cursor.execute("DELETE FROM costing_defaults WHERE type = ?", (costing_type,))
        conn.commit()

        return {"message": f"Costing type '{costing_type}' deleted successfully."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()
