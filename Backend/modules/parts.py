
import os
import sqlite3
import uuid
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Database file path
DB_FILE = "database.db"

# Function to connect to the database with timeout and WAL mode
def get_db_connection():
    conn = sqlite3.connect(DB_FILE, timeout=5)  # Adds timeout to avoid lock issues
    conn.row_factory = sqlite3.Row  # Allows dictionary-like row access
    conn.execute("PRAGMA journal_mode=WAL;")  # Enable WAL mode for concurrent access
    conn.execute("PRAGMA busy_timeout = 5000;")  # Waits up to 5 seconds if the database is locked
    return conn

# ✅ Fetch all parts from SQLite
def load_parts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM parts;")
    parts = {row["part_id"]: dict(row) for row in cursor.fetchall()}
    conn.close()
    return parts

@router.get("/")
def get_parts():
    """Fetch all stored parts."""
    return load_parts()

@router.get("/{part_id}/")
def get_part_details(part_id: str):
    """Fetch details of a specific part."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM parts WHERE part_id = ?", (part_id,))
    part = cursor.fetchone()
    conn.close()

    if part:
        return dict(part)
    raise HTTPException(status_code=404, detail="Part not found.")

@router.post("/")
def create_part(project_id: str, part_name: str, file_name: str, file_path: str):
    """Create a new part and assign it to a project."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Ensure project exists
        cursor.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,))
        project = cursor.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")

        part_id = str(uuid.uuid4())[:8]  # Short unique ID

        # Generate a unique slug combining part_name and part_id
        slug = f"{part_name.lower().replace(' ', '-')}-{part_id}"

        # Start transaction for safe insert
        conn.execute("BEGIN TRANSACTION;")
        cursor.execute(
            "INSERT INTO parts (part_id, slug, project_id, name, file_name, file_path) VALUES (?, ?, ?, ?, ?, ?)",
            (part_id, slug, project_id, part_name, file_name, file_path)
        )
        conn.commit()  # Commit to release lock

        return {"message": "Part created successfully.", "part_id": part_id, "name": part_name, "slug": slug}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        if conn:
            conn.close()  # Ensure database connection is always closed

@router.put("/{part_id}/")
def update_part(part_id: str, part_name: str = None, file_name: str = None, file_path: str = None):
    """Update part details."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM parts WHERE part_id = ?", (part_id,))
        part = cursor.fetchone()
        if not part:
            raise HTTPException(status_code=404, detail="Part not found.")

        # Start transaction for update
        conn.execute("BEGIN TRANSACTION;")

        if part_name:
            # Generate a new slug using the updated part name and existing part_id
            new_slug = f"{part_name.lower().replace(' ', '-')}-{part_id}"
            cursor.execute("UPDATE parts SET name = ?, slug = ? WHERE part_id = ?", 
                           (part_name, new_slug, part_id))

        if file_name:
            cursor.execute("UPDATE parts SET file_name = ? WHERE part_id = ?", (file_name, part_id))

        if file_path:
            cursor.execute("UPDATE parts SET file_path = ? WHERE part_id = ?", (file_path, part_id))

        conn.commit()  # Commit to release lock

        return {"message": "Part updated successfully.", "part_id": part_id, "new_slug": new_slug if part_name else part["slug"]}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        if conn:
            conn.close()  # Ensure database connection is always closed

@router.delete("/{part_id}/")
def delete_part(part_id: str):
    """Delete a part and clean up associated files including projections."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Start transaction
        conn.execute("BEGIN TRANSACTION;")

        # Retrieve part details before deletion
        cursor.execute("SELECT file_path, thumbnail, projection FROM parts WHERE part_id = ?", (part_id,))
        part = cursor.fetchone()

        if not part:
            raise HTTPException(status_code=404, detail="Part not found.")

        file_path = part['file_path']
        thumbnail = part['thumbnail']
        projection = part['projection']

        # First, delete the database entry to release the lock
        cursor.execute("DELETE FROM parts WHERE part_id = ?", (part_id,))
        conn.commit()  # Commit immediately to free lock

        # Now, remove associated files safely
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        if thumbnail and os.path.exists(thumbnail):
            os.remove(thumbnail)

        if projection and os.path.exists(projection):
            os.remove(projection)

        return {"message": "Part and associated files deleted successfully."}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        if conn:
            conn.close()  # Ensure connection is always closed to prevent locks
