import sqlite3
import json

DB_FILE = "database.db"

# ✅ Standard unit options
unit_options = [
    ("basic_units", "length", "mm", "mm, cm, m, in, ft, yd"),
    ("basic_units", "area", "mm²", "mm², cm², m², in², ft²"),
    ("basic_units", "volume", "mm³", "mm³, cm³, m³, in³, ft³"),
    ("basic_units", "weight", "g", "g, kg, lb, oz"),
    ("basic_units", "time", "s", "s, min, hr"),
]

# ✅ Function to insert unit options into the database
def insert_unit_options():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    for category, unit_type, default_unit, options in unit_options:
        options_json = json.dumps(options.split(", "))  # Convert to JSON list format

        # ✅ Insert or update if exists
        cursor.execute("""
            INSERT INTO units (category, unit_type, unit_name, symbol)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(unit_name) DO UPDATE SET category=?, unit_type=?, unit_name=?, symbol=?;
        """, (category, unit_type, default_unit, options_json, category, unit_type, default_unit, options_json))

    conn.commit()
    conn.close()
    print("✅ Units populated successfully!")

# ✅ Run script
if __name__ == "__main__":
    insert_unit_options()
