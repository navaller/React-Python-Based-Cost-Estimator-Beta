# /modules/materials.py

from fastapi import APIRouter, HTTPException
import json
import os

router = APIRouter()
MATERIAL_FILE = "materials.json"

def load_materials():
    try:
        with open(MATERIAL_FILE, "r") as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_materials(materials):
    with open(MATERIAL_FILE, "w") as file:
        json.dump(materials, file, indent=4)

def get_material_data(name: str):
    """Fetches a specific material by name."""
    materials = load_materials()
    if name not in materials:
        raise HTTPException(status_code=404, detail="Material not found.")
    return materials[name]

@router.get("/")
def get_materials():
    """Fetch all materials with their properties (density, block_price, sheet_price)."""
    return load_materials()

@router.post("/")
def add_material(name: str, density: float, block_price: float = 0.0, sheet_price: float = 0.0):
    """Add or update a material with density and pricing."""
    materials = load_materials()
    materials[name] = {
        "density": density,
        "price": {"block_price": block_price, "sheet_price": sheet_price}
    }
    save_materials(materials)
    return {"message": f"Material {name} added/updated successfully.", "material": materials[name]}

@router.put("/")
def update_material(name: str, density: float = None, block_price: float = None, sheet_price: float = None):
    """Update material properties (density, block_price, sheet_price)."""
    materials = load_materials()
    if name not in materials:
        raise HTTPException(status_code=404, detail="Material not found.")
    if density is not None:
        materials[name]["density"] = density
    if block_price is not None:
        materials[name]["price"]["block_price"] = block_price
    if sheet_price is not None:
        materials[name]["price"]["sheet_price"] = sheet_price
    save_materials(materials)
    return {"message": f"Material {name} updated successfully.", "material": materials[name]}

@router.delete("/")
def delete_material(name: str):
    """Delete a material."""
    materials = load_materials()
    if name not in materials:
        raise HTTPException(status_code=404, detail="Material not found.")
    del materials[name]
    save_materials(materials)
    return {"message": f"Material {name} deleted successfully."}
