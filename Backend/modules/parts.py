import os
import json
from fastapi import APIRouter, HTTPException
from modules.settings import load_settings

router = APIRouter()

# Load settings and set paths
settings = load_settings()
DATA_STORAGE_PATH = settings.get("DATA_STORAGE_PATH", "storage")
PROJECTS_FILE = os.path.join(DATA_STORAGE_PATH, "projects.json")
STORED_DATA_FILE = os.path.join(DATA_STORAGE_PATH, "stored_data.json")

# Ensure necessary directories exist
os.makedirs(DATA_STORAGE_PATH, exist_ok=True)

def load_projects():
    """Load project data from JSON."""
    if os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, "r") as file:
            return json.load(file)
    return {}

def save_projects(projects):
    """Save project data to JSON."""
    with open(PROJECTS_FILE, "w") as file:
        json.dump(projects, file, indent=4)

def load_stored_data():
    """Load stored parts data from JSON."""
    if os.path.exists(STORED_DATA_FILE):
        with open(STORED_DATA_FILE, "r") as file:
            return json.load(file)
    return {}

def save_stored_data(data):
    """Save parts data to JSON."""
    with open(STORED_DATA_FILE, "w") as file:
        json.dump(data, file, indent=4)

@router.get("/projects/{project_id}/parts/")
def get_project_parts(project_id: str):
    """Fetch all parts associated with a specific project."""
    projects = load_projects()
    stored_data = load_stored_data()

    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found.")

    part_ids = projects[project_id]["parts"]
    parts = {part_id: stored_data[part_id] for part_id in part_ids if part_id in stored_data}

    return {"project_id": project_id, "parts": parts}

@router.post("/projects/{project_id}/add_part/")
def add_part_to_project(project_id: str, part_id: str):
    """Assign a part to a project."""
    projects = load_projects()
    stored_data = load_stored_data()

    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    if part_id not in stored_data:
        raise HTTPException(status_code=404, detail="Part not found.")

    if part_id in projects[project_id]["parts"]:
        raise HTTPException(status_code=400, detail="Part already assigned to this project.")

    projects[project_id]["parts"].append(part_id)
    stored_data[part_id]["project_id"] = project_id  # Track project in part data

    save_projects(projects)
    save_stored_data(stored_data)

    return {"message": "Part assigned to project successfully.", "project": projects[project_id]}

@router.delete("/projects/{project_id}/remove_part/{part_id}")
def remove_part_from_project(project_id: str, part_id: str):
    """Remove a part from a project."""
    projects = load_projects()
    stored_data = load_stored_data()

    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found.")

    if part_id not in stored_data:
        raise HTTPException(status_code=404, detail="Part not found.")

    if part_id not in projects[project_id]["parts"]:
        raise HTTPException(status_code=400, detail="Part is not assigned to this project.")

    projects[project_id]["parts"].remove(part_id)
    stored_data[part_id]["project_id"] = None  # Unassign project

    save_projects(projects)
    save_stored_data(stored_data)

    return {"message": "Part removed from project successfully."}

@router.get("/part/{part_id}/")
def get_part_details(part_id: str):
    """Fetch details of a single part by ID."""
    stored_data = load_stored_data()
    if part_id in stored_data:
        return stored_data[part_id]
    raise HTTPException(status_code=404, detail="Part not found.")