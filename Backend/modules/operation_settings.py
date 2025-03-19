from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import sqlite3
from typing import List, Dict

# ✅ Define Router
router = APIRouter()

# ✅ Database Connection Function (Handles Locks)
def get_db_connection():
    conn = sqlite3.connect("database.db", timeout=10)  # ✅ Prevent database lock
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")  # ✅ Enforce foreign key constraints
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Increase timeout to prevent lock issues
    return conn

# ✅ Pydantic Models
class OperationBase(BaseModel):
    category: str
    name: str
    enabled: bool
    costing_default_id: int  # Now correctly mapped to costing_defaults.id
    default_rate: float
    costing_unit: str  # ✅ This should be a string now, NOT an ID
    universal: bool = False

# ✅ Fetch All Operations
@router.get("/")
def get_operations():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT o.id, o.category, o.name, 
                       CASE o.enabled WHEN 1 THEN true ELSE false END as enabled,
                       c.type as costing_default, c.unit_type as costing_unit_type, 
                       o.costing_default_id, o.default_rate, 
                       o.costing_unit, -- ✅ Now storing text value
                       CASE o.universal WHEN 1 THEN true ELSE false END as universal
                FROM operations o
                JOIN costing_defaults c ON o.costing_default_id = c.id;
            """)
            operations = [dict(row) for row in cursor.fetchall()]
        return operations

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



# ✅ Fetch Single Operation
@router.get("/{operation_id}")
def get_operation(operation_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT o.id, o.category, o.name, 
                       CASE o.enabled WHEN 1 THEN true ELSE false END as enabled,
                       CASE o.universal WHEN 1 THEN true ELSE false END as universal,
                       c.type AS costing_default, c.unit_type as costing_unit_type,
                       o.costing_default_id, o.default_rate, 
                       o.costing_unit -- ✅ Now storing text value
                FROM operations o
                JOIN costing_defaults c ON o.costing_default_id = c.id
                WHERE o.id = ?;
            """, (operation_id,))
            operation = cursor.fetchone()

        if operation is None:
            raise HTTPException(status_code=404, detail="Operation not found.")

        return dict(operation)

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ✅ Create a New Operation
@router.post("/")
def create_operation(operation: OperationBase):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO operations (category, name, enabled, costing_default_id, 
                                        default_rate, costing_unit, universal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (operation.category, operation.name, operation.enabled,
                  operation.costing_default_id, operation.default_rate, 
                  operation.costing_unit, operation.universal))

            conn.commit()
            operation_id = cursor.lastrowid
        return {"message": "Operation added successfully", "operation_id": operation_id}

    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Operation name must be unique.")


# ✅ Update an Operation
@router.put("/{operation_id}")
def update_operation(operation_id: int, operation: OperationBase):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE operations
                SET category = ?, name = ?, enabled = ?, costing_default_id = ?, 
                    default_rate = ?, costing_unit = ?, universal = ?
                WHERE id = ?
            """, (operation.category, operation.name, operation.enabled,
                  operation.costing_default_id, operation.default_rate, 
                  operation.costing_unit, operation.universal, operation_id))

            conn.commit()
        return {"message": "Operation updated successfully"}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ✅ Delete an Operation
@router.delete("/{operation_id}")
def delete_operation(operation_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # ✅ Check if operation exists
            cursor.execute("SELECT id FROM operations WHERE id = ?", (operation_id,))
            operation = cursor.fetchone()
            if not operation:
                raise HTTPException(status_code=404, detail="Operation not found.")

            # ✅ Delete related classifications
            cursor.execute("DELETE FROM operation_part_classification WHERE operation_id = ?", (operation_id,))
            
            # ✅ Delete the operation itself
            cursor.execute("DELETE FROM operations WHERE id = ?", (operation_id,))

            conn.commit()
        return {"message": "Operation deleted successfully"}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ✅ Get Allowed Part Classifications for an Operation
@router.get("/{operation_id}/classifications")
def get_operation_classifications(operation_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.id, p.name
                FROM part_classification p
                JOIN operation_part_classification opc ON p.id = opc.classification_id
                WHERE opc.operation_id = ?;
            """, (operation_id,))
            
            classifications = [dict(row) for row in cursor.fetchall()]
        return classifications

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ✅ Add Classification to an Operation
@router.post("/{operation_id}/classifications/{classification_id}")
def add_classification_to_operation(operation_id: int, classification_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO operation_part_classification (operation_id, classification_id)
                VALUES (?, ?)
            """, (operation_id, classification_id))

            conn.commit()
        return {"message": "Classification added successfully"}

    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Classification already assigned to operation.")


# ✅ Remove Classification from an Operation
@router.delete("/{operation_id}/classifications/{classification_id}")
def remove_classification_from_operation(operation_id: int, classification_id: int):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM operation_part_classification
                WHERE operation_id = ? AND classification_id = ?
            """, (operation_id, classification_id))

            conn.commit()
        return {"message": "Classification removed from operation successfully"}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ✅ Define a request model for bulk classification updates
class ClassificationRequest(BaseModel):
    classifications: List[int]  # Expecting list of classification IDs

@router.post("/{operation_id}/classifications")  
def bulk_add_classifications_to_operation(
    operation_id: int,
    request_body: ClassificationRequest  # ✅ JSON payload
):
    classification_ids = request_body.classifications  # ✅ Extract the list from JSON

    if not classification_ids:
        raise HTTPException(status_code=400, detail="No classification IDs provided.")

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(
                """
                INSERT INTO operation_part_classification (operation_id, classification_id)
                VALUES (?, ?)
                """,
                [(operation_id, classification_id) for classification_id in classification_ids]
            )

            conn.commit()
        return {"message": "Classifications added successfully"}

    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Some classifications are already assigned to the operation.")

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ✅ Define a request model for updating classifications
class ClassificationUpdateRequest(BaseModel):
    classifications: List[int]  # Expecting list of classification IDs

@router.put("/{operation_id}/classifications")
def update_classifications_for_operation(
    operation_id: int,
    request_body: ClassificationUpdateRequest  # ✅ JSON payload
):
    classification_ids = request_body.classifications  # ✅ Extract classification list

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # ✅ First, remove existing classifications for this operation
            cursor.execute(
                "DELETE FROM operation_part_classification WHERE operation_id = ?",
                (operation_id,)
            )
            
            # ✅ Then, insert the new classifications
            if classification_ids:
                cursor.executemany(
                    """
                    INSERT INTO operation_part_classification (operation_id, classification_id)
                    VALUES (?, ?)
                    """,
                    [(operation_id, classification_id) for classification_id in classification_ids]
                )

            conn.commit()

        return {"message": "Classifications updated successfully"}

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
