"""Cierre temporal y adjudicación de subastas (RF05).

- cerrar_expiradas(): proceso automático (cron interno) que cada 30 s cierra las subastas
  cuyo cronómetro expiró y declara la pre-venta al mayor postor.
- confirmar_adjudicacion(): el administrador formaliza la adjudicación.
"""
import asyncio
import logging

from app.core.errors import bad_request, not_found
from app.core.utils import clp, now
from app.repositories import posturas_repo, subastas_repo, usuarios_repo
from app.services.subastas_service import titulo

log = logging.getLogger("adjudicacion")


async def _cerrar(s: dict) -> dict:
    mejor = await posturas_repo.mejor_postura(s["_id"])
    if mejor is None:
        return await subastas_repo.update(s["_id"], {"estado_subasta": "desierta", "fecha_cierre": now()})
    return await subastas_repo.update(s["_id"], {
        "estado_subasta": "finalizada",
        "fecha_cierre": now(),
        "ganador": {
            "_id": mejor["comprador"]["_id"],
            "alias": (s.get("postor_lider") or {}).get("alias"),
            "nombre_completo": mejor["comprador"]["nombre_completo"],
            "rut": mejor["comprador"]["rut"],
            "email": mejor["comprador"]["email"],
            "monto": mejor["monto_postura"],
            "id_postura": mejor["_id"],
        },
    })


async def cerrar_expiradas() -> int:
    vencidas = await subastas_repo.expiradas_sin_cerrar(now())
    for s in vencidas:
        await _cerrar(s)
    return len(vencidas)


async def loop_cierre(intervalo: int = 30) -> None:
    while True:
        try:
            n = await cerrar_expiradas()
            if n:
                log.info("Cron: %s subasta(s) cerradas", n)
        except Exception as exc:  # el cron nunca debe caerse
            log.warning("Error en cron de cierre: %s", exc)
        await asyncio.sleep(intervalo)


async def listar() -> list[dict]:
    await cerrar_expiradas()
    docs = await subastas_repo.listar_admin({"estado_subasta": {"$in": ["finalizada", "adjudicada", "desierta"]}})
    return [{
        "id_subasta": d["_id"],
        "titulo": titulo(d),
        "tipo_lote": d["tipo_lote"],
        "estado_subasta": d["estado_subasta"],
        "precio_final": d["precio_actual"],
        "total_posturas": d.get("total_posturas", 0),
        "fecha_termino": d["fecha_termino"],
        "fecha_adjudicacion": d.get("fecha_adjudicacion"),
        "vendedor": d.get("vendedor", {}).get("nombre_comercial"),
        "ganador": d.get("ganador"),
    } for d in docs]


async def cerrar_ahora(subasta_id: int) -> dict:
    """Cierre anticipado manual por el administrador."""
    s = await subastas_repo.find_by_id(subasta_id)
    if s is None:
        raise not_found(f"La subasta #{subasta_id} no existe.", "SUBASTA_NO_ENCONTRADA")
    if s["estado_subasta"] != "activa":
        raise bad_request("Solo se pueden cerrar subastas activas.", "SUBASTA_NO_ACTIVA")
    s = await subastas_repo.update(subasta_id, {"fecha_termino": now()})
    cerrada = await _cerrar(s)
    return {"mensaje": f"Subasta #{subasta_id} cerrada. Estado: {cerrada['estado_subasta']}.", "estado_subasta": cerrada["estado_subasta"]}


async def confirmar_adjudicacion(subasta_id: int, admin: dict) -> dict:
    s = await subastas_repo.find_by_id(subasta_id)
    if s is None:
        raise not_found(f"La subasta #{subasta_id} no existe.", "SUBASTA_NO_ENCONTRADA")
    if s["estado_subasta"] == "adjudicada":
        raise bad_request("Esta subasta ya fue adjudicada.", "YA_ADJUDICADA")
    if s["estado_subasta"] == "desierta":
        raise bad_request("La subasta quedó desierta (sin posturas), no hay ganador que adjudicar.", "SUBASTA_DESIERTA")
    if s["estado_subasta"] != "finalizada":
        raise bad_request("Solo se pueden adjudicar subastas finalizadas.", "SUBASTA_NO_FINALIZADA")
    ganador = s["ganador"]
    usuario = await usuarios_repo.find_by_id(ganador["_id"])
    if usuario and usuario.get("estado_cuenta") != "activo":
        raise bad_request("El ganador tiene la cuenta suspendida. Revisa el caso antes de adjudicar.", "GANADOR_SUSPENDIDO")
    await subastas_repo.update(subasta_id, {
        "estado_subasta": "adjudicada",
        "fecha_adjudicacion": now(),
        "adjudicado_por": admin["_id"],
    })
    return {
        "mensaje": f"Lote #{subasta_id} adjudicado a {ganador['nombre_completo']} por {clp(ganador['monto'])}.",
        "comprobante": {
            "subasta_id": subasta_id,
            "lote": titulo(s),
            "ganador": ganador["nombre_completo"],
            "rut": ganador["rut"],
            "monto": ganador["monto"],
            "fecha": now(),
        },
    }
