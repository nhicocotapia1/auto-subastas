"""Servicio de subastas: catálogo (Q1), detalle (Q2) y mantenedor de lotes (RF03)."""
import math
import uuid
from datetime import timedelta

from fastapi import UploadFile

from app.core.config import settings
from app.core.errors import bad_request, forbidden, not_found
from app.core.utils import now
from app.repositories import subastas_repo
from app.schemas.subasta import ItemPieza, ItemVehiculo, LoteIn, LoteUpdate

ORDENES = {
    "termina_pronto": [("fecha_termino", 1)],
    "precio_asc": [("precio_actual", 1)],
    "precio_desc": [("precio_actual", -1)],
    "recientes": [("fecha_inicio", -1)],
}
VISTAS_VALIDAS = {"frontal", "motor", "chasis", "habitaculo", "lateral", "trasera", "superior", "detalle"}
EXT_PERMITIDAS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def titulo(s: dict) -> str:
    it = s.get("item", {})
    if s.get("tipo_lote") == "pieza_desarme":
        return it.get("nombre_pieza", "Pieza")
    return f"{it.get('marca', '')} {it.get('modelo', '')} ({it.get('anio', '')})".strip()


def portada(s: dict) -> str | None:
    imgs = s.get("item", {}).get("imagenes", [])
    for i in imgs:
        if i.get("es_portada"):
            return i["url_archivo"]
    return imgs[0]["url_archivo"] if imgs else None


def tarjeta(s: dict) -> dict:
    it = s.get("item", {})
    return {
        "id_subasta": s["_id"],
        "tipo_lote": s["tipo_lote"],
        "titulo": titulo(s),
        "precio_actual": s["precio_actual"],
        "precio_base": s["precio_base"],
        "fecha_termino": s["fecha_termino"],
        "estado_subasta": s["estado_subasta"],
        "portada_url": portada(s),
        "nivel_danio": it.get("nivel_danio"),
        "categoria_pieza": it.get("categoria"),
        "region": it.get("region_ubicacion"),
        "marca": it.get("marca"),
        "total_posturas": s.get("total_posturas", 0),
    }


def monto_minimo(s: dict) -> float:
    if s.get("total_posturas", 0) == 0:
        return float(s["precio_base"])
    return float(s["precio_actual"] + s["incremento_minimo"])


async def catalogo(
    categoria: str | None, anio_min: int | None, anio_max: int | None, marcas: list[str], niveles: list[str],
    regiones: list[str], solo_activas: bool, q: str | None, orden: str, page: int, limit: int,
) -> dict:
    if anio_min and anio_max and anio_min > anio_max:
        raise bad_request("El año 'desde' no puede ser mayor que el año 'hasta'.", "RANGO_ANIOS_INVALIDO")
    if orden not in ORDENES:
        raise bad_request(f"Orden inválido. Opciones: {', '.join(ORDENES)}", "ORDEN_INVALIDO")

    condiciones: list[dict] = []
    if solo_activas:
        condiciones.append({"estado_subasta": "activa", "fecha_termino": {"$gt": now()}})
    else:
        condiciones.append({"estado_subasta": {"$in": ["activa", "finalizada", "adjudicada", "desierta"]}})
    if categoria and categoria != "todos":
        if categoria not in ("vehiculo_completo", "pieza_desarme"):
            raise bad_request("Categoría inválida. Usa: todos, vehiculo_completo o pieza_desarme.", "CATEGORIA_INVALIDA")
        condiciones.append({"tipo_lote": categoria})
    if anio_min or anio_max:
        rango = {}
        if anio_min:
            rango["$gte"] = anio_min
        if anio_max:
            rango["$lte"] = anio_max
        # El rango de años aplica a vehículos; las piezas no tienen año propio
        condiciones.append({"$or": [{"tipo_lote": "pieza_desarme"}, {"item.anio": rango}]})
    if marcas:
        condiciones.append({"item.marca": {"$in": marcas}})
    if niveles:
        condiciones.append({"item.nivel_danio": {"$in": niveles}})
    if regiones:
        condiciones.append({"item.region_ubicacion": {"$in": regiones}})
    if q:
        import re
        patron = {"$regex": re.escape(q.strip()), "$options": "i"}
        condiciones.append({"$or": [{"item.marca": patron}, {"item.modelo": patron}, {"item.nombre_pieza": patron}]})

    filtro = {"$and": condiciones} if len(condiciones) > 1 else condiciones[0]
    docs, total = await subastas_repo.buscar(filtro, ORDENES[orden], (page - 1) * limit, limit)
    return {
        "total_items": total,
        "page": page,
        "total_pages": max(1, math.ceil(total / limit)),
        "data": [tarjeta(d) for d in docs],
    }


async def opciones_filtros() -> dict:
    return {
        "marcas": await subastas_repo.distinct("item.marca"),
        "regiones": await subastas_repo.distinct("item.region_ubicacion"),
        "anio_min": min(await subastas_repo.distinct("item.anio") or [2000]),
        "anio_max": max(await subastas_repo.distinct("item.anio") or [now().year]),
    }


async def detalle(subasta_id: int) -> dict:
    s = await subastas_repo.find_by_id(subasta_id)
    if s is None or s.get("estado_subasta") == "cancelada":
        raise not_found(f"La subasta con identificador {subasta_id} no existe en el sistema.", "SUBASTA_NO_ENCONTRADA")
    s = dict(s)
    s["titulo"] = titulo(s)
    s["monto_minimo"] = monto_minimo(s)
    s["vendedor"] = {k: v for k, v in s.get("vendedor", {}).items() if k != "email"}
    if s.get("ganador"):
        # Datos públicos del ganador: solo alias
        s["ganador"] = {"_id": s["ganador"]["_id"], "alias": s["ganador"].get("alias")}
    return s


# ---------------------- Mantenedor de lotes (RF03 / CU03) ----------------------

def _puede_editar(s: dict, usuario: dict) -> None:
    if usuario["tipo_usuario"] == "administrador":
        return
    if s.get("vendedor", {}).get("_id") != usuario["_id"]:
        raise forbidden("Solo puedes modificar lotes publicados por ti.", "LOTE_AJENO")


async def crear_lote(data: LoteIn, usuario: dict) -> dict:
    inicio = now()
    incremento = data.incremento_minimo or (
        settings.INCREMENTO_VEHICULO if data.tipo_lote == "vehiculo_completo" else settings.INCREMENTO_PIEZA
    )
    item = dict(data.item)
    item["imagenes"] = []
    doc = {
        "tipo_lote": data.tipo_lote,
        "precio_base": float(data.precio_base),
        "precio_actual": float(data.precio_base),
        "incremento_minimo": float(incremento),
        "fecha_inicio": inicio,
        "fecha_termino": inicio + timedelta(hours=data.duracion_horas),
        "estado_subasta": "activa",
        "vendedor": {
            "_id": usuario["_id"],
            "nombre_comercial": usuario.get("nombre_comercial") or usuario["nombre_completo"],
            "email": usuario["email"],
        },
        "postor_lider": None,
        "item": item,
        "posturas_recientes": [],
        "total_posturas": 0,
    }
    creado = await subastas_repo.insert(doc)
    return {
        "mensaje": "Lote publicado y subasta abierta correctamente.",
        "id_subasta": creado["_id"],
        "fecha_termino": creado["fecha_termino"],
    }


async def actualizar_lote(subasta_id: int, data: LoteUpdate, usuario: dict) -> dict:
    s = await subastas_repo.find_by_id(subasta_id)
    if s is None:
        raise not_found(f"El lote #{subasta_id} no existe.", "SUBASTA_NO_ENCONTRADA")
    _puede_editar(s, usuario)
    if s["estado_subasta"] not in ("activa",):
        raise bad_request("Solo se pueden editar lotes con subasta activa.", "SUBASTA_NO_EDITABLE")

    cambios: dict = {}
    if data.precio_base is not None:
        if s.get("total_posturas", 0) > 0:
            raise bad_request("No se puede cambiar el precio base de un lote que ya recibió posturas.", "LOTE_CON_POSTURAS")
        cambios["precio_base"] = data.precio_base
        cambios["precio_actual"] = data.precio_base
    if data.incremento_minimo is not None:
        cambios["incremento_minimo"] = data.incremento_minimo
    if data.extender_horas:
        cambios["fecha_termino"] = s["fecha_termino"] + timedelta(hours=data.extender_horas)
    if data.item:
        modelo = ItemVehiculo if s["tipo_lote"] == "vehiculo_completo" else ItemPieza
        actual = {k: v for k, v in s["item"].items() if k != "imagenes"}
        actual.update(data.item)
        validado = modelo.model_validate(actual).model_dump()
        validado["imagenes"] = s["item"].get("imagenes", [])
        cambios["item"] = validado
    if not cambios:
        raise bad_request("No enviaste ningún cambio para guardar.", "SIN_CAMBIOS")

    actualizado = await subastas_repo.update(subasta_id, cambios)
    return {"mensaje": f"Lote #{subasta_id} actualizado correctamente.", "lote": tarjeta(actualizado)}


async def dar_de_baja(subasta_id: int, usuario: dict) -> dict:
    s = await subastas_repo.find_by_id(subasta_id)
    if s is None:
        raise not_found(f"El lote #{subasta_id} no existe.", "SUBASTA_NO_ENCONTRADA")
    _puede_editar(s, usuario)
    if s["estado_subasta"] == "cancelada":
        raise bad_request("El lote ya se encuentra dado de baja.", "YA_CANCELADA")
    if s["estado_subasta"] in ("finalizada", "adjudicada"):
        raise bad_request("No se puede dar de baja un lote ya finalizado o adjudicado.", "SUBASTA_CERRADA")
    await subastas_repo.update(subasta_id, {"estado_subasta": "cancelada", "fecha_baja": now()})
    return {"mensaje": f"Lote #{subasta_id} dado de baja (deshabilitación lógica)."}


async def listar_admin(usuario: dict, estado: str | None) -> list[dict]:
    filtro: dict = {}
    if usuario["tipo_usuario"] != "administrador":
        filtro["vendedor._id"] = usuario["_id"]
    if estado:
        filtro["estado_subasta"] = estado
    docs = await subastas_repo.listar_admin(filtro)
    salida = []
    for d in docs:
        t = tarjeta(d)
        t["incremento_minimo"] = d["incremento_minimo"]
        t["vendedor"] = d.get("vendedor", {}).get("nombre_comercial")
        t["item"] = d.get("item", {})
        salida.append(t)
    return salida


async def subir_imagenes(subasta_id: int, archivos: list[UploadFile], vistas: list[str], usuario: dict) -> dict:
    s = await subastas_repo.find_by_id(subasta_id)
    if s is None:
        raise not_found(f"El lote #{subasta_id} no existe.", "SUBASTA_NO_ENCONTRADA")
    _puede_editar(s, usuario)
    if not archivos:
        raise bad_request("Debes adjuntar al menos una imagen.", "SIN_ARCHIVOS")
    if len(archivos) > 8:
        raise bad_request("Puedes subir como máximo 8 imágenes por lote.", "DEMASIADOS_ARCHIVOS")

    carpeta = settings.UPLOAD_DIR / str(subasta_id)
    carpeta.mkdir(parents=True, exist_ok=True)
    imagenes = list(s["item"].get("imagenes", []))
    for i, archivo in enumerate(archivos):
        ext = EXT_PERMITIDAS.get(archivo.content_type or "")
        if ext is None:
            raise bad_request(f"'{archivo.filename}' no es una imagen JPG, PNG o WEBP.", "FORMATO_IMAGEN_INVALIDO")
        contenido = await archivo.read()
        if len(contenido) > settings.MAX_UPLOAD_MB * 1024 * 1024:
            raise bad_request(f"'{archivo.filename}' supera los {settings.MAX_UPLOAD_MB} MB permitidos.", "IMAGEN_MUY_GRANDE")
        nombre = f"{uuid.uuid4().hex[:12]}{ext}"
        (carpeta / nombre).write_bytes(contenido)
        vista = vistas[i] if i < len(vistas) and vistas[i] in VISTAS_VALIDAS else "detalle"
        imagenes.append({"url_archivo": f"/uploads/{subasta_id}/{nombre}", "tipo_vista": vista, "es_portada": False})

    if imagenes and not any(img.get("es_portada") for img in imagenes):
        imagenes[0]["es_portada"] = True
    await subastas_repo.update(subasta_id, {"item.imagenes": imagenes})
    return {"mensaje": f"{len(archivos)} imagen(es) cargada(s) correctamente.", "imagenes": imagenes}
