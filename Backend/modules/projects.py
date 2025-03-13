import os
import sqlite3
import uuid
from fastapi import APIRouter, HTTPException
from modules.parts import delete_part  # Import delete_part function from parts.py
from pydantic import BaseModel

router = APIRouter()

# ✅ Database file path
DB_FILE = "database.db"

# ✅ Default Project description
DEFAULT_DESCRIPTION = "Add project description here"  

# ✅ Function to connect to the database with proper timeout and WAL mode
def get_db_connection():
    conn = sqlite3.connect(DB_FILE, timeout=5)  # Prevents lock issues
    conn.row_factory = sqlite3.Row  # Allows dictionary-like row access
    conn.execute("PRAGMA journal_mode=WAL;")  # Enables WAL mode for concurrent access
    conn.execute("PRAGMA busy_timeout = 5000;")  # Waits up to 5 seconds if database is locked
    return conn

# ✅ Fetch advanced settings from SQLite
def get_advanced_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT setting, value FROM advanced_settings;")
    settings = {row["setting"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings

# ✅ Load settings dynamically from SQLite
ADVANCED_SETTINGS = get_advanced_settings()
UPLOAD_BASE = ADVANCED_SETTINGS.get("UPLOAD_FOLDER", "uploads")
PROJECTION_BASE = ADVANCED_SETTINGS.get("PROJECTION_FOLDER", "projections")
THUMBNAIL_BASE = ADVANCED_SETTINGS.get("THUMBNAIL_FOLDER", "thumbnails")

# ✅ Fetch all projects
def load_projects():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects;")
        projects = {row["project_id"]: dict(row) for row in cursor.fetchall()}
        return projects
    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()  # ✅ Ensure connection always closes

@router.get("/")
def get_projects():
    """Fetch all projects."""
    return load_projects()

class ProjectCreateRequest(BaseModel):
    name: str
    description: str = ""  # ✅ Default to empty string if not provided

@router.post("/")
def create_project(request: ProjectCreateRequest):
    """Create a new project, ensuring no duplicate names."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        conn.execute("BEGIN TRANSACTION;")

        # ✅ Ensure description is not empty
        description = request.description.strip() or DEFAULT_DESCRIPTION

        # ✅ Check for duplicate project name
        cursor.execute("SELECT * FROM projects WHERE LOWER(name) = LOWER(?)", (request.name,))
        existing_project = cursor.fetchone()
        if existing_project:
            raise HTTPException(status_code=400, detail="A project with this name already exists.")

        project_id = str(uuid.uuid4())[:8]  # Short unique ID
        cursor.execute(
            "INSERT INTO projects (project_id, slug, name, description, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
            (project_id, f"{request.name.lower().replace(' ', '-')}-{project_id}", request.name, description)
        )

        conn.commit()  # ✅ Commit to release lock
        return {"message": "Project created successfully.", "project_id": project_id, "name": request.name, "description": description}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        if conn:
            conn.close()  # ✅ Prevent database locks

@router.get("/{project_id}/")
def get_project_details(project_id: str):
    """Fetch project details along with all associated parts."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,))
        project = cursor.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")

        cursor.execute("SELECT * FROM parts WHERE project_id = ?", (project_id,))
        parts = [dict(part) for part in cursor.fetchall()]

        return {
            "project_id": project["project_id"],
            "name": project["name"],
            "description": project["description"],
            "created_at": project["created_at"],
            "parts": parts
        }

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    finally:
        if conn:
            conn.close()  # ✅ Ensure connection always closes

class ProjectUpdateRequest(BaseModel):
    name: str
    description: str = ""  # ✅ Default to empty string if not provided

@router.put("/{project_id}/")
def update_project(project_id: str, request: ProjectUpdateRequest):
    """Update project details, ensuring the new name is not a duplicate and preventing database locks."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        conn.execute("BEGIN TRANSACTION;")

        cursor.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,))
        project = cursor.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")

        # ✅ Ensure description is not empty
        description = request.description.strip() or DEFAULT_DESCRIPTION

        # ✅ Check for duplicate name
        cursor.execute("SELECT * FROM projects WHERE LOWER(name) = LOWER(?) AND project_id != ?", (request.name, project_id))
        duplicate_project = cursor.fetchone()
        if duplicate_project:
            raise HTTPException(status_code=400, detail="A project with this name already exists.")

        cursor.execute(
            "UPDATE projects SET name = ?, slug = ?, description = ? WHERE project_id = ?",
            (request.name, f"{request.name.lower().replace(' ', '-')}-{project_id}", description, project_id),
        )

        conn.commit()  # ✅ Commit transaction early to release database lock

        return {"message": "Project updated successfully.", "project_id": project_id, "name": request.name, "description": description}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        if conn:
            conn.close()  # ✅ Prevent database locks


import shutil

@router.delete("/{project_id}/")
def delete_project(project_id: str):
    """Delete a project and remove associated parts, ensuring proper cleanup."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        conn.execute("BEGIN TRANSACTION;")

        # ✅ Fetch associated files for cleanup
        cursor.execute("SELECT file_path, thumbnail, projection FROM parts WHERE project_id = ?", (project_id,))
        parts = cursor.fetchall()

        # ✅ Delete parts and project from the database
        cursor.execute("DELETE FROM parts WHERE project_id = ?", (project_id,))
        cursor.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))

        conn.commit()  # ✅ Commit early to release database lock

        # ✅ Remove associated files
        for part in parts:
            if part["file_path"] and os.path.exists(part["file_path"]):
                os.remove(part["file_path"])
            if part["thumbnail"] and os.path.exists(part["thumbnail"]):
                os.remove(part["thumbnail"])
            if part["projection"] and os.path.exists(part["projection"]):
                os.remove(part["projection"])

        # ✅ Cleanup empty project folders
        project_dirs = [
            os.path.join(UPLOAD_BASE, project_id),
            os.path.join(PROJECTION_BASE, project_id),
            os.path.join(THUMBNAIL_BASE, project_id),
        ]

        for directory in project_dirs:
            if os.path.exists(directory) and os.path.isdir(directory):
                try:
                    shutil.rmtree(directory)  # ✅ Remove folder and its contents if any
                except Exception as e:
                    print(f"❌ Error removing directory {directory}: {e}")

        return {"message": "Project and all associated files deleted successfully."}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        if conn:
            conn.close()  # ✅ Ensure connection always closes
