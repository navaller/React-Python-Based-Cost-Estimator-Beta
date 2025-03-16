import sqlite3
from fastapi import APIRouter, HTTPException

# ✅ Define the router for costing defaults
router = APIRouter()

# ✅ Database file path
DB_FILE = "database.db"

# ✅ Function to connect to the database with lock prevention
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")  # ✅ Prevent DB lock issues
    return conn

# ✅ API: Fetch all costing defaults
@router.get("/")
def get_costing_defaults():
    """Fetch all costing defaults from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM costing_defaults;")
    costing_defaults = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return costing_defaults
