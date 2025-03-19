import json
import sqlite3

# ✅ Load JSON File
with open("defaults/operations_settings.json", "r") as file:
    operations_data = json.load(file)

# ✅ Connect to SQLite Database
conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# ✅ Fetch costing defaults mapping
cursor.execute("SELECT id, type FROM costing_defaults")
costing_defaults_map = {row[1]: row[0] for row in cursor.fetchall()}

# ✅ Insert Operations
for category, operations in operations_data.items():
    for name, details in operations.items():
        costing_default_id = costing_defaults_map.get(details["costing_default"])

        if not costing_default_id:
            print(f"Skipping {name} - costing_default not found.")
            continue  # Avoid inserting if costing default is missing

        cursor.execute("""
            INSERT INTO operations (category, name, enabled, costing_default_id, default_rate, costing_unit_id, universal)
            VALUES (?, ?, ?, ?, ?, (SELECT id FROM units WHERE symbol = ?), ?)
        """, (
            category,
            name,
            details["enabled"],
            costing_default_id,
            details["default_rate"],
            details["default_unit"],
            False  # Universal flag set to False by default
        ))

conn.commit()
conn.close()
print("✅ Operations successfully loaded into the database.")
