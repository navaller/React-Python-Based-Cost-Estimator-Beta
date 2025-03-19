from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
from typing import Optional

# ✅ Define Router
router = APIRouter()

# ✅ Database Connection Function
def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Prevent DB lock issues
    return conn

# ✅ Pydantic Model for Material
class MaterialBase(BaseModel):
    name: str
    density: float
    density_unit: str

class MaterialCosting(BaseModel):
    material_id: int
    block_price: float
    block_price_unit: str  # ✅ Now fully flexible text field
    sheet_price: float
    sheet_price_unit: str  # ✅ Now fully flexible text field

class MaterialProperty(BaseModel):
    material_id: int
    property_name: str
    property_value: str
    property_unit: Optional[str] = None  # ✅ New column

# ✅ API: Fetch All Materials
@router.get("/")
def get_materials():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM materials;")
    materials = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return materials

# ✅ API: Add a New Material
@router.post("/")
def add_material(material: MaterialBase):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # ✅ Insert Material
        cursor.execute(
            "INSERT INTO materials (name, density, density_unit) VALUES (?, ?, ?)",
            (material.name, material.density, material.density_unit),
        )
        material_id = cursor.lastrowid

        # ✅ Insert Default Costing Entry (without forcing INR)
        cursor.execute(
            "INSERT INTO material_costing (material_id, block_price, block_price_unit, sheet_price, sheet_price_unit) VALUES (?, 0.0, '', 0.0, '')",
            (material_id,),
        )

        conn.commit()
        return {"message": f"Material '{material.name}' added successfully.", "material_id": material_id}

    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Material name must be unique.")

    finally:
        conn.close()

# ✅ API: Update Material
@router.put("/{material_id}")
def update_material(material_id: int, material: MaterialBase):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE materials SET name = ?, density = ?, density_unit = ? WHERE id = ?",
        (material.name, material.density, material.density_unit, material_id),
    )
    conn.commit()
    conn.close()
    return {"message": f"Material '{material.name}' updated successfully."}

# ✅ API: Delete Material (Cascade Deletes Properties & Costing)
@router.delete("/{material_id}")
def delete_material(material_id: int):
    """Delete a material and all related properties & costing."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM materials WHERE id = ?", (material_id,))
    material = cursor.fetchone()

    if not material:
        raise HTTPException(status_code=404, detail=f"Material with ID '{material_id}' not found.")

    try:
        cursor.execute("BEGIN")  # ✅ Start transaction

        cursor.execute("DELETE FROM material_properties WHERE material_id = ?", (material_id,))
        cursor.execute("DELETE FROM material_costing WHERE material_id = ?", (material_id,))
        cursor.execute("DELETE FROM materials WHERE id = ?", (material_id,))

        conn.commit()
        return {"message": f"Material '{material_id}' and all associated data deleted successfully."}

    except sqlite3.OperationalError as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        cursor.close()
        conn.close()

# ✅ API: Fetch Material Properties
@router.get("/{material_id}/properties")
def get_material_properties(material_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM material_properties WHERE material_id = ?", (material_id,))
    properties = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return properties

# ✅ API: Add Material Property (Supports property_unit)
@router.post("/properties")
def add_material_property(property: MaterialProperty):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO material_properties (material_id, property_name, property_value, property_unit) VALUES (?, ?, ?, ?)",
            (property.material_id, property.property_name, property.property_value, property.property_unit),
        )
        property_id = cursor.lastrowid  # ✅ Retrieve the last inserted ID
        conn.commit()
        conn.close()

        # ✅ Return the new property with its ID
        return {
            "id": property_id,  # ✅ Ensure ID is returned
            "material_id": property.material_id,
            "property_name": property.property_name,
            "property_value": property.property_value,
            "property_unit": property.property_unit,
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ✅ API: Update Material Property (Supports property_unit)
@router.put("/properties/{property_id}")
def update_material_property(property_id: int, property: MaterialProperty):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE material_properties SET property_name = ?, property_value = ?, property_unit = ? WHERE id = ?",
        (property.property_name, property.property_value, property.property_unit, property_id),
    )
    conn.commit()
    conn.close()
    return {"message": f"Property '{property.property_name}' updated successfully."}

# ✅ API: Delete Material Property
@router.delete("/properties/{property_id}")
def delete_material_property(property_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM material_properties WHERE id = ?", (property_id,))
    conn.commit()
    conn.close()
    return {"message": f"Property ID '{property_id}' deleted successfully."}

# ✅ API: Fetch Material Costing Details
@router.get("/{material_id}/costing")
def get_material_costing(material_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM material_costing WHERE material_id = ?", (material_id,))
    costing = cursor.fetchone()
    conn.close()
    return dict(costing) if costing else {}

# ✅ API: Update Material Costing (Supports Flexible Units)
@router.put("/{material_id}/costing")
def update_material_costing(material_id: int, costing: MaterialCosting):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE material_costing 
        SET block_price = ?, block_price_unit = ?, sheet_price = ?, sheet_price_unit = ? 
        WHERE material_id = ?
        """,
        (costing.block_price, costing.block_price_unit, costing.sheet_price, costing.sheet_price_unit, material_id),
    )
    conn.commit()
    conn.close()
    return {"message": f"Costing for Material ID '{material_id}' updated successfully."}
