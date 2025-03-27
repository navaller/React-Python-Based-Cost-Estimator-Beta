# Main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.cad_file_analysis import router as cad_file_router
from modules.geometric_analysis import router as geometric_router
from modules.cost_analysis import router as cost_router
from modules.materials import router as materials_router
from modules.settings import router as settings_router
from modules.projects import router as projects_router
from modules.parts import router as parts_router

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers to keep main.py clean
app.include_router(cad_file_router, prefix="/cad")
app.include_router(geometric_router, prefix="/geometry")
app.include_router(cost_router, prefix="/cost")
app.include_router(settings_router, prefix="/settings")
app.include_router(projects_router, prefix="/projects", tags=["Projects"])
app.include_router(parts_router, prefix="/parts", tags=["Parts"])


@app.get("/")
def read_root():
    return {"message": "CAD File Analysis API is running."}
