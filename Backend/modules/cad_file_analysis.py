import os
import shutil
import cairosvg
import sqlite3
import uuid
import json
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from modules.geometric_analysis import analyze_step_file, generate_2d_projection

router = APIRouter()

# Database file path
DB_FILE = "database.db"

# Function to connect to the database
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # Allows dictionary-like row access
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

# ✅ Enable or Disable Debug Mode
DEBUG_MODE = True  # Set to False to disable debug prints

# ✅ Store CAD file data into SQLite instead of JSON
def save_part_data(part_data):
    conn = get_db_connection()
    cursor = conn.cursor()

    # ✅ Debug: Print data before inserting
    print(f"\n🔹 DEBUG: Saving Part Data into DB: {json.dumps(part_data, indent=2)}")

    try:
        cursor.execute("""
            INSERT INTO parts (
                part_id, slug, project_id, name, file_name, file_path, 
                bounding_box_width, bounding_box_depth, bounding_box_height, bounding_box_unit, 
                volume, volume_unit, surface_area, surface_area_unit, 
                center_of_mass_x, center_of_mass_y, center_of_mass_z, center_of_mass_unit, 
                faces, edges, components, machining_time, machining_time_unit, projection, thumbnail
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            part_data["part_id"],
            part_data["slug"],
            part_data["project_id"],
            part_data["part_name"], 
            part_data["file_name"],
            part_data["file_path"],

            # ✅ Extract numeric values from dictionaries
            part_data["analysis"]["bounding_box"]["width"]["value"],
            part_data["analysis"]["bounding_box"]["depth"]["value"],
            part_data["analysis"]["bounding_box"]["height"]["value"],
            1,  # ✅ Ensure correct unit index for bounding box

            part_data["analysis"]["volume"]["value"],
            3,  # ✅ Ensure correct unit index for volume

            part_data["analysis"]["surface_area"]["value"],
            2,  # ✅ Ensure correct unit index for surface area

            part_data["analysis"]["center_of_mass"]["x"]["value"],
            part_data["analysis"]["center_of_mass"]["y"]["value"],
            part_data["analysis"]["center_of_mass"]["z"]["value"],
            1,  # ✅ Ensure correct unit index for center of mass

            part_data["analysis"]["faces"],
            part_data["analysis"]["edges"],
            part_data["analysis"]["components"],

            part_data["analysis"]["machining_time"]["value"],
            4,  # ✅ Ensure correct unit index for machining time

            part_data["projection"],
            part_data["thumbnail"]
        ))

        conn.commit()
        print("✅ DEBUG: Part successfully saved in database.")

    except Exception as e:
        print(f"❌ DEBUG: Database Insert Error: {e}")

    finally:
        conn.close()


# ✅ Upload and analyze CAD file
@router.post("/upload/")
async def upload_cad_file(
    file: UploadFile = File(...),
    project_id: str = Query(None, description="Project ID")
):
    """Processes a CAD file, assigns a unique part ID, and saves it under a project."""
    if DEBUG_MODE:
        print(f"\n🔹 DEBUG: Starting upload for file: {file.filename}")

    if not project_id:
        raise HTTPException(status_code=400, detail="Project ID is required.")

    part_name = os.path.splitext(file.filename)[0]
    part_id = str(uuid.uuid4())[:8]

    # ✅ Ensure project exists
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,))
    project = cursor.fetchone()
    conn.close()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # ✅ Create project-specific directories
    project_upload_dir = os.path.join(UPLOAD_BASE, project_id)
    project_proj_dir = os.path.join(PROJECTION_BASE, project_id)
    project_thumb_dir = os.path.join(THUMBNAIL_BASE, project_id)
    os.makedirs(project_upload_dir, exist_ok=True)
    os.makedirs(project_proj_dir, exist_ok=True)
    os.makedirs(project_thumb_dir, exist_ok=True)

    file_path = os.path.join(project_upload_dir, file.filename)

    # ✅ Save the uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    if DEBUG_MODE:
        print(f"✅ DEBUG: File saved at {file_path}")

    try:
        # ✅ STEP 1: Analyze CAD file
        analysis_result = analyze_step_file(file_path)

        if DEBUG_MODE:
            print(f"✅ DEBUG: Analysis Result: {json.dumps(analysis_result, indent=2)}")

        if not analysis_result:
            raise HTTPException(status_code=400, detail="Failed to analyze CAD file.")

        # ✅ STEP 2: Generate Projection
        svg_filename = f"{part_name}.svg"
        svg_path = os.path.join(project_proj_dir, svg_filename)
        svg_generated = generate_2d_projection(file_path, svg_path)

        if not svg_generated or not os.path.exists(svg_path):
            svg_path = None

        if DEBUG_MODE:
            print(f"✅ DEBUG: Projection SVG Path: {svg_path}")

        # ✅ STEP 3: Generate Thumbnail
        thumbnail_filename = f"{part_name}.png"
        thumbnail_path = generate_thumbnail(svg_path, thumbnail_filename, project_id)

        if not thumbnail_path or not os.path.exists(thumbnail_path):
            thumbnail_path = None

        if DEBUG_MODE:
            print(f"✅ DEBUG: Thumbnail Path: {thumbnail_path}")

        if DEBUG_MODE:
            print(f"✅ DEBUG: trying to saving data")

        # ✅ STEP 4: Store Part Data in SQLite
        part_data = {
            "part_id": part_id,
            "slug": f"{part_name.lower().replace(' ', '-')}-{part_id}",
            "part_name": part_name,
            "file_name": file.filename,
            "file_path": file_path,
            "project_id": project_id,
            "analysis": analysis_result,
            "projection": svg_path if svg_path else "",
            "thumbnail": thumbnail_path if thumbnail_path else ""
        }

        if DEBUG_MODE:
            print(f"✅ DEBUG: Part Data before saving: {json.dumps(part_data, indent=2)}")

        save_part_data(part_data)

        if DEBUG_MODE:
            print("✅ DEBUG: Part saved successfully in the database.")

        return {"status": "success", "data": part_data}

    except Exception as e:
        print(f"❌ DEBUG: Error during file upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

# ✅ Fetch stored parts from SQLite
@router.get("/stored_data/")
def get_stored_parts():
    """Fetch all stored CAD file analysis data, grouped by project."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM parts")
    parts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {"parts": parts}

# ✅ Serve thumbnails from stored paths
@router.get("/thumbnail/{project_id}/{filename}")
def get_thumbnail(project_id: str, filename: str):
    """Serves the generated thumbnail file."""
    file_path = os.path.join(THUMBNAIL_BASE, project_id, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="image/png")
    
    raise HTTPException(status_code=404, detail="Thumbnail not found.")
