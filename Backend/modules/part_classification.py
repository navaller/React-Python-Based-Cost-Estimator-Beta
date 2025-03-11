from fastapi import APIRouter, HTTPException
import json
import os

router = APIRouter()
CLASSIFICATION_FILE = "part_classification.json"

def load_classifications():
    try:
        with open(CLASSIFICATION_FILE, "r") as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_classifications(classifications):
    with open(CLASSIFICATION_FILE, "w") as file:
        json.dump(classifications, file, indent=4)

def get_classification_data(name: str):
    """Fetches a specific part classification by name."""
    classifications = load_classifications()
    if name not in classifications:
        raise HTTPException(status_code=404, detail="Classification not found.")
    return classifications[name]

@router.get("/")
def get_classifications():
    """Fetch all part classifications."""
    return load_classifications()

@router.post("/")
def add_classification(name: str, pricing_type: str):
    """Add or update a part classification."""
    classifications = load_classifications()
    classifications[name] = {"pricing_type": pricing_type}
    save_classifications(classifications)
    return {"message": f"Classification {name} added/updated successfully.", "classification": classifications[name]}

@router.delete("/")
def delete_classification(name: str):
    """Delete a part classification."""
    classifications = load_classifications()
    if name not in classifications:
        raise HTTPException(status_code=404, detail="Classification not found.")
    del classifications[name]
    save_classifications(classifications)
    return {"message": f"Classification {name} deleted successfully."}
