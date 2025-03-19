import sqlite3
import os
import json

# ✅ Database file path
DB_FILE = "database.db"
DEFAULTS_DIR = "defaults"  # ✅ Directory containing JSON default data

# ✅ Remove existing database to prevent conflicts (Optional)
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
    unit_type TEXT NOT NULL UNIQUE,
    unit_name TEXT NOT NULL,
    symbol TEXT
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS costing_defaults (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT UNIQUE NOT NULL,  -- ✅ The costing method (e.g., "time_based", "per_unit")
    unit_type TEXT NOT NULL,    -- ✅ The unit type associated (e.g., "/length")
    default_unit TEXT NOT NULL, -- ✅ The default unit for this costing method
    description TEXT NOT NULL   -- ✅ User-friendly description for UI/UX
);
""")

cursor.execute("""
CREATE TABLE operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    costing_default_id INTEGER NOT NULL,  -- ✅ Still references costing_defaults
    costing_unit TEXT NOT NULL,  -- ✅ Now stores unit as text, not foreign key
    default_rate REAL NOT NULL,
    universal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (costing_default_id) REFERENCES costing_defaults(id) ON DELETE CASCADE
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
CREATE TABLE operation_part_classification (
    operation_id INTEGER NOT NULL,
    classification_id INTEGER NOT NULL,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
    FOREIGN KEY (classification_id) REFERENCES part_classification(id) ON DELETE CASCADE,
    PRIMARY KEY (operation_id, classification_id)
);
""")

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

# ✅ Create Materials Table (Holds Base Material Data)
cursor.execute("""
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    density REAL NOT NULL,
    density_unit TEXT NOT NULL
);
""")

# ✅ Create Material Properties Table (Stores Dynamic Properties)
cursor.execute("""
CREATE TABLE IF NOT EXISTS material_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    property_name TEXT NOT NULL,
    property_value TEXT NOT NULL,
    property_unit TEXT,  -- ✅ New column for unit
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
""")

# ✅ Create Material Costing Table (Stores Pricing Details)
cursor.execute("""
CREATE TABLE IF NOT EXISTS material_costing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    block_price REAL NOT NULL DEFAULT 0.0,
    block_price_unit TEXT NOT NULL,  -- ✅ Updated to text column (no default INR)
    sheet_price REAL NOT NULL DEFAULT 0.0,
    sheet_price_unit TEXT NOT NULL,  -- ✅ Updated to text column (no default INR)
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
""")

# ✅ Function to Load JSON Data
def load_json_data(filename):
    try:
        with open(f"defaults/{filename}", "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"❌ Error loading {filename}: {e}")
        return []  # Return empty list if file is missing or invalid

# ✅ Load Default Data
def insert_defaults():
    """Inserts default data from JSON files into the database."""
    
    # 🔹 Load Units
    units_data = load_json_data("units.json")
    for category, unit_types in units_data.items():
        for unit_type, details in unit_types.items():
            cursor.execute("""
                INSERT INTO units (category, unit_type, unit_name, symbol) 
                VALUES (?, ?, ?, ?) ON CONFLICT(unit_type) DO NOTHING;
            """, (category, unit_type, details["default"], json.dumps(details["options"])))
    
   # 🔹 Load Costing Defaults
    costing_defaults = load_json_data("costing_defaults.json")
    for item in costing_defaults:
        if "type" not in item or "unit_type" not in item or "default_unit" not in item or "description" not in item:
            print(f"❌ Skipping invalid costing_defaults entry: {item}")
            continue  # Skip invalid entries

        cursor.execute("""
            INSERT INTO costing_defaults (type, unit_type, default_unit, description)
            VALUES (?, ?, ?, ?) ON CONFLICT(type) DO NOTHING;
        """, (item["type"], item["unit_type"], item["default_unit"], item["description"]))

        # 🔹 Load Advanced Settings
        advanced_settings = load_json_data("advanced_settings.json")
        for setting, value in advanced_settings.items():
            if setting is None or value is None:
                print(f"❌ Skipping invalid advanced_setting entry: {setting} -> {value}")
                continue

            # ✅ Ensure values are stored as strings
            cursor.execute("""
                INSERT INTO advanced_settings (setting, value) 
                VALUES (?, ?) ON CONFLICT(setting) DO NOTHING;
            """, (str(setting), str(value)))


    # 🔹 Load Part Classifications
    part_classifications = load_json_data("part_classification.json")
    for item in part_classifications:
        if "name" not in item or "pricing_type" not in item:
            print(f"❌ Skipping invalid part_classification entry: {item}")
            continue
        cursor.execute("""
            INSERT INTO part_classification (name, pricing_type) 
            VALUES (?, ?) ON CONFLICT(name) DO NOTHING;
        """, (item["name"], item["pricing_type"]))

    # # 🔹 Load Materials
    # materials = load_json_data("materials.json")
    # for item in materials:
    #     if not all(k in item for k in ["name", "density", "density_unit", "block_price", "sheet_price"]):
    #         print(f"❌ Skipping invalid materials entry: {item}")
    #         continue
    #     cursor.execute("""
    #         INSERT INTO materials (name, density, density_unit, block_price, sheet_price) 
    #         VALUES (?, ?, ?, ?, ?) ON CONFLICT(name) DO NOTHING;
    #     """, (item["name"], item["density"], item["density_unit"], item["block_price"], item["sheet_price"]))

    # ✅ Commit Changes
    conn.commit()
    print("✅ Default data inserted successfully!")

# ✅ Insert all defaults
insert_defaults()

# ✅ Close Database Connection
conn.close()
print("✅ Database schema created and populated successfully!")