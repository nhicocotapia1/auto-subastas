"""Repositorio de la colección usuarios (acceso a datos puro, sin reglas de negocio)."""
import re

from pymongo import ReturnDocument

from app.db.mongo import get_db, next_id


def _col():
    return get_db().usuarios


async def find_by_id(user_id: int) -> dict | None:
    return await _col().find_one({"_id": user_id})


async def find_by_email(email: str) -> dict | None:
    # Q5: autenticación por email
    return await _col().find_one({"email": email.lower()})


async def find_by_rut(rut: str) -> dict | None:
    return await _col().find_one({"rut": rut})


async def insert(doc: dict) -> dict:
    doc["_id"] = await next_id("usuarios")
    await _col().insert_one(doc)
    return doc


async def listar(q: str | None = None, rol: str | None = None, estado: str | None = None) -> list[dict]:
    filtro: dict = {}
    if q:
        patron = re.escape(q.strip())
        filtro["$or"] = [
            {"nombre_completo": {"$regex": patron, "$options": "i"}},
            {"email": {"$regex": patron, "$options": "i"}},
            {"rut": {"$regex": patron, "$options": "i"}},
        ]
    if rol:
        filtro["tipo_usuario"] = rol
    if estado:
        filtro["estado_cuenta"] = estado
    cursor = _col().find(filtro, {"password_hash": 0}).sort("_id", 1)
    return await cursor.to_list(length=500)


async def update(user_id: int, cambios: dict) -> dict | None:
    return await _col().find_one_and_update({"_id": user_id}, {"$set": cambios}, return_document=ReturnDocument.AFTER)
