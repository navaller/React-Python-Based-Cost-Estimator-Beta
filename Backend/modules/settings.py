from fastapi import APIRouter, HTTPException
import json
import os

router = APIRouter()
SETTINGS_FILE = "settings.json"

def load_settings():
    """Load configuration from the settings file and ensure it matches the expected structure."""
    try:
        with open(SETTINGS_FILE, "r") as file:
            settings = json.load(file)
            return settings.get("settings", {})  # ✅ Ensure we return `settings["settings"]`
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_settings(settings):
    """Save settings to the settings file."""
    with open(SETTINGS_FILE, "w") as file:
        json.dump(settings, file, indent=4)

def get_settings():
    """Fetch global settings."""
    return load_settings()

# ✅ Load settings dynamically on startup
settings = get_settings()

# ✅ Fetch subcategories for clean access
units = settings.get("settings", {}).get("units", {})
operations = settings.get("settings", {}).get("operations", {})
part_classification = settings.get("settings", {}).get("part_classification", {})
advanced_settings = settings.get("settings", {}).get("advanced_settings", {})
costing_defaults = settings.get("settings", {}).get("costing_defaults", {})

# ✅ Extract folder paths dynamically
DATA_STORAGE_PATH = advanced_settings.get("DATA_STORAGE_PATH", "storage")
UPLOAD_FOLDER = advanced_settings.get("UPLOAD_FOLDER", "uploads")
PROJECTION_FOLDER = advanced_settings.get("PROJECTION_FOLDER", "projections")
THUMBNAIL_FOLDER = advanced_settings.get("THUMBNAIL_FOLDER", "thumbnails")

# ✅ Ensure required directories exist
for path in [DATA_STORAGE_PATH, UPLOAD_FOLDER, PROJECTION_FOLDER, THUMBNAIL_FOLDER]:
    os.makedirs(path, exist_ok=True)

@router.get("/")
def fetch_settings():
    """Fetch all settings via API."""
    return get_settings()

@router.put("/")
def update_settings(updates: dict):
    """Update settings via API."""
    settings = load_settings()
    
    # ✅ Ensure updates are within valid categories
    allowed_categories = ["units", "operations", "part_classification", "advanced_settings", "costing_defaults"]
    for key in updates.keys():
        if key not in allowed_categories:
            raise HTTPException(status_code=400, detail=f"⚠️ Invalid settings category '{key}'.")

    # ✅ Apply updates
    settings["settings"].update(updates)
    save_settings(settings)
    
    return {"message": "Settings updated successfully.", "settings": settings}

@router.get("/units")
def get_unit_preferences():
    """Fetch unit preferences dynamically from settings.json."""
    settings = get_settings()  # ✅ Always reload settings
    unit_prefs = settings.get("units", {})

    if not unit_prefs:
        raise HTTPException(status_code=500, detail="⚠️ 'units' not found in settings.json")

    return unit_prefs  # ✅ Return the full 'units' section


@router.get("/operations")
def get_operations():
    """Fetch available operations and their costing units."""
    settings = get_settings()  # ✅ Always reload settings
    operations = settings.get("operations", {})

    if not operations:
        raise HTTPException(status_code=500, detail="⚠️ 'operations' not found in settings.json")

    return operations  # ✅ Return the full 'operations' section


@router.get("/part_classification")
def get_part_classification():
    """Fetch part classification details."""
    settings = get_settings()  # ✅ Always reload settings
    part_classification = settings.get("part_classification", {})

    if not part_classification:
        raise HTTPException(status_code=500, detail="⚠️ 'part_classification' not found in settings.json")

    return part_classification  # ✅ Return the full 'part_classification' section


@router.get("/advanced_settings")
def get_advanced_settings():
    """Fetch advanced system settings like storage paths."""
    settings = get_settings()  # ✅ Always reload settings
    advanced_settings = settings.get("advanced_settings", {})

    if not advanced_settings:
        raise HTTPException(status_code=500, detail="⚠️ 'advanced_settings' not found in settings.json")

    return advanced_settings  # ✅ Return the full 'advanced_settings' section


@router.get("/costing_defaults")
def get_costing_defaults():
    """Fetch default costing structures."""
    settings = get_settings()  # ✅ Always reload settings
    costing_defaults = settings.get("costing_defaults", {})

    if not costing_defaults:
        raise HTTPException(status_code=500, detail="⚠️ 'costing_defaults' not found in settings.json")

    return costing_defaults  # ✅ Return the full 'costing_defaults' section

