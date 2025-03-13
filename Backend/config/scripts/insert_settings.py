import sqlite3
import json

# Database file path
DB_FILE = "database.db"
SETTINGS_FILE = "/config/defaults/default_settings.json"

# ✅ Connect to SQLite
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# ✅ Load Data from settings.json
with open(SETTINGS_FILE, "r") as file:
    settings = json.load(file)

# ✅ Insert Advanced Settings
for key, value in settings.get("advanced_settings", {}).items():
    cursor.execute("INSERT OR IGNORE INTO advanced_settings (setting, value) VALUES (?, ?);", 
                   (key, json.dumps(value) if isinstance(value, dict) else value))

# ✅ Insert Units
for category, units in settings.get("units", {}).items():
    for unit_type, details in units.items():
        cursor.execute("INSERT OR IGNORE INTO units (category, unit_type, unit_name, symbol) VALUES (?, ?, ?, ?);", 
                       (category, unit_type, details["default"], None))

# ✅ Insert Costing Defaults
for costing_type, details in settings.get("costing_defaults", {}).items():
    cursor.execute("INSERT OR IGNORE INTO costing_defaults (type, unit_type) VALUES (?, ?);", 
                   (costing_type, details["costing_unit"]))

# ✅ Insert Part Classification
for classification, details in settings.get("part_classification", {}).items():
    cursor.execute("INSERT OR IGNORE INTO part_classification (name, pricing_type) VALUES (?, ?);", 
                   (classification, details["pricing_type"]))

# ✅ Insert Operations
for category, ops in settings.get("operations", {}).items():
    for op_name, details in ops.items():
        cursor.execute("INSERT OR IGNORE INTO operations (category, name, enabled, costing_type, default_rate, universal) VALUES (?, ?, ?, ?, ?, ?);",
                       (category, op_name, details["enabled"], details["costing_unit"], details["default_rate"], False))

# ✅ Commit and Close Database
conn.commit()
conn.close()

print("✅ Settings data inserted successfully!")
