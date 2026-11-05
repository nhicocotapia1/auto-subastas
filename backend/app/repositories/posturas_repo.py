"""Repositorio de la colección posturas (auditoría íntegra)."""
from app.db.mongo import get_db, next_id


def _col():
    return get_db().posturas


async def nuevo_id() -> int:
    return await next_id("posturas")


async def insert(doc: dict) -> dict:
    await _col().insert_one(doc)
    return doc


async def por_comprador(comprador_id: int) -> list[dict]:
    # Q6: «Mis Pujas» – usa índice { comprador._id: 1, fecha_hora_postura: -1 }
    return await _col().find({"comprador._id": comprador_id}).sort("fecha_hora_postura", -1).to_list(length=1000)


async def por_subasta(subasta_id: int) -> list[dict]:
    # Q4: auditoría completa de un remate
    return await _col().find({"subasta_id": subasta_id}).sort("monto_postura", -1).to_list(length=5000)


async def mejor_postura(subasta_id: int) -> dict | None:
    return await _col().find_one({"subasta_id": subasta_id}, sort=[("monto_postura", -1)])


async def aggregate(pipeline: list[dict]) -> list[dict]:
    return await _col().aggregate(pipeline).to_list(length=1000)
