"""Consultas analíticas presentadas en el frontend (panel «Consultas»).

Cada consulta usa JOIN ($lookup), operadores ($gte, $in, $lte...) y GROUP BY ($group),
y devuelve junto al resultado la consulta MQL ejecutada y su equivalente SQL.
"""
import json
from datetime import timedelta

from app.core.errors import bad_request
from app.core.utils import now
from app.db.mongo import get_db


def _fmt(pipeline: list[dict], coleccion: str) -> str:
    def default(o):
        return f"ISODate(\"{o.isoformat()}Z\")" if hasattr(o, "isoformat") else str(o)

    cuerpo = json.dumps(pipeline, indent=2, ensure_ascii=False, default=default)
    cuerpo = cuerpo.replace('"ISODate(\\"', 'ISODate("').replace('Z\\")"', 'Z")')
    return f"db.{coleccion}.aggregate({cuerpo})"


def _redondear(fila: dict) -> dict:
    # Promedios: enteros para montos/años y 1 decimal para razones
    return {k: (round(v, 1) if k == "posturas_por_lote" else round(v)) if isinstance(v, float) else v for k, v in fila.items()}


async def _run(coleccion: str, pipeline: list[dict]) -> list[dict]:
    filas = await get_db()[coleccion].aggregate(pipeline).to_list(length=500)
    return [_redondear(f) for f in filas]


# ---------------------------------------------------------------------------
async def actividad_por_lote(min_posturas: int = 1) -> dict:
    pipeline = [
        {"$group": {
            "_id": "$subasta_id",
            "total_posturas": {"$sum": 1},
            "monto_maximo": {"$max": "$monto_postura"},
            "monto_promedio": {"$avg": "$monto_postura"},
            "postores": {"$addToSet": "$comprador._id"},
        }},
        {"$match": {"total_posturas": {"$gte": min_posturas}}},
        {"$lookup": {"from": "subastas", "localField": "_id", "foreignField": "_id", "as": "subasta"}},
        {"$unwind": "$subasta"},
        {"$project": {
            "_id": 0, "subasta_id": "$_id", "tipo_lote": "$subasta.tipo_lote",
            "marca": "$subasta.item.marca", "modelo": "$subasta.item.modelo", "pieza": "$subasta.item.nombre_pieza",
            "estado": "$subasta.estado_subasta", "total_posturas": 1, "monto_maximo": 1,
            "monto_promedio": "$monto_promedio", "postores_distintos": {"$size": "$postores"},
        }},
        {"$sort": {"total_posturas": -1}},
    ]
    sql = f"""SELECT S.id_subasta, V.marca, V.modelo, S.estado_subasta,
       COUNT(P.id_postura)            AS total_posturas,
       MAX(P.monto_postura)           AS monto_maximo,
       ROUND(AVG(P.monto_postura))    AS monto_promedio,
       COUNT(DISTINCT P.id_comprador) AS postores_distintos
FROM POSTURAS P
INNER JOIN SUBASTAS S  ON P.id_subasta  = S.id_subasta
INNER JOIN VEHICULOS V ON S.id_vehiculo = V.id_vehiculo
GROUP BY S.id_subasta, V.marca, V.modelo, S.estado_subasta
HAVING COUNT(P.id_postura) >= {min_posturas}
ORDER BY total_posturas DESC;"""
    return {"mql": _fmt(pipeline, "posturas"), "sql": sql, "resultados": await _run("posturas", pipeline)}


# ---------------------------------------------------------------------------
async def ranking_compradores(dias: int = 30) -> dict:
    desde = now() - timedelta(days=dias)
    pipeline = [
        {"$match": {"fecha_hora_postura": {"$gte": desde}}},
        {"$group": {
            "_id": "$comprador._id",
            "nombre": {"$first": "$comprador.nombre_completo"},
            "cantidad_posturas": {"$sum": 1},
            "lotes": {"$addToSet": "$subasta_id"},
            "oferta_maxima": {"$max": "$monto_postura"},
            "ultima_actividad": {"$max": "$fecha_hora_postura"},
        }},
        {"$lookup": {"from": "usuarios", "localField": "_id", "foreignField": "_id", "as": "usuario"}},
        {"$unwind": "$usuario"},
        {"$project": {
            "_id": 0, "comprador_id": "$_id", "nombre": 1, "email": "$usuario.email",
            "estado_cuenta": "$usuario.estado_cuenta", "cantidad_posturas": 1,
            "lotes_distintos": {"$size": "$lotes"}, "oferta_maxima": 1, "ultima_actividad": 1,
        }},
        {"$sort": {"cantidad_posturas": -1}},
        {"$limit": 10},
    ]
    sql = f"""SELECT U.id_usuario, U.nombre_completo, U.email, U.estado_cuenta,
       COUNT(P.id_postura)          AS cantidad_posturas,
       COUNT(DISTINCT P.id_subasta) AS lotes_distintos,
       MAX(P.monto_postura)         AS oferta_maxima,
       MAX(P.fecha_hora_postura)    AS ultima_actividad
FROM POSTURAS P
INNER JOIN USUARIOS U ON P.id_comprador = U.id_usuario
WHERE P.fecha_hora_postura >= NOW() - INTERVAL '{dias} days'
GROUP BY U.id_usuario, U.nombre_completo, U.email, U.estado_cuenta
ORDER BY cantidad_posturas DESC
LIMIT 10;"""
    return {"mql": _fmt(pipeline, "posturas"), "sql": sql, "resultados": await _run("posturas", pipeline)}


# ---------------------------------------------------------------------------
async def lotes_por_region(estados: list[str], precio_min: int = 0) -> dict:
    validos = {"activa", "finalizada", "adjudicada", "desierta", "cancelada"}
    if not estados or not set(estados) <= validos:
        raise bad_request("Debes elegir al menos un estado válido.", "ESTADOS_INVALIDOS")
    pipeline = [
        {"$match": {"estado_subasta": {"$in": estados}, "precio_actual": {"$gte": precio_min}}},
        {"$group": {
            "_id": {"region": "$item.region_ubicacion", "tipo_lote": "$tipo_lote"},
            "cantidad_lotes": {"$sum": 1},
            "precio_promedio": {"$avg": "$precio_actual"},
            "valor_total": {"$sum": "$precio_actual"},
            "posturas_totales": {"$sum": "$total_posturas"},
        }},
        {"$project": {
            "_id": 0, "region": "$_id.region", "tipo_lote": "$_id.tipo_lote", "cantidad_lotes": 1,
            "precio_promedio": "$precio_promedio", "valor_total": 1, "posturas_totales": 1,
        }},
        {"$sort": {"valor_total": -1}},
    ]
    lista = ", ".join(f"'{e}'" for e in estados)
    sql = f"""SELECT V.region_ubicacion AS region, S.tipo_lote,
       COUNT(*)                 AS cantidad_lotes,
       ROUND(AVG(S.precio_actual)) AS precio_promedio,
       SUM(S.precio_actual)     AS valor_total,
       SUM(S.total_posturas)    AS posturas_totales
FROM SUBASTAS S
INNER JOIN VEHICULOS V ON S.id_vehiculo = V.id_vehiculo
WHERE S.estado_subasta IN ({lista})
  AND S.precio_actual >= {precio_min}
GROUP BY V.region_ubicacion, S.tipo_lote
ORDER BY valor_total DESC;"""
    return {"mql": _fmt(pipeline, "subastas"), "sql": sql, "resultados": await _run("subastas", pipeline)}


# ---------------------------------------------------------------------------
async def demanda_por_marca(anio_min: int = 2000, anio_max: int = 2100) -> dict:
    if anio_min > anio_max:
        raise bad_request("El año mínimo no puede ser mayor al año máximo.", "RANGO_ANIOS_INVALIDO")
    pipeline = [
        {"$match": {
            "tipo_lote": "vehiculo_completo",
            "item.anio": {"$gte": anio_min, "$lte": anio_max},
            "estado_subasta": {"$ne": "cancelada"},
        }},
        {"$group": {
            "_id": "$item.marca",
            "lotes": {"$sum": 1},
            "posturas": {"$sum": "$total_posturas"},
            "precio_promedio": {"$avg": "$precio_actual"},
            "precio_maximo": {"$max": "$precio_actual"},
            "anio_promedio": {"$avg": "$item.anio"},
        }},
        {"$project": {
            "_id": 0, "marca": "$_id", "lotes": 1, "posturas": 1,
            "posturas_por_lote": {"$divide": ["$posturas", "$lotes"]},
            "precio_promedio": "$precio_promedio", "precio_maximo": 1,
            "anio_promedio": "$anio_promedio",
        }},
        {"$sort": {"posturas": -1}},
    ]
    sql = f"""SELECT V.marca,
       COUNT(*)                     AS lotes,
       SUM(S.total_posturas)        AS posturas,
       ROUND(SUM(S.total_posturas) * 1.0 / COUNT(*), 1) AS posturas_por_lote,
       ROUND(AVG(S.precio_actual))  AS precio_promedio,
       MAX(S.precio_actual)         AS precio_maximo,
       ROUND(AVG(V.anio))           AS anio_promedio
FROM SUBASTAS S
INNER JOIN VEHICULOS V ON S.id_vehiculo = V.id_vehiculo
WHERE V.anio BETWEEN {anio_min} AND {anio_max}
  AND S.estado_subasta <> 'cancelada'
GROUP BY V.marca
ORDER BY posturas DESC;"""
    return {"mql": _fmt(pipeline, "subastas"), "sql": sql, "resultados": await _run("subastas", pipeline)}


# ---------------------------------------------------------------------------
async def recaudacion_por_vendedor() -> dict:
    pipeline = [
        {"$match": {"estado_subasta": {"$in": ["finalizada", "adjudicada"]}}},
        {"$group": {
            "_id": "$vendedor._id",
            "lotes_vendidos": {"$sum": 1},
            "monto_total": {"$sum": "$precio_actual"},
            "sobreprecio_total": {"$sum": {"$subtract": ["$precio_actual", "$precio_base"]}},
        }},
        {"$lookup": {"from": "usuarios", "localField": "_id", "foreignField": "_id", "as": "vendedor"}},
        {"$unwind": "$vendedor"},
        {"$project": {
            "_id": 0, "vendedor_id": "$_id",
            "vendedor": {"$ifNull": ["$vendedor.nombre_comercial", "$vendedor.nombre_completo"]},
            "lotes_vendidos": 1, "monto_total": 1, "sobreprecio_total": 1,
        }},
        {"$sort": {"monto_total": -1}},
    ]
    sql = """SELECT U.id_usuario, COALESCE(U.nombre_comercial, U.nombre_completo) AS vendedor,
       COUNT(S.id_subasta)                  AS lotes_vendidos,
       SUM(S.precio_actual)                 AS monto_total,
       SUM(S.precio_actual - S.precio_base) AS sobreprecio_total
FROM SUBASTAS S
INNER JOIN USUARIOS U ON S.id_vendedor = U.id_usuario
WHERE S.estado_subasta IN ('finalizada', 'adjudicada')
GROUP BY U.id_usuario, vendedor
ORDER BY monto_total DESC;"""
    return {"mql": _fmt(pipeline, "subastas"), "sql": sql, "resultados": await _run("subastas", pipeline)}
