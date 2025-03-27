import os
import shutil
import cairosvg
import sqlite3
import uuid
import json
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from modules.geometric_analysis import analyze_step_file, generate_2d_projection

router = APIRouter()

# ✅ Database connection setup
DB_FILE = "database.db"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # Avoid locking issues
    return conn

# ✅ Fetch advanced settings
def get_advanced_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT setting, value FROM advanced_settings;")
    settings = {row["setting"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings

def ensure_json_string(value):
    if isinstance(value, str):
        try:
            json.loads(value)  # validate it's real JSON
            return value
        except json.JSONDecodeError:
            return json.dumps({})  # fallback to empty dict
    return json.dumps(value)


# ✅ Load settings dynamically
ADVANCED_SETTINGS = get_advanced_settings()
UPLOAD_BASE = ADVANCED_SETTINGS.get("UPLOAD_FOLDER", "uploads")
PROJECTION_BASE = ADVANCED_SETTINGS.get("PROJECTION_FOLDER", "projections")
THUMBNAIL_BASE = ADVANCED_SETTINGS.get("THUMBNAIL_FOLDER", "thumbnails")

# ✅ Ensure required directories exist
os.makedirs(UPLOAD_BASE, exist_ok=True)
os.makedirs(PROJECTION_BASE, exist_ok=True)
os.makedirs(THUMBNAIL_BASE, exist_ok=True)

# ✅ New Bounding Box Schema (Single Unit Field)
class BoundingBox(BaseModel):
    width: float = Field(0.0, description="Bounding box width")
    depth: float = Field(0.0, description="Bounding box depth")
    height: float = Field(0.0, description="Bounding box height")
    unit: str = Field("mm", description="Measurement unit for bounding box")

class GeometryData(BaseModel):
    bounding_box: BoundingBox
    volume: Dict[str, Any] = Field(default={"value": 0, "unit": "mm³"})
    surface_area: Dict[str, Any] = Field(default={"value": 0, "unit": "mm²"})

class ManualPartEntry(BaseModel):
    project_id: str = Field(..., description="Project ID to associate the part with")
    name: str = Field(..., description="Name of the part")
    geometry_details: GeometryData
    classification_id: Optional[int] = Field(None, description="Part Classification ID")  # ✅ Changed from List[str] to int
    raw_material_details: Dict[str, Any] = Field(default_factory=dict)
    machining_details: Dict[str, Any] = Field(default_factory=dict)
    costing_details: Dict[str, Any] = Field(default_factory=dict)
    user_override: bool = Field(default=False)

# ✅ Store CAD file data (Insert or Update)
def save_part_data(part_data):
    conn = get_db_connection()
    cursor = conn.cursor()

    # ✅ Generate part_id & slug if missing (for manual entry)
    if "part_id" not in part_data:
        part_data["part_id"] = str(uuid.uuid4())[:8]
    if "slug" not in part_data:
        part_data["slug"] = f"{part_data['name'].lower().replace(' ', '-')}-{part_data['part_id']}"

    # ✅ Default values
    file_name = part_data.get("file_name", "")
    file_path = part_data.get("file_path", "")
    projection = part_data.get("projection", "")
    thumbnail = part_data.get("thumbnail", "")
    modified_by = part_data.get("modified_by", None)
    is_manual = part_data.get("is_manual", False)

    # ✅ Ensure geometry is stored as JSON string
    geometry_details = (
        json.dumps(part_data["geometry_details"])
        if isinstance(part_data["geometry_details"], dict)
        else part_data["geometry_details"]
    )

    # ✅ Optional JSON fields
    raw_material_details = ensure_json_string(part_data.get("raw_material_details", {}))
    machining_details = ensure_json_string(part_data.get("machining_details", {}))
    costing_details = ensure_json_string(part_data.get("costing_details", {}))
    classification_id = part_data.get("classification_id", None)

    # ✅ Detect if it's an update (by part_id or project_id+name)
    existing_part = None
    if "part_id" in part_data:
        cursor.execute("SELECT id FROM parts WHERE part_id = ?", (part_data["part_id"],))
        existing_part = cursor.fetchone()
    elif "project_id" in part_data and "name" in part_data:
        cursor.execute(
            "SELECT id FROM parts WHERE project_id = ? AND name = ?",
            (part_data["project_id"], part_data["name"]),
        )
        existing_part = cursor.fetchone()

    if existing_part:
        # ✅ Update existing part
        cursor.execute(
            """
            UPDATE parts SET 
                file_name = ?, file_path = ?, geometry_details = ?, raw_material_details = ?, 
                machining_details = ?, costing_details = ?, user_override = ?, 
                projection = ?, thumbnail = ?, classification_id = ?, 
                modified_by = ?, is_manual = ?
            WHERE id = ?
            """,
            (
                file_name,
                file_path,
                geometry_details,
                raw_material_details,
                machining_details,
                costing_details,
                part_data.get("user_override", False),
                projection,
                thumbnail,
                classification_id,
                modified_by,
                is_manual,
                existing_part["id"],
            ),
        )
        action = "updated"
    else:
        # ✅ Insert new part
        cursor.execute(
            """
            INSERT INTO parts (
                part_id, slug, project_id, name, file_name, file_path, 
                geometry_details, raw_material_details, machining_details, costing_details, 
                user_override, classification_id, projection, thumbnail, 
                is_manual, modified_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                part_data["part_id"],
                part_data["slug"],
                part_data["project_id"],
                part_data["name"],
                file_name,
                file_path,
                geometry_details,
                raw_material_details,
                machining_details,
                costing_details,
                part_data.get("user_override", False),
                classification_id,
                projection,
                thumbnail,
                is_manual,
                modified_by
            )
        )
        action = "inserted"

    conn.commit()
    conn.close()
    print(f"✅ Part {action} successfully in database.")



# ✅ Upload and analyze CAD file
@router.post("/upload/")
async def upload_cad_file(
    file: UploadFile = File(...),
    project_id: str = Query(..., description="Project ID"),
    classification_id: int = Query(..., description="Classification ID"),
    modified_by: str = Query("system", description="User making the upload")  # Optional for tracking
):
    """Processes a CAD file, assigns a unique part ID, and saves it under a project."""

    if not project_id or not classification_id:
        raise HTTPException(status_code=400, detail="Project ID and Classification ID are required.")

    part_name = os.path.splitext(file.filename)[0]
    part_id = str(uuid.uuid4())[:8]

    # ✅ Check if part name already exists in the same project
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,))
    project = cursor.fetchone()

    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found.")

    cursor.execute("SELECT * FROM parts WHERE project_id = ? AND name = ?", (project_id, part_name))
    existing = cursor.fetchone()
    conn.close()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A part with name '{part_name}' already exists in this project."
        )

    # ✅ Create required directories
    project_upload_dir = os.path.join(UPLOAD_BASE, project_id)
    project_proj_dir = os.path.join(PROJECTION_BASE, project_id)
    project_thumb_dir = os.path.join(THUMBNAIL_BASE, project_id)
    os.makedirs(project_upload_dir, exist_ok=True)
    os.makedirs(project_proj_dir, exist_ok=True)
    os.makedirs(project_thumb_dir, exist_ok=True)

    file_path = os.path.join(project_upload_dir, file.filename)

    # ✅ Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # ✅ STEP 1: Analyze CAD file
        analysis_result = analyze_step_file(file_path)
        if not analysis_result:
            raise HTTPException(status_code=400, detail="Failed to analyze CAD file.")

        # ✅ STEP 2: Generate Projection
        svg_filename = f"{part_name}.svg"
        svg_path = os.path.join(project_proj_dir, svg_filename)
        svg_generated = generate_2d_projection(file_path, svg_path)
        if not svg_generated or not os.path.exists(svg_path):
            svg_path = None

        # ✅ STEP 3: Generate Thumbnail
        thumbnail_filename = f"{part_name}.png"
        thumbnail_path = generate_thumbnail(svg_path, thumbnail_filename, project_id)
        if not thumbnail_path or not os.path.exists(thumbnail_path):
            thumbnail_path = None

        # ✅ STEP 4: Store Part Data
        part_data = {
            "part_id": part_id,
            "slug": f"{part_name.lower().replace(' ', '-')}-{part_id}",
            "name": part_name,
            "file_name": file.filename,
            "file_path": file_path,
            "project_id": project_id,
            "classification_id": classification_id,
            "geometry_details": analysis_result,
            "projection": svg_path if svg_path else "",
            "thumbnail": thumbnail_path if thumbnail_path else "",
            "user_override": False,
            "is_manual": False,
            "modified_by": modified_by
        }

        save_part_data(part_data)

        return {"status": "success", "data": part_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ Re-upload Route for Existing Parts
@router.post("/reupload/{part_id}")
async def reupload_cad_file(
    part_id: str,
    file: UploadFile = File(...),
    modified_by: str = Query(..., description="User performing reupload"),
):
    """Replaces an existing part's CAD file and recalculates geometry & preview."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # ✅ Get existing part
    cursor.execute("SELECT * FROM parts WHERE part_id = ?", (part_id,))
    part = cursor.fetchone()

    if not part:
        conn.close()
        raise HTTPException(status_code=404, detail="Part not found.")

    project_id = part["project_id"]
    part_name = part["name"]

    # ✅ Directories
    project_upload_dir = os.path.join(UPLOAD_BASE, project_id)
    project_proj_dir = os.path.join(PROJECTION_BASE, project_id)
    project_thumb_dir = os.path.join(THUMBNAIL_BASE, project_id)
    os.makedirs(project_upload_dir, exist_ok=True)
    os.makedirs(project_proj_dir, exist_ok=True)
    os.makedirs(project_thumb_dir, exist_ok=True)

    # ✅ Overwrite existing file
    file_path = os.path.join(project_upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # ✅ Analyze CAD file
        analysis_result = analyze_step_file(file_path)
        if not analysis_result:
            raise HTTPException(status_code=400, detail="Failed to analyze CAD file.")

        # ✅ Generate projection
        svg_filename = f"{part_name}.svg"
        svg_path = os.path.join(project_proj_dir, svg_filename)
        generate_2d_projection(file_path, svg_path)

        # ✅ Generate thumbnail
        thumbnail_filename = f"{part_name}.png"
        thumbnail_path = generate_thumbnail(svg_path, thumbnail_filename, project_id)

        # ✅ Build updated part data
        updated_part_data = {
            "id": part["id"],  # use primary key to force update
            "part_id": part["part_id"],
            "slug": part["slug"],
            "project_id": project_id,
            "name": part_name,
            "file_name": file.filename,
            "file_path": file_path,
            "geometry_details": analysis_result,
            "projection": svg_path,
            "thumbnail": thumbnail_path,
            "classification_id": part["classification_id"],
            "raw_material_details": part["raw_material_details"],
            "machining_details": part["machining_details"],
            "costing_details": part["costing_details"],
            "user_override": False,
            "modified_by": modified_by,
            "is_manual": False
        }

        save_part_data(updated_part_data)

        return {"status": "success", "message": "Reupload successful", "data": updated_part_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ Function to normalize manual entry data
def prepare_manual_entry_data(part_data):
    """Prepares manual entry data by ensuring proper formatting before saving."""
    
    # ✅ Generate part_id & slug if missing
    if "part_id" not in part_data:
        part_data["part_id"] = str(uuid.uuid4())[:8]  
    if "slug" not in part_data:
        part_data["slug"] = f"{part_data['name'].lower().replace(' ', '-')}-{part_data['part_id']}"

    # ✅ Ensure classification ID is stored correctly
    if "classification" in part_data:
        if isinstance(part_data["classification"], list) and part_data["classification"]:
            classification_id = part_data["classification"][0]
            if isinstance(classification_id, str):  
                try:
                    part_data["classification_id"] = int(classification_id)  # ✅ Convert if string
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid classification ID format.")
            else:
                part_data["classification_id"] = classification_id  # ✅ Already an integer
        else:
            part_data["classification_id"] = None  # ✅ Handle missing classification

    # ✅ Deserialize `geometry_details` if it's a string
    if isinstance(part_data["geometry_details"], str):
        try:
            part_data["geometry_details"] = json.loads(part_data["geometry_details"])
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format in geometry_details")

    # ✅ Ensure optional fields exist as JSON
    part_data["raw_material_details"] = part_data.get("raw_material_details", {})
    part_data["machining_details"] = part_data.get("machining_details", {})
    part_data["costing_details"] = part_data.get("costing_details", {})

    # ✅ Set other optional fields
    part_data.setdefault("file_name", "")
    part_data.setdefault("file_path", "")
    part_data.setdefault("projection", "")
    part_data.setdefault("thumbnail", "")
    part_data.setdefault("user_override", False)

    return part_data


@router.post("/manual_entry/")
async def manual_entry(part_data: ManualPartEntry):
    """Allows users to manually enter geometric details instead of uploading a CAD file."""

    # ✅ Ensure project exists
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE project_id = ?", (part_data.project_id,))
    project = cursor.fetchone()
    conn.close()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # ✅ Prepare manual entry data
    formatted_data = part_data.dict()
    formatted_data["is_manual"] = True  # ✅ Mark as manual entry

    # ✅ Save to database using `save_part_data`
    save_part_data(formatted_data)

    # ✅ Deserialize `geometry_details` before returning response
    formatted_data["geometry_details"] = formatted_data["geometry_details"]

    # ✅ Construct response
    response_data = {
        "part_id": formatted_data["part_id"],
        "slug": formatted_data["slug"],
        "name": formatted_data["name"],
        "file_name": "",
        "file_path": "",
        "project_id": formatted_data["project_id"],
        "geometry_details": formatted_data["geometry_details"],
        "classification_id": formatted_data["classification_id"],  # ✅ Now included in response
        "projection": "",
        "thumbnail": ""
    }

    return {"status": "success", "message": "Manual entry saved successfully.", "data": response_data}

@router.post("/recalculate/{part_id}")
async def recalculate_geometry(part_id: str, modified_by: str = Query("system")):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM parts WHERE part_id = ?", (part_id,))
    part = cursor.fetchone()

    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    file_path = part["file_path"]
    part_name = part["name"]
    project_id = part["project_id"]

    if not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="Original CAD file not found.")

    # Ensure directories
    project_proj_dir = os.path.join(PROJECTION_BASE, project_id)
    project_thumb_dir = os.path.join(THUMBNAIL_BASE, project_id)
    os.makedirs(project_proj_dir, exist_ok=True)
    os.makedirs(project_thumb_dir, exist_ok=True)

    # Re-run geometry analysis
    analysis_result = analyze_step_file(file_path)
    if not analysis_result:
        raise HTTPException(status_code=400, detail="Failed to analyze CAD file.")

    # Generate updated projection
    svg_filename = f"{part_name}.svg"
    svg_path = os.path.join(project_proj_dir, svg_filename)
    generate_2d_projection(file_path, svg_path)

    # Generate updated thumbnail
    thumbnail_filename = f"{part_name}.png"
    thumbnail_path = generate_thumbnail(svg_path, thumbnail_filename, project_id)

    # Update in DB
    cursor.execute("""
        UPDATE parts SET 
            geometry_details = ?, projection = ?, thumbnail = ?, 
            user_override = 0, modified_by = ?, last_updated = CURRENT_TIMESTAMP
        WHERE part_id = ?
    """, (
        json.dumps(analysis_result),
        svg_path,
        thumbnail_path,
        modified_by,
        part_id
    ))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "message": "Geometry recalculated from CAD file.",
        "data": {
            "geometry_details": analysis_result,
            "projection": svg_path,
            "thumbnail": thumbnail_path
        }
    }

# ✅ Generate Thumbnail
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

# ✅ Serve thumbnails from stored paths
@router.get("/thumbnail/{project_id}/{filename}")
def get_thumbnail(project_id: str, filename: str):
    """Serves the generated thumbnail file."""
    file_path = os.path.join(THUMBNAIL_BASE, project_id, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="image/png")
    
    raise HTTPException(status_code=404, detail="Thumbnail not found.")

# ✅ Serve thumbnails from stored paths
@router.get("/projections/{project_id}/{filename}")
def get_thumbnail(project_id: str, filename: str):
    """Serves the generated thumbnail file."""
    file_path = os.path.join(PROJECTION_BASE, project_id, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="svg")
    
    raise HTTPException(status_code=404, detail="Projection not found.")