"""Servicio de posturas: emisión transaccional (Q3), «Mis Pujas» (Q6) y auditoría (Q4)."""
from app.core.errors import ApiError, bad_request, forbidden, not_found
from app.core.rate_limit import limit_posturas
from app.core.utils import alias, clp, now
from app.repositories import posturas_repo, subastas_repo
from app.services.subastas_service import monto_minimo, portada, titulo


async def emitir_postura(subasta_id: int, monto: float, usuario: dict, ip: str) -> dict:
    limit_posturas(usuario["_id"])

    s = await subastas_repo.find_by_id(subasta_id)
    if s is None or s["estado_subasta"] == "cancelada":
        raise not_found(f"La subasta con identificador {subasta_id} no existe en el sistema.", "SUBASTA_NO_ENCONTRADA")
    ahora = now()
    if s["estado_subasta"] != "activa" or s["fecha_termino"] <= ahora:
        raise bad_request("La subasta ya finalizó y no admite nuevas posturas.", "SUBASTA_FINALIZADA")
    if s.get("vendedor", {}).get("_id") == usuario["_id"]:
        raise forbidden("No puedes ofertar en un lote publicado por ti.", "AUTO_POSTURA")
    if (s.get("postor_lider") or {}).get("_id") == usuario["_id"]:
        raise bad_request("Ya eres el postor líder de este lote. Espera a que alguien supere tu oferta.", "YA_ES_LIDER")

    minimo = monto_minimo(s)
    if monto < minimo:
        if s.get("total_posturas", 0) == 0:
            msg = f"La primera postura debe ser igual o mayor al precio base. Monto mínimo requerido: {clp(minimo)}."
        else:
            msg = (f"El monto ofertado debe superar la postura líder por al menos {clp(s['incremento_minimo'])}. "
                   f"Monto mínimo requerido: {clp(minimo)}.")
        raise bad_request(msg, "MONTO_INSUFICIENTE")

    id_postura = await posturas_repo.nuevo_id()
    alias_postor = alias(usuario["nombre_completo"])
    actualizada = await subastas_repo.registrar_postura_atomica(
        subasta_id,
        precio_leido=s["precio_actual"],
        monto=float(monto),
        ahora=ahora,
        postor={"_id": usuario["_id"], "alias": alias_postor},
        resumen_postura={"id_postura": id_postura, "monto": float(monto), "postor_alias": alias_postor, "fecha_hora": ahora},
    )
    if actualizada is None:
        # Otra postura ganó la carrera entre la lectura y la escritura
        raise ApiError(409, "Otra persona ofertó al mismo tiempo y el precio cambió. Revisa el nuevo precio e intenta de nuevo.", "PRECIO_CAMBIO")

    # Registro de auditoría íntegro con referencia extendida inmutable del comprador
    await posturas_repo.insert({
        "_id": id_postura,
        "subasta_id": subasta_id,
        "comprador": {
            "_id": usuario["_id"],
            "rut": usuario["rut"],
            "nombre_completo": usuario["nombre_completo"],
            "email": usuario["email"],
        },
        "monto_postura": float(monto),
        "fecha_hora_postura": ahora,
        "ip_origen": ip,
    })
    return {
        "mensaje": "Postura confirmada y registrada exitosamente.",
        "id_postura": id_postura,
        "subasta_id": subasta_id,
        "nuevo_precio_lider": float(monto),
        "monto_minimo_siguiente": float(monto + actualizada["incremento_minimo"]),
        "timestamp": ahora,
    }


def _estado_oferta(subasta: dict, usuario_id: int) -> str:
    estado = subasta.get("estado_subasta")
    if estado == "activa":
        return "lider" if (subasta.get("postor_lider") or {}).get("_id") == usuario_id else "superada"
    if estado in ("finalizada", "adjudicada"):
        return "ganada" if (subasta.get("ganador") or {}).get("_id") == usuario_id else "no_adjudicado"
    if estado == "cancelada":
        return "cancelada"
    return "no_adjudicado"


async def mis_pujas(usuario: dict) -> dict:
    """Q6 «Mis Pujas»: agrupa las posturas del comprador por lote ($group) y une la subasta ($lookup)."""
    pipeline = [
        {"$match": {"comprador._id": usuario["_id"]}},
        {"$sort": {"fecha_hora_postura": -1}},
        {"$group": {
            "_id": "$subasta_id",
            "mi_mejor_oferta": {"$max": "$monto_postura"},
            "ultima_postura": {"$first": "$fecha_hora_postura"},
            "id_ultima_postura": {"$first": "$_id"},
            "cantidad_posturas": {"$sum": 1},
        }},
        {"$lookup": {"from": "subastas", "localField": "_id", "foreignField": "_id", "as": "subasta"}},
        {"$unwind": "$subasta"},
        {"$sort": {"ultima_postura": -1}},
    ]
    filas = await posturas_repo.aggregate(pipeline)
    data = []
    for f in filas:
        s = f["subasta"]
        it = s.get("item", {})
        data.append({
            "id_postura": f["id_ultima_postura"],
            "subasta_id": f["_id"],
            "descripcion_lote": titulo(s),
            "tipo_lote": s["tipo_lote"],
            "region": it.get("region_ubicacion"),
            "portada_url": portada(s),
            "monto_postura": f["mi_mejor_oferta"],
            "precio_actual": s["precio_actual"],
            "cantidad_posturas": f["cantidad_posturas"],
            "estado_subasta": s["estado_subasta"],
            "fecha_termino": s["fecha_termino"],
            "estado_oferta": _estado_oferta(s, usuario["_id"]),
            "fecha_hora_postura": f["ultima_postura"],
        })
    return {"total_participaciones": len(data), "data": data}


async def auditoria(subasta_id: int, usuario: dict) -> dict:
    s = await subastas_repo.find_by_id(subasta_id)
    if s is None:
        raise not_found(f"La subasta con identificador {subasta_id} no existe en el sistema.", "SUBASTA_NO_ENCONTRADA")
    if usuario["tipo_usuario"] != "administrador" and s.get("vendedor", {}).get("_id") != usuario["_id"]:
        raise forbidden("Solo el administrador o el vendedor del lote pueden ver la auditoría.")
    return {"subasta_id": subasta_id, "titulo": titulo(s), "posturas": await posturas_repo.por_subasta(subasta_id)}
