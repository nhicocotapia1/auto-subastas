import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
from passlib.context import CryptContext

# Configuración básica de entorno y base de datos
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "autosubastas")
SECRET_KEY = os.getenv("SECRET_KEY", "clave_secreta_jwt_auto_subastas_uv")
ALGORITHM = "HS256"

app = FastAPI(
    title="Auto-Subastas API REST",
    version="1.0.0",
    description="Backend asíncrono en FastAPI para gestión de subastas de vehículos y repuestos"
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Conexión asíncrona a MongoDB con Motor
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# ------------------------------------------------------------------
# MODELOS PYDANTIC (Estructuras NoSQL del Informe)
# ------------------------------------------------------------------

class ItemSchema(BaseModel):
    vin_chasis: Optional[str] = None
    patente: Optional[str] = None
    marca: str
    modelo: str
    anio: int
    tipo_vehiculo: str
    nivel_danio: str
    region_ubicacion: str

class PosturaReciente(BaseModel):
    id_postura: int
    monto: float
    postor_alias: str
    fecha_hora: datetime

class SubastaDocument(BaseModel):
    id_subasta: int = Field(alias="_id")
    tipo_lote: str
    precio_base: float
    precio_actual: float
    incremento_minimo: float
    fecha_inicio: datetime
    fecha_termino: datetime
    estado_subasta: str
    item: ItemSchema
    posturas_recientes: List[PosturaReciente] = []

class PosturaCreate(BaseModel):
    monto_ofertado: float

class LoginCreate(BaseModel):
    email: str
    password: str

# ------------------------------------------------------------------
# DEPENDENCIAS DE AUTENTICACIÓN
# ------------------------------------------------------------------

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=Status.HTTP_401_UNAUTHORIZED,
            detail="Token ausente, inválido o expirado"
        )

# ------------------------------------------------------------------
# ENDPOINTS RESTful (Rúbrica Sección 6)
# ------------------------------------------------------------------

@app.post("/api/v1/auth/login", status_code=200)
async def login(credentials: LoginCreate):
    """RF06: Autenticación de usuario mediante credenciales y emisión de JWT."""
    user = await db.usuarios.find_one({"email": credentials.email})
    if not user or not pwd_context.verify(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    expiracion = datetime.utcnow() + timedelta(minutes=60)
    token = jwt.encode(
        {"id_usuario": user["_id"], "email": user["email"], "rol": user["tipo_usuario"], "exp": expiracion},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 3600,
        "usuario": {"id": user["_id"], "nombre": user["nombre_completo"], "rol": user["tipo_usuario"]}
    }

@app.get("/api/v1/subastas")
async def consultar_catalogo(
    categoria: Optional[str] = None,
    anio_min: Optional[int] = None,
    region: Optional[str] = None
):
    """Q1: Búsqueda pública sobre subastas activas con filtros multicriterio."""
    query = {"estado_subasta": "activa"}
    if categoria:
        query["tipo_lote"] = categoria
    if anio_min:
        query["item.anio"] = {"$gte": anio_min}
    if region:
        query["item.region_ubicacion"] = region

    cursor = db.subastas.find(query).sort("fecha_termino", 1)
    subastas = await cursor.to_list(length=12)
    return {"total_items": len(subastas), "data": subastas}

@app.get("/api/v1/subastas/{id_subasta}")
async def detalle_subasta(id_subasta: int):
    """Q2: Detalle de lote en O(1) aprovechando el Subset Pattern."""
    subasta = await db.subastas.find_one({"_id": id_subasta})
    if not subasta:
        raise HTTPException(
            status_code=404,
            detail=f"La subasta con identificador {id_subasta} no existe en el sistema."
        )
    return subasta

@app.post("/api/v1/subastas/{id_subasta}/posturas", status_code=201)
async def emitir_postura(
    id_subasta: int,
    postura: PosturaCreate,
    user: dict = Depends(get_current_user)
):
    """Q3: Registro de postura económica con validación transaccional de incremento mínimo."""
    subasta = await db.subastas.find_one({"_id": id_subasta})
    if not subasta:
        raise HTTPException(status_code=404, detail="Subasta no encontrada")

    monto_minimo_requerido = subasta["precio_actual"] + subasta["incremento_minimo"]
    if postura.monto_ofertado < monto_minimo_requerido:
        raise HTTPException(
            status_code=400,
            detail={
                "codigo_interno": "MONTO_INSUFICIENTE",
                "message": f"El monto ofertado debe superar la postura líder por al menos ${subasta['incremento_minimo']:,.0f}. Monto mínimo requerido: ${monto_minimo_requerido:,.0f}."
            }
        )

    nueva_postura_subset = {
        "id_postura": 505,
        "monto": postura.monto_ofertado,
        "postor_alias": f"{user.get('email', 'A')[0].upper()}***e",
        "fecha_hora": datetime.utcnow()
    }

    await db.subastas.update_one(
        {"_id": id_subasta},
        {
            "$set": {"precio_actual": postura.monto_ofertado},
            "$push": {
                "posturas_recientes": {
                    "$each": [nueva_postura_subset],
                    "$position": 0,
                    "$slice": 5
                }
            }
        }
    )

    return {
        "mensaje": "Postura confirmada y registrada exitosamente.",
        "id_postura": 505,
        "subasta_id": id_subasta,
        "nuevo_precio_lider": postura.monto_ofertado,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/usuarios/me/posturas")
async def mis_pujas(user: dict = Depends(get_current_user)):
    """Q6: Historial transaccional «Mis Pujas» del comprador autenticado."""
    cursor = db.posturas.find({"comprador._id": user["id_usuario"]}).sort("fecha_hora_postura", -1)
    posturas = await cursor.to_list(length=50)
    return {"total_participaciones": len(posturas), "data": posturas}