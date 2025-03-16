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

# ✅ Fetch user-selected target units from SQLite instead of JSON
def get_unit_preference(unit_type):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT unit_name FROM units WHERE unit_type = ? LIMIT 1;", (unit_type,))
    result = cursor.fetchone()
    conn.close()

    if not result:
        raise ValueError(f"⚠️ No unit preference set for {unit_type}!")
    
    return result["unit_name"]

# ✅ Enable or Disable Debug Mode
DEBUG_MODE = True  # Set to False to disable debug prints

def analyze_step_file(step_file):
    """Extracts geometric data from a STEP file and applies unit conversions dynamically."""
    try:
        if DEBUG_MODE:
            print(f"\n🔹 DEBUG: Starting analysis for STEP file: {step_file}")

        # ✅ Load STEP File
        part = cq.importers.importStep(step_file)
        bbox = part.val().BoundingBox()

        # ✅ Original values always come in SI units (mm, mm², mm³)
        raw_values = {
            "length": (bbox.xmax - bbox.xmin, "mm"),
            "depth": (bbox.ymax - bbox.ymin, "mm"),
            "height": (bbox.zmax - bbox.zmin, "mm"),
            "volume": (part.val().Volume(), "mm³"),
            "surface_area": (part.val().Area(), "mm²"),
            "center_of_mass_x": (part.val().Center().x, "mm"),
            "center_of_mass_y": (part.val().Center().y, "mm"),
            "center_of_mass_z": (part.val().Center().z, "mm"),
            "machining_time": (get_machining_time(step_file), "s")
        }

        if DEBUG_MODE:
            print(f"✅ DEBUG: Extracted raw values: {json.dumps(raw_values, indent=2)}")

        # ✅ Fetch user-selected target units from SQLite
        length_unit = get_unit_preference("length")
        volume_unit = get_unit_preference("volume")
        area_unit = get_unit_preference("area")
        time_unit = get_unit_preference("time")

        if DEBUG_MODE:
            print(f"✅ DEBUG: Fetched unit preferences - Length: {length_unit}, Volume: {volume_unit}, Area: {area_unit}, Time: {time_unit}")

        category_units = {
            "length": length_unit,
            "depth": length_unit,
            "height": length_unit,
            "center_of_mass_x": length_unit,  
            "center_of_mass_y": length_unit,  
            "center_of_mass_z": length_unit,  
            "volume": volume_unit,
            "surface_area": area_unit,
            "machining_time": time_unit,
        }

        converted_values = {}

        for key, (value, from_unit) in raw_values.items():
            category = "surface_area" if "surface_area" in key else (
                "length" if "center_of_mass" in key else (
                    "machining_time" if "machining_time" in key else key.split("_")[0]
                )
            )

            # ✅ Get the user-selected target unit
            to_unit = category_units.get(category)
            if to_unit is None:
                raise ValueError(f"⚠️ No unit preference set for '{category}' in database.")

            # ✅ Convert using correct `from_unit`
            converted_values[key] = convert_units(value, from_unit, to_unit)

        if DEBUG_MODE:
            print(f"✅ DEBUG: Converted values: {json.dumps(converted_values, indent=2)}")

        analysis_result = {
            "bounding_box": {
                "width": {"value": converted_values["length"], "unit": length_unit},
                "depth": {"value": converted_values["depth"], "unit": length_unit},
                "height": {"value": converted_values["height"], "unit": length_unit},
            },
            "volume": {"value": converted_values["volume"], "unit": volume_unit},
            "surface_area": {"value": converted_values["surface_area"], "unit": area_unit},
            "center_of_mass": {
                "x": {"value": converted_values["center_of_mass_x"], "unit": length_unit},
                "y": {"value": converted_values["center_of_mass_y"], "unit": length_unit},
                "z": {"value": converted_values["center_of_mass_z"], "unit": length_unit},
            },
            "faces": part.faces().size(),
            "edges": part.edges().size(),
            "components": len(part.objects),
            "machining_time": {"value": converted_values["machining_time"], "unit": time_unit},
        }

        if DEBUG_MODE:
            print(f"✅ DEBUG: Final Analysis Result: {json.dumps(analysis_result, indent=2)}")

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

def get_machining_time(step_file, feed_rate=10, spindle_speed=5000, tool_diameter=10, depth_of_cut=2):
    """
    Estimates machining time using proper formulas:

    1. Cutting Speed = (π x Tool Diameter x RPM) / 12
    2. Material Removal Rate (MRR) = Cutting Speed x Feed Rate x Depth of Cut
    3. Machining Time = Volume to Remove / MRR
    """
    try:
        part = cq.importers.importStep(step_file)
        volume_mm3 = part.val().Volume()  # Volume in mm³

        # ✅ Convert volume from mm³ to in³
        volume_in3 = convert_units(volume_mm3, "mm³", "in³")

        # ✅ Compute Cutting Speed (IPM)
        cutting_speed = (3.1416 * tool_diameter * spindle_speed) / 12  # in inches/min

        # ✅ Compute Material Removal Rate (MRR) in cubic inches/min
        MRR = cutting_speed * feed_rate * depth_of_cut  # in³/min

        if MRR == 0:
            return None  # Avoid division by zero

        # ✅ Compute Machining Time in minutes
        machining_time_min = volume_in3 / MRR  # Minutes

        # ✅ Convert to seconds (SI) for consistency
        machining_time_sec = convert_units(machining_time_min, "min", "s")

        return machining_time_sec  # ✅ Always return SI unit (seconds)
    except Exception as e:
        print(f"Error processing STEP file: {e}")
        return None

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
