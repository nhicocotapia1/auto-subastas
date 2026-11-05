"""Repositorio de la colección subastas."""
from datetime import datetime

from pymongo import ReturnDocument

from app.db.mongo import get_db, next_id


def _col():
    return get_db().subastas


async def find_by_id(subasta_id: int) -> dict | None:
    # Q2: lectura directa por _id (Subset Pattern, sin $lookup)
    return await _col().find_one({"_id": subasta_id})


async def buscar(filtro: dict, orden: list[tuple[str, int]], skip: int, limit: int) -> tuple[list[dict], int]:
    # Q1: catálogo multicriterio
    total = await _col().count_documents(filtro)
    cursor = _col().find(filtro).sort(orden).skip(skip).limit(limit)
    return await cursor.to_list(length=limit), total


async def distinct(campo: str, filtro: dict | None = None) -> list:
    valores = await _col().distinct(campo, filtro or {})
    return sorted(v for v in valores if v)


async def insert(doc: dict) -> dict:
    doc["_id"] = await next_id("subastas")
    await _col().insert_one(doc)
    return doc


async def update(subasta_id: int, set_: dict) -> dict | None:
    return await _col().find_one_and_update({"_id": subasta_id}, {"$set": set_}, return_document=ReturnDocument.AFTER)


async def registrar_postura_atomica(subasta_id: int, precio_leido: float, monto: float, ahora: datetime, postor: dict, resumen_postura: dict) -> dict | None:
    """Q3: actualización atómica con bloqueo optimista (evita condiciones de carrera – RNF04).

    Solo actualiza si la subasta sigue activa, no ha expirado y el precio_actual
    sigue siendo el que el servicio leyó y validó. Si otra postura llegó antes,
    el filtro no coincide y se devuelve None (el servicio responde 409).
    """
    return await _col().find_one_and_update(
        {
            "_id": subasta_id,
            "estado_subasta": "activa",
            "fecha_termino": {"$gt": ahora},
            "precio_actual": precio_leido,
        },
        {
            "$set": {"precio_actual": monto, "postor_lider": postor},
            "$inc": {"total_posturas": 1},
            "$push": {"posturas_recientes": {"$each": [resumen_postura], "$position": 0, "$slice": 5}},
        },
        return_document=ReturnDocument.AFTER,
    )


async def expiradas_sin_cerrar(ahora: datetime) -> list[dict]:
    return await _col().find({"estado_subasta": "activa", "fecha_termino": {"$lte": ahora}}).to_list(length=1000)


async def listar_admin(filtro: dict) -> list[dict]:
    return await _col().find(filtro).sort("_id", -1).to_list(length=500)


async def nuevo_id() -> int:
    return await next_id("subastas")
