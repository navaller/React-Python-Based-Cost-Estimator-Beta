# /modules/cost_analysis.py

from fastapi import APIRouter, HTTPException
from modules.geometric_analysis import analyze_step_file
from modules.materials import get_material_data
from modules.settings import get_part_classification

router = APIRouter()

def calculate_raw_material_size(step_file, extra_x=10.0, extra_y=10.0, extra_z=10.0):
    """Computes the required raw material size based on bounding box dimensions."""
    analysis = analyze_step_file(step_file)
    if not analysis:
        return None
    bbox = analysis["bounding_box"]
    return {
        "raw_x": bbox["width"] + extra_x,
        "raw_y": bbox["depth"] + extra_y,
        "raw_z": bbox["height"] + extra_z,
    }

def calculate_material_cost(step_file, material, classification, extra_x=10.0, extra_y=10.0, extra_z=10.0):
    """Computes material cost based on raw material size and classification."""
    raw_material_size = calculate_raw_material_size(step_file, extra_x, extra_y, extra_z)
    if not raw_material_size:
        return None
    material_data = get_material_data(material)
    classification_data = get_part_classification(classification)
    if not material_data or not classification_data:
        return None
    pricing_type = classification_data["pricing_type"]
    price_per_volume = material_data["price"][pricing_type]
    raw_volume = raw_material_size["raw_x"] * raw_material_size["raw_y"] * raw_material_size["raw_z"]
    raw_weight_kg = (raw_volume / 1e6) * material_data["density"]
    total_cost = (raw_volume / 1e6) * price_per_volume
    return {
        "raw_material_size": raw_material_size,
        "raw_weight_kg": raw_weight_kg,
        "cost": total_cost,
    }

@router.get("/calculate_cost/")
def get_material_cost(file_name: str, material: str, classification: str):
    """API endpoint to calculate material cost for a given CAD file."""
    file_path = f"uploads/{file_name}"
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found.")
    cost_data = calculate_material_cost(file_path, material, classification)
    if not cost_data:
        raise HTTPException(status_code=400, detail="Material cost calculation failed.")
    return {"status": "success", "cost_data": cost_data}
