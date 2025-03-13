import sqlite3
import os

# Database file path
DB_FILE = "/database.db"

# ✅ Remove existing database to prevent conflicts
if os.path.exists(DB_FILE):
    os.remove(DB_FILE)

# ✅ Connect to SQLite
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# ✅ Create Tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS advanced_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    unit_type TEXT NOT NULL,
    unit_name TEXT UNIQUE NOT NULL,
    symbol TEXT
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS costing_defaults (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT UNIQUE NOT NULL,
    unit_type TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    costing_type TEXT NOT NULL,
    costing_unit_id INTEGER NOT NULL,
    default_rate REAL NOT NULL,
    universal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (costing_unit_id) REFERENCES units(id)
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS part_classification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    pricing_type TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS operation_part_classification (
    operation_id INTEGER NOT NULL,
    classification_id INTEGER NOT NULL,
    FOREIGN KEY (operation_id) REFERENCES operations(id),
    FOREIGN KEY (classification_id) REFERENCES part_classification(id),
    PRIMARY KEY (operation_id, classification_id)
);
""")

# ✅ Create New Tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    bounding_box_width REAL,
    bounding_box_depth REAL,
    bounding_box_height REAL,
    bounding_box_unit INTEGER,
    volume REAL,
    volume_unit INTEGER,
    surface_area REAL,
    surface_area_unit INTEGER,
    center_of_mass_x REAL,
    center_of_mass_y REAL,
    center_of_mass_z REAL,
    center_of_mass_unit INTEGER,
    faces INTEGER,
    edges INTEGER,
    components INTEGER,
    machining_time REAL,
    machining_time_unit INTEGER,
    projection TEXT,
    thumbnail TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    density REAL,
    density_unit INTEGER,
    block_price REAL,
    sheet_price REAL
);
""")

# ✅ Commit and Close Database
conn.commit()
conn.close()

print("✅ Database schema created successfully!")
