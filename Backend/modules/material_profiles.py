from fastapi import APIRouter, HTTPException
import sqlite3
import json
from pydantic import BaseModel
from typing import Optional, Dict

router = APIRouter()

def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn

class MaterialProfileBase(BaseModel):
    name: str
    fields_json: Dict[str, str]   # E.g., {"length": "mm", "width": "mm"}
    volume_formula: Optional[str] = None
    default_unit: str

# ✅ Fetch All Profiles
@router.get("/")
def get_profiles():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM material_profiles")
    rows = cursor.fetchall()
    conn.close()

    profiles = []
    for row in rows:
        profile = dict(row)
        # ✅ Parse the fields_json before returning
        try:
            profile["fields_json"] = json.loads(profile["fields_json"])
        except (TypeError, json.JSONDecodeError):
            profile["fields_json"] = {}  # fallback
        profiles.append(profile)

    return profiles


# ✅ Fetch a Specific Profile by ID
@router.get("/{profile_id}")
def get_profile(profile_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM material_profiles WHERE id = ?", (profile_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        profile = dict(row)
        try:
            profile["fields_json"] = json.loads(profile["fields_json"])
        except (TypeError, json.JSONDecodeError):
            profile["fields_json"] = {}
        return profile

    raise HTTPException(status_code=404, detail="Profile not found")

@router.post("/")
def create_profile(profile: MaterialProfileBase):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("BEGIN")  # ✅ Explicit transaction start

        cursor.execute("""
            INSERT INTO material_profiles (name, fields_json, volume_formula, default_unit)
            VALUES (?, ?, ?, ?)
        """, (
            profile.name,
            json.dumps(profile.fields_json),
            profile.volume_formula,
            profile.default_unit
        ))

        conn.commit()
        profile_id = cursor.lastrowid
        return { "message": "Profile created successfully", "id": profile_id }

    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Profile name must be unique.")

    except sqlite3.OperationalError as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        conn.close()


@router.put("/{profile_id}")
def update_profile(profile_id: int, profile: MaterialProfileBase):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("BEGIN")

        cursor.execute("SELECT id FROM material_profiles WHERE id = ?", (profile_id,))
        if not cursor.fetchone():
            conn.rollback()
            raise HTTPException(status_code=404, detail="Profile not found.")

        cursor.execute("""
            UPDATE material_profiles
            SET name = ?, fields_json = ?, volume_formula = ?, default_unit = ?
            WHERE id = ?
        """, (
            profile.name,
            json.dumps(profile.fields_json),
            profile.volume_formula,
            profile.default_unit,
            profile_id
        ))

        conn.commit()
        return { "message": f"Profile '{profile.name}' updated successfully." }

    except sqlite3.OperationalError as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finally:
        conn.close()



