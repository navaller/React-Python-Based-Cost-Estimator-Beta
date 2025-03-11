import os
import json
import shutil
import cairosvg
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from modules.settings import load_settings
from modules.geometric_analysis import analyze_step_file, generate_2d_projection
import uuid

router = APIRouter()

# ✅ Load settings dynamically
settings = load_settings()

# ✅ Fetch file paths dynamically
ADVANCED_SETTINGS = settings.get("advanced_settings", {})
DATA_STORAGE_PATH = ADVANCED_SETTINGS.get("DATA_STORAGE_PATH", "storage")
UPLOAD_BASE = ADVANCED_SETTINGS.get("UPLOAD_FOLDER", "uploads")
PROJECTION_BASE = ADVANCED_SETTINGS.get("PROJECTION_FOLDER", "projections")
THUMBNAIL_BASE = ADVANCED_SETTINGS.get("THUMBNAIL_FOLDER", "thumbnails")

STORED_DATA_FILE = os.path.join(DATA_STORAGE_PATH, "stored_data.json")
PROJECTS_FILE = os.path.join(DATA_STORAGE_PATH, "projects.json")

# ✅ Ensure necessary directories exist
os.makedirs(DATA_STORAGE_PATH, exist_ok=True)

def save_stored_data(data):
    """Save CAD file analysis data to a JSON file."""
    with open(STORED_DATA_FILE, "w") as file:
        json.dump(data, file, indent=4)

def load_stored_data():
    """Load stored CAD file analysis data from JSON."""
    if os.path.exists(STORED_DATA_FILE):
        with open(STORED_DATA_FILE, "r") as file:
            return json.load(file)
    return {}

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

def generate_thumbnail(svg_path, thumbnail_filename, project_id):
    """Generates a thumbnail from an SVG and stores it in a project-specific folder."""
    project_thumb_dir = os.path.join(THUMBNAIL_BASE, project_id)
    os.makedirs(project_thumb_dir, exist_ok=True)
    
    thumbnail_path = os.path.join(project_thumb_dir, thumbnail_filename)
    temp_png_path = os.path.join(project_thumb_dir, "temp.png")
    
    try:
        # Convert SVG to PNG
        if not os.path.exists(svg_path):
            print(f"❌ SVG file not found: {svg_path}")
            return None

        cairosvg.svg2png(url=svg_path, write_to=temp_png_path, output_width=500, output_height=500)
        
        with Image.open(temp_png_path) as img:
            img = img.convert("RGBA")
            bbox = img.getbbox()
            if bbox:
                img = img.crop(bbox)  # Trim empty spaces
            
            left, top, right, bottom = img.getbbox()
            img = img.crop((left + 0, top, right, bottom))  # Remove 50px from the left
            
            img.thumbnail((500, 500))
            img.save(thumbnail_path)

        os.remove(temp_png_path)  # Cleanup temp file
        
        print(f"✅ Thumbnail created: {thumbnail_path}")
        return thumbnail_path
    except Exception as e:
        print(f"❌ Error generating thumbnail: {e}")
        return None

@router.post("/upload/")
async def upload_cad_file(
    file: UploadFile = File(...),
    project_id: str = Query(None, description="Project ID")
):
    """Processes a CAD file, assigns a unique part ID, and saves it under a project."""
    if not project_id:
        raise HTTPException(status_code=400, detail="Project ID is required.")

    stored_data = load_stored_data()
    projects = load_projects()  # Load existing projects
    part_name = os.path.splitext(file.filename)[0]  # Extract name without extension
    
    # **Ensure project exists**
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found.")

    # **Generate a Unique Part ID**
    part_id = str(uuid.uuid4())[:8]  # Short unique identifier

    # **Ensure project-specific directories exist**
    project_upload_dir = os.path.join(UPLOAD_BASE, project_id)
    project_proj_dir = os.path.join(PROJECTION_BASE, project_id)
    project_thumb_dir = os.path.join(THUMBNAIL_BASE, project_id)
    os.makedirs(project_upload_dir, exist_ok=True)
    os.makedirs(project_proj_dir, exist_ok=True)
    os.makedirs(project_thumb_dir, exist_ok=True)

    # **Use the original filename**
    file_path = os.path.join(project_upload_dir, file.filename)

    # **Prevent duplicate uploads in the same project**
    for existing_part in projects[project_id]["parts"]:
        if existing_part["file_name"] == file.filename:
            raise HTTPException(status_code=400, detail="A part with the same name already exists in this project.")

    # **Save the uploaded file**
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # **STEP 1: Analyze CAD file**
        analysis_result = analyze_step_file(file_path)
        if not analysis_result:
            raise HTTPException(status_code=400, detail="Failed to analyze CAD file.")
        
        print(f"✅ CAD analysis successful for: {file.filename}")

        # **STEP 2: Generate Projection**
        svg_filename = f"{part_name}.svg"
        svg_path = os.path.join(project_proj_dir, svg_filename)
        svg_generated = generate_2d_projection(file_path, svg_path)

        if not svg_generated or not os.path.exists(svg_path):
            print(f"❌ Failed to generate SVG for: {file.filename}")
            svg_path = None

        print(f"✅ SVG generated at: {svg_path}")

        # **STEP 3: Generate Thumbnail**
        thumbnail_filename = f"{part_name}.png"
        thumbnail_path = generate_thumbnail(svg_path, thumbnail_filename, project_id)

        if not thumbnail_path or not os.path.exists(thumbnail_path):
            print(f"❌ Failed to generate Thumbnail for: {file.filename}")
            thumbnail_path = None
        
        print(f"✅ Thumbnail generated at: {thumbnail_path}")

        # **STEP 4: Store Part Data**
        part_data = {
            "part_id": part_id,  # ✅ Store unique part ID
            "part_name": part_name,
            "file_name": file.filename,
            "file_path": file_path,
            "project_id": project_id,
            "analysis": analysis_result,
            "projection": svg_path if svg_path else "",
            "thumbnail": thumbnail_path if thumbnail_path else ""
        }
        
        # **Save to stored_data.json**
        stored_data[part_id] = part_data
        save_stored_data(stored_data)

        # **Assign part to project**
        projects[project_id]["parts"].append(part_data)
        save_projects(projects)

        return {"status": "success", "data": part_data}
    
    except Exception as e:
        print(f"❌ Error in upload process: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stored_data/")
def get_stored_parts():
    """Fetch all stored CAD file analysis data, grouped by project."""
    stored_data = load_stored_data()
    projects = load_projects()

    # ✅ Group parts by project
    project_parts = {pid: {"project_name": pdata["name"], "parts": []} for pid, pdata in projects.items()}

    for part_id, part_info in stored_data.items():
        project_id = part_info.get("project_id", "unassigned")
        if project_id not in project_parts:
            project_parts[project_id] = {"project_name": "Unassigned Parts", "parts": []}

        project_parts[project_id]["parts"].append(part_info)

    return project_parts

@router.get("/thumbnail/{project_id}/{filename}")
def get_thumbnail(project_id: str, filename: str):
    """Serves the generated thumbnail file."""
    file_path = os.path.join(THUMBNAIL_BASE, project_id, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="image/png")
    
    raise HTTPException(status_code=404, detail="Thumbnail not found.")
