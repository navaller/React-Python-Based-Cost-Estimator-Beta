# Manufacturing Cost Estimator (Backend)

This repository contains the backend for the **Manufacturing Cost Estimator**. It is built using **FastAPI** and **SQLite**.

---

## 🚀 Features

- **Unit Management** (Basic, Machining, Currency)
- **Costing Defaults** for cost estimation
- **Part Classification**
- **Project & Parts Management**
- **Database Initialization with Default Data**
- **RESTful APIs for Managing Data**

---

## 📂 Folder Structure

/backend/
│
├── database.db # ✅ SQLite database (auto-created)
├── create_db.py # ✅ Script to create & populate DB from JSONs
│
├── defaults/ # ✅ Folder for all default JSON files (schema data)
│ ├── units.json # ✅ Default units (basic, machining, currency)
│ ├── costing_defaults.json # ✅ Default costing categories
│ ├── advanced_settings.json # ✅ System-wide settings (currency, file paths)
│ ├── part_classification.json # ✅ Default part classifications
│ ├── materials.json # ✅ Default materials (if needed)
│ ├── operations.json # ✅ Default operations (if needed)
│ ├── operation_part_classification.json # ✅ Default operation-classification mappings
│ ├── projects.json # ⏳ Empty (for user-created projects)
│ ├── parts.json # ⏳ Empty (for user-uploaded parts)
│
├── modules/ # ✅ Folder for all API modules
│ ├── **init**.py # ✅ Init for module imports
│ ├── main.py # ✅ FastAPI entry point (imports from other modules)
│ ├── settings.py # ✅ Main settings API (excluding units & costing defaults)
│ ├── units_settings.py # ✅ API for unit-related operations
│ ├── costing_defaults_settings.py # ✅ API for costing defaults
│ ├── part_classification_settings.py # ✅ API for part classification
│ ├── materials_settings.py # ✅ API for materials (if needed)
│ ├── operations_settings.py # ✅ API for operations (if needed)
│ ├── operation_part_classification_settings.py # ✅ API for operation-classification mappings
│
├── migrations/ # (Optional) Future DB migration scripts
├── backups/ # (Optional) DB backup storage
│
├── .gitignore
├── README.md

📌 Explanation of the Folder Structure
Folder / File Purpose
database.db SQLite database file (auto-created)
create_db.py Script to create tables & populate DB from JSONs
defaults/ Stores all default JSON files for preloading DB data
modules/ Holds all API logic, separated into different .py files
migrations/ (Optional) Future DB migrations if structure changes
backups/ (Optional) Stores DB backups to prevent data loss

Summary of API Routes for Operations
Method Endpoint Description
GET /operations/ Retrieve all operations
GET /operations/{operation_id} Retrieve a specific operation
POST /operations/ Add a new operation
PUT /operations/{operation_id} Update an operation
DELETE /operations/{operation_id} Delete an operation
GET /operations/{operation_id}/classifications Get classifications for an operation
POST /operations/{operation_id}/classifications/{classification_id} Assign a classification to an operation
DELETE /operations/{operation_id}/classifications/{classification_id} Remove a classification from an operation
