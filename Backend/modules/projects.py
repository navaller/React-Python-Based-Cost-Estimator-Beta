import os
import json
import uuid
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

@router.get("/")
def get_projects():
    """Fetch all projects."""
    return load_projects()

@router.post("/")
def create_project(name: str, description: str = ""):
    """Create a new project, ensuring no duplicate names."""
    projects = load_projects()

    # Check if the project name already exists
    for project in projects.values():
        if project["name"].lower() == name.lower():
            raise HTTPException(status_code=400, detail="A project with this name already exists.")

    project_id = str(uuid.uuid4())[:8]  # Shorter unique ID
    
    projects[project_id] = {
        "id": project_id,
        "name": name,
        "description": description,
        "parts": [],
        "created_at": "2025-03-04T12:00:00Z"
    }
    save_projects(projects)
    
    return {"message": "Project created successfully.", "project": projects[project_id]}

@router.get("/{project_id}/")
def get_project_details(project_id: str):
    """Fetch details of a specific project."""
    projects = load_projects()
    if project_id in projects:
        return projects[project_id]
    raise HTTPException(status_code=404, detail="Project not found.")

@router.put("/{project_id}/")
def update_project(project_id: str, name: str = None, description: str = None):
    """Update project details, ensuring the new name is not a duplicate."""
    projects = load_projects()
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Check for duplicate name if updating the project name
    if name:
        for proj_id, project in projects.items():
            if proj_id != project_id and project["name"].lower() == name.lower():
                raise HTTPException(status_code=400, detail="A project with this name already exists.")
        projects[project_id]["name"] = name

    if description:
        projects[project_id]["description"] = description
    
    save_projects(projects)
    return {"message": "Project updated successfully.", "project": projects[project_id]}

@router.delete("/{project_id}/")
def delete_project(project_id: str):
    """Delete a project and remove associated parts from stored data."""
    projects = load_projects()
    stored_data = {}

    if os.path.exists(STORED_DATA_FILE):
        with open(STORED_DATA_FILE, "r") as file:
            stored_data = json.load(file)
    
    if project_id in projects:
        part_ids = projects[project_id]["parts"]
        for part_id in part_ids:
            if part_id in stored_data:
                del stored_data[part_id]  # Remove associated parts
        
        del projects[project_id]
        save_projects(projects)
        
        # Update stored data file
        with open(STORED_DATA_FILE, "w") as file:
            json.dump(stored_data, file, indent=4)
        
        return {"message": "Project and associated parts deleted successfully."}
    
    raise HTTPException(status_code=404, detail="Project not found.")
