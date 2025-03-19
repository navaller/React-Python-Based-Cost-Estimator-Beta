import sqlite3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

# ✅ Define the router for part classifications
router = APIRouter()

# ✅ Database file path
DB_FILE = "database.db"

# ✅ Function to connect to the database with lock prevention
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Prevent DB lock issues
    return conn

# ✅ Data Model for Creating/Updating Part Classification
class PartClassificationModel(BaseModel):
    name: str
    pricing_type: str

# ✅ API: Fetch all part classifications
@router.get("/")
def get_part_classification():
    """Fetch all part classifications from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM part_classification;")
    part_classifications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return part_classifications

# ✅ API: Add a New Part Classification
@router.post("/")
def add_part_classification(new_part: PartClassificationModel):
    """Add a new part classification."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # ✅ Check if the part classification already exists
    cursor.execute("SELECT * FROM part_classification WHERE name = ?", (new_part.name,))
    existing_entry = cursor.fetchone()

    if existing_entry:
        raise HTTPException(status_code=400, detail=f"Part classification '{new_part.name}' already exists.")

    try:
        cursor.execute("""
            INSERT INTO part_classification (name, pricing_type) 
            VALUES (?, ?)
        """, (new_part.name, new_part.pricing_type))

        conn.commit()
        return {"message": f"Part classification '{new_part.name}' created successfully."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()

# ✅ API: Update a Part Classification
@router.put("/{id}")
def update_part_classification(id: int, updated_part: PartClassificationModel):
    """Update an existing part classification."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # ✅ Ensure the part classification exists
        cursor.execute("SELECT * FROM part_classification WHERE id = ?", (id,))
        existing_entry = cursor.fetchone()

        if not existing_entry:
            raise HTTPException(status_code=404, detail=f"Part classification with ID {id} not found.")

        cursor.execute("""
            UPDATE part_classification 
            SET name = ?, pricing_type = ?
            WHERE id = ?
        """, (updated_part.name, updated_part.pricing_type, id))

        conn.commit()
        return {"message": f"Part classification ID {id} updated successfully."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()

# ✅ API: Delete a Part Classification
@router.delete("/{id}")
def delete_part_classification(id: int):
    """Delete a part classification by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # ✅ Ensure the part classification exists
        cursor.execute("SELECT * FROM part_classification WHERE id = ?", (id,))
        existing_entry = cursor.fetchone()

        if not existing_entry:
            raise HTTPException(status_code=404, detail=f"Part classification with ID {id} not found.")

        cursor.execute("DELETE FROM part_classification WHERE id = ?", (id,))
        conn.commit()

        return {"message": f"Part classification ID {id} deleted successfully."}

    except sqlite3.OperationalError as e:
        if "locked" in str(e):
            raise HTTPException(status_code=500, detail="Database is locked. Try again later.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()
