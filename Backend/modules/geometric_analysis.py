from fastapi import APIRouter, HTTPException
import cadquery as cq
import os
import sqlite3
from cadquery import exporters
import json

from modules.unit_conversion import convert_units

router = APIRouter()

# Database file path
DB_FILE = "database.db"

# Function to connect to the database
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # Allows dictionary-like row access
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn

# ✅ Fetch settings from SQLite
def get_advanced_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT setting, value FROM advanced_settings;")
    settings = {row["setting"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings

# ✅ Load settings dynamically from SQLite
ADVANCED_SETTINGS = get_advanced_settings()
PROJECTION_FOLDER = ADVANCED_SETTINGS.get("PROJECTION_FOLDER", "projections")

# ✅ Enable or Disable Debug Mode
DEBUG_MODE = False  # Set to False to disable debug prints

# ✅ Ensure directory exists
os.makedirs(PROJECTION_FOLDER, exist_ok=True)

# ✅ Fetch user-selected target units dynamically from SQLite
def get_unit_preference(unit_type):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT unit_name FROM units WHERE unit_type = ? LIMIT 1;", (unit_type,))
    result = cursor.fetchone()
    conn.close()
    return result["unit_name"] if result else None

@router.get("/unit-preference/")
def get_unit_preference_route(unit_type: str):
    """
    Debug route to fetch the current unit preference for a given unit_type.
    Example: /cad/unit-preference/?unit_type=length
    """
    try:
        unit = get_unit_preference(unit_type)
        if not unit:
            raise HTTPException(status_code=404, detail=f"No unit preference found for type '{unit_type}'")
        return {"unit_type": unit_type, "preferred_unit": unit}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unit preference: {str(e)}")


# ✅ Analyze STEP file and return JSON-based geometric details
def analyze_step_file(step_file):
    try:
        # ✅ Load STEP File
        part = cq.importers.importStep(step_file)
        bbox = part.val().BoundingBox()
        
        # ✅ Extract original values (SI units: mm, mm², mm³)
        raw_values = {
            "bounding_box": {
                "width": bbox.xmax - bbox.xmin,
                "depth": bbox.ymax - bbox.ymin,
                "height": bbox.zmax - bbox.zmin,
                "unit": "mm"
            },
            "volume": {
                "value": part.val().Volume(),
                "unit": "mm³"
            },
            "surface_area": {
                "value": part.val().Area(),
                "unit": "mm²"
            }
        }

        # ✅ Fetch user-defined target units
        length_unit = get_unit_preference("length")
        volume_unit = get_unit_preference("volume")
        area_unit = get_unit_preference("area")

        # ✅ Convert geometric values to user-defined units
        converted_values = {
            "bounding_box": {
                "width": convert_units(raw_values["bounding_box"]["width"], "mm", length_unit),
                "depth": convert_units(raw_values["bounding_box"]["depth"], "mm", length_unit),
                "height": convert_units(raw_values["bounding_box"]["height"], "mm", length_unit),
                "unit": length_unit
            },
            "volume": {
                "value": convert_units(raw_values["volume"]["value"], "mm³", volume_unit),
                "unit": volume_unit
            },
            "surface_area": {
                "value": convert_units(raw_values["surface_area"]["value"], "mm²", area_unit),
                "unit": area_unit
            }
        }

        # ✅ Final Analysis Result in JSON Format
        analysis_result = {
            **converted_values,  # ✅ Store as JSON
            "faces": part.faces().size(),
            "edges": part.edges().size(),
            "components": len(part.objects)
        }

        print(f"{analysis_result, length_unit, volume_unit, area_unit}")

        return analysis_result
    except Exception as e:
        print(f"❌ Error analyzing STEP file: {e}")
        return None

@router.get("/analyze/")
def analyze_geometry(file_name: str):
    """API endpoint to analyze a STEP file and return geometric properties."""
    file_path = os.path.join("uploads", file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    result = analyze_step_file(file_path)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to analyze geometry.")
    return {"status": "success", "data": result}

def generate_2d_projection(step_file, svg_path):
    """Generates a 2D SVG projection of the STEP file without XYZ axes."""
    try:
        part = cq.importers.importStep(step_file)
        os.makedirs(os.path.dirname(svg_path), exist_ok=True)

        exporters.export(
            part, svg_path, exporters.ExportTypes.SVG,
            opt={"showAxes": False}  # Removes XYZ axes
        )

        return svg_path
    except Exception as e:
        print(f"❌ Error generating SVG: {e}")
        return None
