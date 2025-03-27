import sqlite3
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from .units_settings import router as units_router  # ✅ Import units module
from .costing_defaults_settings import router as costing_defaults_router  # ✅ Import costing defaults module
from .advanced_settings import router as advanced_settings_router  # ✅ Import advanced settings module
from .part_classification import router as part_classification_router  # ✅ Import part classification module
from .operation_settings import router as operations_setting__router  # ✅ Import part classification module
from .materials import router as materials_router  # ✅ Import part classification module
from .material_profiles import router as material_profiles_router 

# ✅ Define the main settings router
router = APIRouter()

# ✅ Include routers
router.include_router(units_router, prefix="/units", tags=["Units"])
router.include_router(costing_defaults_router, prefix="/costing_defaults", tags=["Costing Defaults"])
router.include_router(advanced_settings_router, prefix="/advanced_settings", tags=["Advanced Settings"])
router.include_router(part_classification_router, prefix="/part_classification", tags=["Part Classification"])
router.include_router(operations_setting__router, prefix="/operations_settings", tags=["Operations Settings"])
router.include_router(materials_router, prefix="/materials", tags=["Materials"])
router.include_router(material_profiles_router, prefix="/profiles", tags=["Material Profiles"])

# ✅ Database file path
DB_FILE = "database.db"

# ✅ Function to connect to the database with lock prevention
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Prevent DB lock issues
    return conn
