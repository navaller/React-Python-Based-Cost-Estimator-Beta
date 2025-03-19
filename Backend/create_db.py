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

# Load JSON data from files
def load_json(file_name):
    file_path = os.path.join(DEFAULTS_DIR, file_name)  # Ensure it reads from defaults directory
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

# File paths (ensure files are read from 'defaults' directory)
json_files = {
    "operations_settings": "operations_settings.json",
    "part_classification": "part_classification.json",
    "costing_defaults": "costing_defaults.json",
    "advanced_settings": "advanced_settings.json",
    "materials": "materials.json",
    "units": "units.json",
}

# Read JSON data
data = {key: load_json(file) for key, file in json_files.items()}

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
    property_unit TEXT,
    UNIQUE (material_id, property_name),  -- ✅ Ensures unique properties per material
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
""")

# ✅ Create Material Costing Table (Stores Pricing Details)
cursor.execute("""
CREATE TABLE IF NOT EXISTS material_costing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL UNIQUE,  -- ✅ Ensures one costing entry per material
    block_price REAL NOT NULL DEFAULT 0.0,
    block_price_unit TEXT NOT NULL,
    sheet_price REAL NOT NULL DEFAULT 0.0,
    sheet_price_unit TEXT NOT NULL,
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
    
    # ✅ Load Units Data
    units_data = load_json_data("units.json")

    for category, unit_types in units_data.items():
        for unit_type, details in unit_types.items():
            default_unit = details.get("default", "")
            options = details.get("options", [])

            # ✅ Insert Unit Category & Unit Type (Avoid Duplicate Insertions)
            cursor.execute("""
                INSERT INTO units (category, unit_type, unit_name, symbol) 
                VALUES (?, ?, ?, ?) ON CONFLICT(unit_type) DO NOTHING;
            """, (category, unit_type, default_unit, json.dumps(options)))  # Store options as JSON string

    # ✅ Commit changes to save the inserted data
    conn.commit()
    print("✅ Units inserted successfully!")

    # ✅ Load Advanced Settings Data
    advanced_settings = load_json_data("advanced_settings.json")

    for key, value in advanced_settings.items():
        # If value is a dictionary (like "folders"), convert it to JSON string
        if isinstance(value, dict):
            value = json.dumps(value)

        # ✅ Insert Advanced Setting (Avoid duplicate insertions)
        cursor.execute("""
            INSERT INTO advanced_settings (setting, value) 
            VALUES (?, ?) ON CONFLICT(setting) DO UPDATE SET value = excluded.value;
        """, (key, str(value)))  # Convert all values to string for consistency

    # ✅ Commit changes to save the inserted data
    conn.commit()
    print("✅ Advanced settings inserted successfully!")


    # ✅ Load Costing Defaults Data
    costing_defaults = load_json_data("costing_defaults.json")

    for item in costing_defaults:
        if not all(k in item for k in ["type", "unit_type", "default_unit", "description"]):
            print(f"❌ Skipping invalid costing_defaults entry: {item}")
            continue  # Skip invalid entries

        # ✅ Insert Costing Default (Avoid duplicate insertions)
        cursor.execute("""
            INSERT INTO costing_defaults (type, unit_type, default_unit, description)
            VALUES (?, ?, ?, ?) ON CONFLICT(type) DO NOTHING;
        """, (item["type"], item["unit_type"], item["default_unit"], item["description"]))

    # ✅ Commit changes to save the inserted data
    conn.commit()
    print("✅ Costing defaults inserted successfully!")

    # ✅ Load Part Classifications Data
    part_classifications = load_json_data("part_classification.json")

    for item in part_classifications:
        if not all(k in item for k in ["name", "pricing_type"]):
            print(f"❌ Skipping invalid part_classification entry: {item}")
            continue  # Skip invalid entries

        # ✅ Insert Part Classification (Avoid duplicate insertions)
        cursor.execute("""
            INSERT INTO part_classification (name, pricing_type) 
            VALUES (?, ?) ON CONFLICT(name) DO NOTHING;
        """, (item["name"], item["pricing_type"]))

    # ✅ Commit changes to save the inserted data
    conn.commit()
    print("✅ Part classifications inserted successfully!")

   # ✅ Load Materials Data
    materials = load_json_data("materials.json")

    for item in materials:
        if not all(k in item for k in ["name", "density", "density_unit"]):
            print(f"❌ Skipping invalid materials entry: {item}")
            continue  # Skip if required fields are missing

        # ✅ Insert Material (Avoid duplicate insertions)
        cursor.execute("""
            INSERT INTO materials (name, density, density_unit) 
            VALUES (?, ?, ?) ON CONFLICT(name) DO NOTHING;
        """, (item["name"], item["density"], item["density_unit"]))

        # ✅ Retrieve material ID
        cursor.execute("SELECT id FROM materials WHERE name = ?", (item["name"],))
        material_id = cursor.fetchone()
        
        if not material_id:
            print(f"❌ Failed to retrieve material ID for {item['name']}")
            continue
        material_id = material_id[0]  # Extract the integer ID

        # ✅ Define costing (Ensure it is always available)
        costing = item.get("costing", {})  # Defaults to an empty dictionary if missing

        # ✅ Insert Material Costing (Handle Missing Values)
        cursor.execute("""
            INSERT INTO material_costing (material_id, block_price, block_price_unit, sheet_price, sheet_price_unit)
            VALUES (?, ?, ?, ?, ?) ON CONFLICT(material_id) DO NOTHING;
        """, (
            material_id,
            float(costing.get("block_price", 0.0)),  # Ensure default to 0.0
            costing.get("block_price_unit", ""),     # Default to empty string
            float(costing.get("sheet_price", 0.0)),  # Ensure default to 0.0
            costing.get("sheet_price_unit", "")      # Default to empty string
        ))

        # ✅ Insert Material Properties (Ensure Default Empty List)
        properties = item.get("properties", [])
        for prop in properties:
            if not all(k in prop for k in ["property_name", "property_value", "property_unit"]):
                print(f"❌ Skipping invalid property entry: {prop}")
                continue  # Skip invalid entries

            cursor.execute("""
                INSERT INTO material_properties (material_id, property_name, property_value, property_unit) 
                VALUES (?, ?, ?, ?) ON CONFLICT(material_id, property_name) DO NOTHING;
            """, (material_id, prop["property_name"], prop["property_value"], prop["property_unit"]))

    # ✅ Commit changes to save the inserted data
    conn.commit()
    print("✅ Materials, properties, and pricing inserted successfully!")

    # ✅ Load Operations Settings
    operations_data = load_json_data("operations_settings.json")

    for operation in operations_data:
        if not all(k in operation for k in ["category", "name", "enabled", "costing_default", "default_rate", "costing_unit", "universal", "classification"]):
            print(f"❌ Skipping invalid operation entry: {operation}")
            continue  # Skip invalid entries

        # ✅ Find Costing Default ID
        cursor.execute("SELECT id FROM costing_defaults WHERE type = ?", (operation["costing_default"],))
        costing_default_id = cursor.fetchone()
        
        if not costing_default_id:
            print(f"❌ Skipping operation {operation['name']} - Costing default '{operation['costing_default']}' not found")
            continue  # Skip if costing default does not exist
        costing_default_id = costing_default_id[0]  # Extract the ID

        # ✅ Insert Operation
        cursor.execute("""
            INSERT INTO operations (category, name, enabled, costing_default_id, default_rate, costing_unit, universal) 
            VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name) DO NOTHING;
        """, (
            operation["category"], 
            operation["name"], 
            operation["enabled"], 
            costing_default_id, 
            operation["default_rate"], 
            operation["costing_unit"], 
            operation["universal"]
        ))

        # ✅ Retrieve Operation ID
        cursor.execute("SELECT id FROM operations WHERE name = ?", (operation["name"],))
        operation_id = cursor.fetchone()
        
        if not operation_id:
            print(f"❌ Failed to retrieve operation ID for {operation['name']}")
            continue  # Skip if operation ID is not found
        operation_id = operation_id[0]  # Extract the integer ID

        # ✅ Assign Classifications
        classifications = operation["classification"]

        if "all" in classifications:
            # ✅ Assign ALL classifications to this operation
            cursor.execute("SELECT id FROM part_classification")
            all_classifications = cursor.fetchall()

            for classification in all_classifications:
                classification_id = classification[0]
                cursor.execute("""
                    INSERT INTO operation_part_classification (operation_id, classification_id)
                    VALUES (?, ?) ON CONFLICT(operation_id, classification_id) DO NOTHING;
                """, (operation_id, classification_id))

        else:
            # ✅ Assign Specific Classifications
            for classification_name in classifications:
                cursor.execute("SELECT id FROM part_classification WHERE name = ?", (classification_name,))
                classification_id = cursor.fetchone()

                if not classification_id:
                    print(f"❌ Skipping classification '{classification_name}' for operation '{operation['name']}' - Not found")
                    continue  # Skip if classification does not exist
                classification_id = classification_id[0]

                cursor.execute("""
                    INSERT INTO operation_part_classification (operation_id, classification_id)
                    VALUES (?, ?) ON CONFLICT(operation_id, classification_id) DO NOTHING;
                """, (operation_id, classification_id))

    # ✅ Commit Changes
    conn.commit()
    print("✅ Operations and classifications inserted successfully!")


    # ✅ Commit Changes
    conn.commit()
    print("✅ Default data inserted successfully!")

# ✅ Insert all defaults
insert_defaults()

# ✅ Close Database Connection
conn.close()
print("✅ Database schema created and populated successfully!")