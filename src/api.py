from fastapi import FastAPI, HTTPException, Body, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import database as db
import uvicorn
from contextlib import asynccontextmanager
import os
from urllib.parse import urlparse
import asyncio
import time
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to DB on startup
    connected = False
    while not connected:
        try:
            print("🔄 [DB] Attempting to connect to database...")
            result = db.connect_db()
            if result.get("success"):
                connected = True
                print("✅ [DB] Connected to database successfully.")
            else:
                print(f"❌ [DB] Connection failed: {result.get('message')}. Retrying in 5 seconds...")
                await asyncio.sleep(5)
        except Exception as e:
            print(f"⚠️ [DB] Connection error: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)
    yield
    # Cleanup (if needed)
    
app = FastAPI(title="Ear Biometric DB API", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

router = APIRouter(prefix="/api")

# --- Pydantic Models ---

class LoginRequest(BaseModel):
    username: str
    password: str

class ChildData(BaseModel):
    hn: str
    firstname: str
    lastname: str
    age_text: str
    dob: str
    sex: str
    nationality: str
    address: Optional[str] = None
    born_detail: Optional[str] = None
    born_weight: Optional[str] = None
    weight_now: Optional[str] = None
    height_length: Optional[str] = None
    integrity: Optional[str] = None
    data: Optional[str] = None

class UpdateChildRequest(BaseModel):
    data: dict
    op_number: str

class VectorInsertRequest(BaseModel):
    hn: str
    v1: List[float]
    v2: List[float]
    v3: List[float]
    path: str
    op_number: str

class SearchRequest(BaseModel):
    hn: Optional[str] = ""
    firstname: Optional[str] = ""
    lastname: Optional[str] = ""

class IdentifyRequest(BaseModel):
    vector: List[float]
    op_number: str

# --- Endpoints ---

@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.get("/connect")
def connect_db_endpoint():
    return db.connect_db()

@router.post("/auth/login")
def login(req: LoginRequest):
    result = db.login_operator(req.username, req.password)
    if not result.get("success"):
        raise HTTPException(status_code=401, detail=result.get("message", "Invalid credentials"))
    return result

@router.get("/children/active")
def get_active_children():
    return db.get_all_active_children()

@router.post("/search/multi")
def search_multi(req: SearchRequest):
    return db.search_multi_criteria(req.hn, req.firstname, req.lastname)

@router.get("/search/hn/{hn}")
def search_hn(hn: str):
    return db.search_by_hn(hn)

@router.get("/search/firstname/{firstname}")
def search_firstname(firstname: str):
    return db.search_by_firstname(firstname)

@router.get("/search/lastname/{lastname}")
def search_lastname(lastname: str):
    return db.search_by_lastname(lastname)

@router.post("/children/insert")
def insert_child(data: dict, op_number: str):
    # data expects the fields defined in insert_child
    return db.insert_child(data, op_number)

@router.post("/parents/insert")
def insert_parent(data: dict, op_number: str):
    return db.insert_parent(data, op_number)

@router.post("/children/vectors")
def insert_child_vectors(req: VectorInsertRequest):
    return db.insert_child_vectors(req.hn, req.v1, req.v2, req.v3, req.path, req.op_number)

@router.post("/parents/vectors")
def insert_parent_vectors(req: VectorInsertRequest):
    return db.insert_parent_vectors(req.hn, req.v1, req.v2, req.v3, req.path, req.op_number)

@router.post("/identify/child")
def identify_child(req: IdentifyRequest):
    result = db.find_closest_child(req.vector, req.op_number)
    return result

@router.post("/identify/parent")
def identify_parent(req: IdentifyRequest):
    result = db.find_closest_parent(req.vector, req.op_number)
    return result

@router.put("/children/{hn}")
def update_child(hn: str, req: UpdateChildRequest):
    return db.update_child(hn, req.data, req.op_number)

@router.put("/parents/{hn}")
def update_parent(hn: str, req: UpdateChildRequest):
    return db.update_parent(hn, req.data, req.op_number)

@router.get("/children/hn/{hn}")
def get_child(hn: str):
    return db.get_child_by_hn(hn)

@router.get("/parents/hn/{hn}")
def get_parent(hn: str):
    return db.get_parent_by_hn(hn)

@router.get("/vectors/check/child/{hn}")
def check_child_vector(hn: str):
    return {"exists": db.check_child_vector_exists(hn)}

@router.get("/vectors/check/parent/{hn}")
def check_parent_vector(hn: str):
    return {"exists": db.check_parent_vector_exists(hn)}

@router.get("/logs")
def get_logs(ordering: str = "DESC"):
    return db.get_activity_logs(ordering)

@router.post("/link/parent-child")
def link_parent_child(parent_hn: str, child_hn: str):
    return db.link_parent_child(parent_hn, child_hn)

@router.delete("/link/parent-child")
def unlink_parent_child(parent_hn: str, child_hn: str, op_number: str):
    return db.unlink_parent_child(parent_hn, child_hn, op_number)

@router.post("/deactivate/child/{hn}")
def deactivate_child(hn: str, op_number: str):
    return db.deactivate_child(hn, op_number)

@router.post("/deactivate/parent/{hn}")
def deactivate_parent(hn: str, op_number: str):
    return db.deactivate_parent(hn, op_number)

app.include_router(router)

if __name__ == "__main__":
    url = os.getenv("VITE_PYTHON_DATABASE_API_URL", "http://localhost:8000")
    parsed_url = urlparse(url)
    uvicorn.run(app, host=parsed_url.hostname, port=parsed_url.port)
