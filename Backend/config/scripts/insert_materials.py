import sqlite3
import json

# Database file path
DB_FILE = "/database.db"
MATERIALS_FILE = "/config/defaults/default_materials.json"

# ✅ Connect to SQLite
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# ✅ Load Data from materials.json
with open(MATERIALS_FILE, "r") as file:
    materials_data = json.load(file)

# ✅ Insert Materials
for material_name, material_details in materials_data.items():
    cursor.execute("INSERT OR IGNORE INTO materials (name, density, density_unit, block_price, sheet_price) VALUES (?, ?, ?, ?, ?);",
                   (material_name, material_details["density"], 3,  # Assuming `3` is g/cm³ in `units`
                    material_details["price"]["block_price"], material_details["price"]["sheet_price"]))

# ✅ Commit and Close Database
conn.commit()
conn.close()

print("✅ Materials data inserted successfully!")
