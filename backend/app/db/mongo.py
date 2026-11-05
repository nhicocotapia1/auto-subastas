"""Conexión asíncrona a MongoDB con Motor + creación de índices (sección 5 del informe)."""
import logging
 
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, ReturnDocument
 
from app.core.config import settings
 
_client = None
_db: AsyncIOMotorDatabase | None = None
 
 
def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("La base de datos no está inicializada")
    return _db
 
 
async def connect() -> None:
    global _client, _db
    if settings.MONGO_URI.startswith("mock://"):
        # Modo demo: base en memoria (no requiere MongoDB instalado)
        from mongomock_motor import AsyncMongoMockClient
 
        _client = AsyncMongoMockClient()
    else:
        _client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    _db = _client[settings.MONGO_DB]
    try:
        await create_indexes()
    except Exception as exc:  # p. ej. poco espacio en disco: la app sigue funcionando sin índices
        logging.getLogger("mongo").warning("No se pudieron crear los índices: %s", exc)
 
 
async def close() -> None:
    if _client is not None:
        _client.close()
 
 
async def create_indexes() -> None:
    db = get_db()
    # usuarios: unicidad legal (rut) y de login (email) – Tabla 2 del informe
    await db.usuarios.create_index("email", unique=True)
    await db.usuarios.create_index("rut", unique=True)
    # subastas: índice compuesto de soporte a Q1 (catálogo)
    await db.subastas.create_index([("estado_subasta", ASCENDING), ("item.tipo_vehiculo", ASCENDING), ("item.anio", ASCENDING)])
    await db.subastas.create_index([("estado_subasta", ASCENDING), ("fecha_termino", ASCENDING)])
    await db.subastas.create_index("item.vin_chasis", unique=True, sparse=True)
    # posturas: soporte a Q6 («Mis Pujas») y Q4 (auditoría)
    await db.posturas.create_index([("comprador._id", ASCENDING), ("fecha_hora_postura", DESCENDING)])
    await db.posturas.create_index([("subasta_id", ASCENDING), ("monto_postura", DESCENDING)])
 
 
async def next_id(nombre: str) -> int:
    """Identificadores enteros correlativos (como en los ejemplos BSON del informe)."""
    doc = await get_db().contadores.find_one_and_update(
        {"_id": nombre}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return int(doc["seq"])
