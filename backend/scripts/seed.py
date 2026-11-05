"""Datos de ejemplo para la demostración.

Uso:
    python -m scripts.seed          # carga datos solo si la base está vacía
    python -m scripts.seed --reset  # borra todo y vuelve a cargar

Cuentas de prueba (contraseña para todas: Subastas2026):
    admin@autosubastas.cl        -> administrador
    remates@aseguradoradelsur.cl -> vendedor_tasador
    ventas@centralvina.cl        -> vendedor_tasador
    g.morales@correo.cl          -> comprador
    tomas.vera@correo.cl         -> comprador
    camila.rojas@correo.cl       -> comprador
"""
import asyncio
import sys
from datetime import timedelta

from app.core.security import hash_password
from app.core.utils import alias, now
from app.db import mongo
from app.schemas.usuario import normalizar_rut

PASSWORD = "Subastas2026"


def rut(cuerpo: int) -> str:
    suma, factor = 0, 2
    for d in reversed(str(cuerpo)):
        suma += int(d) * factor
        factor = 2 if factor == 7 else factor + 1
    r = 11 - (suma % 11)
    dv = "0" if r == 11 else "K" if r == 10 else str(r)
    return normalizar_rut(f"{cuerpo}{dv}")


USUARIOS = [
    # (id, cuerpo_rut, nombre, nombre_comercial, email, rol, estado)
    (1, 17890123, "Gonzalo Morales Tapia", None, "g.morales@correo.cl", "comprador", "activo"),
    (2, 76543210, "Rodrigo Fuentes Lagos", "Aseguradora del Sur S.A.", "remates@aseguradoradelsur.cl", "vendedor_tasador", "activo"),
    (3, 12345678, "Administrador Auto-Subastas", None, "admin@autosubastas.cl", "administrador", "activo"),
    (4, 19456789, "Camila Rojas Pérez", None, "camila.rojas@correo.cl", "comprador", "activo"),
    (5, 77123456, "Patricio Soto Vidal", "Desarmaduría Central Viña", "ventas@centralvina.cl", "vendedor_tasador", "activo"),
    (6, 16234567, "María Acevedo Rivas", None, "maria.acevedo@correo.cl", "comprador", "activo"),
    (7, 18345678, "Tomás Vera Muñoz", None, "tomas.vera@correo.cl", "comprador", "activo"),
    (8, 15987654, "Felipe Contreras Díaz", None, "felipe.contreras@correo.cl", "comprador", "suspendido"),
]

VENDEDORES = {
    2: {"_id": 2, "nombre_comercial": "Aseguradora del Sur S.A.", "email": "remates@aseguradoradelsur.cl"},
    5: {"_id": 5, "nombre_comercial": "Desarmaduría Central Viña", "email": "ventas@centralvina.cl"},
}

# (id, tipo, vendedor, precio_base, incremento, horas_restantes, item, posturas[(id_usuario, monto, min_atras)])
LOTES = [
    (1041, "vehiculo_completo", 2, 4200000, 50000, 52, {
        "vin_chasis": "JN1TBNT30Z0012345", "patente": "HJ-KL-45", "marca": "Nissan", "modelo": "Navara", "anio": 2019,
        "tipo_vehiculo": "camioneta", "nivel_danio": "medio", "kilometraje": 98000, "airbags": "Desplegados (2)",
        "documentacion": "Al día", "region_ubicacion": "Metropolitana",
        "descripcion_danio": "Volcamiento lateral con daño en techo y pilar B. Motor y caja operativos según prueba en frío.",
    }, [(1, 4200000, 900), (6, 4300000, 600), (1, 4350000, 300)]),
    (1042, "vehiculo_completo", 2, 1500000, 50000, 3.4, {
        "vin_chasis": "8AWCA41JX240998", "patente": "KB-XX-12", "marca": "Toyota", "modelo": "Yaris Sport", "anio": 2020,
        "tipo_vehiculo": "hatchback", "nivel_danio": "medio", "kilometraje": 45000, "airbags": "Desplegados (frontales)",
        "documentacion": "Al día", "region_ubicacion": "Valparaíso",
        "descripcion_danio": "Impacto frontal severo; deformación de radiador y tren delantero. Habitáculo y chasis sin daño estructural.",
    }, [(6, 1500000, 3000), (4, 1600000, 2400), (1, 1700000, 2000), (6, 1800000, 1500), (4, 2000000, 900),
        (1, 2100000, 600), (6, 2200000, 300), (4, 2300000, 120), (6, 2350000, 60), (4, 2400000, 33), (7, 2450000, 6)]),
    (1043, "pieza_desarme", 5, 180000, 10000, 26, {
        "nombre_pieza": "Culata de Motor 1.5L 1NZ-FE", "categoria": "motor", "marca": "Toyota",
        "compatibilidad": ["Toyota Yaris 2014-2022", "Toyota Etios"], "estado_desgaste": "operativo_verificado",
        "numero_parte_oem": "11101-21030", "region_ubicacion": "Valparaíso",
        "observaciones_tecnicas": "Desmontada de vehículo con daño trasero. Probada en banco hidráulico, sin fisuras.",
    }, [(7, 180000, 800), (4, 220000, 400), (1, 260000, 10)]),
    (1044, "vehiculo_completo", 2, 1900000, 50000, -20, {
        "vin_chasis": "KMHCT41DAEU512345", "patente": "GT-RS-88", "marca": "Hyundai", "modelo": "Accent", "anio": 2018,
        "tipo_vehiculo": "sedan", "nivel_danio": "leve", "kilometraje": 76000, "airbags": "Sin desplegar",
        "documentacion": "Al día", "region_ubicacion": "Metropolitana",
        "descripcion_danio": "Choque lateral izquierdo con abolladura de puertas y espejo. Mecánica sin daño.",
    }, [(4, 1900000, 4000), (7, 1950000, 3500), (4, 1980000, 3000), (7, 2100000, 2000)]),
    (1045, "vehiculo_completo", 2, 1200000, 50000, 70, {
        "vin_chasis": "9BD112000P882190", "patente": "PL-MN-21", "marca": "Chevrolet", "modelo": "Sail", "anio": 2019,
        "tipo_vehiculo": "sedan", "nivel_danio": "leve", "kilometraje": 61000, "airbags": "Sin desplegar",
        "documentacion": "Al día", "region_ubicacion": "Valparaíso",
        "descripcion_danio": "Raspadura lateral izquierda y puerta del conductor abollada.",
    }, []),
    (1046, "vehiculo_completo", 2, 900000, 50000, 8, {
        "vin_chasis": "KNABE511AGT123456", "patente": "FX-TT-10", "marca": "Kia", "modelo": "Morning", "anio": 2016,
        "tipo_vehiculo": "hatchback", "nivel_danio": "perdida_total", "kilometraje": 112000, "airbags": "Desplegados (4)",
        "documentacion": "Prenda vigente", "region_ubicacion": "Biobío",
        "descripcion_danio": "Pérdida total por incendio en vano motor. Carrocería trasera y llantas recuperables.",
    }, [(1, 900000, 500), (6, 950000, 200)]),
    (1047, "vehiculo_completo", 2, 2600000, 50000, 120, {
        "vin_chasis": "JSAZC72S5K0123456", "patente": "LL-PP-33", "marca": "Suzuki", "modelo": "Swift", "anio": 2022,
        "tipo_vehiculo": "hatchback", "nivel_danio": "leve", "kilometraje": 18000, "airbags": "Sin desplegar",
        "documentacion": "Al día", "region_ubicacion": "Coquimbo",
        "descripcion_danio": "Granizo severo en techo y capó. Parabrisas trizado. Mecánica intacta.",
    }, [(7, 2600000, 100)]),
    (1048, "pieza_desarme", 5, 350000, 10000, 40, {
        "nombre_pieza": "Caja de cambios manual 5V", "categoria": "transmision", "marca": "Hyundai",
        "compatibilidad": ["Hyundai Accent 2012-2019", "Kia Rio 2012-2017"], "estado_desgaste": "operativo_sin_probar",
        "numero_parte_oem": "43000-32843", "region_ubicacion": "Valparaíso",
        "observaciones_tecnicas": "Extraída de vehículo con daño frontal leve. Sin fugas visibles, sincronizados por verificar.",
    }, [(6, 350000, 700), (1, 370000, 350)]),
    (1049, "pieza_desarme", 5, 90000, 10000, 15, {
        "nombre_pieza": "Par de focos delanteros LED", "categoria": "electrico", "marca": "Chevrolet",
        "compatibilidad": ["Chevrolet Onix 2020-2023"], "estado_desgaste": "operativo_verificado",
        "numero_parte_oem": "52121433", "region_ubicacion": "Metropolitana",
        "observaciones_tecnicas": "Ambos focos encienden; mica derecha con rayas superficiales.",
    }, []),
    (1050, "vehiculo_completo", 2, 5200000, 50000, 96, {
        "vin_chasis": "MR0HA3CD5M0123456", "patente": "RT-YU-77", "marca": "Toyota", "modelo": "Hilux", "anio": 2021,
        "tipo_vehiculo": "camioneta", "nivel_danio": "medio", "kilometraje": 54000, "airbags": "Desplegados (2)",
        "documentacion": "Al día", "region_ubicacion": "Antofagasta",
        "descripcion_danio": "Impacto trasero con daño en pisadera, tapa de pick-up y eje trasero.",
    }, [(1, 5200000, 1000), (7, 5300000, 700), (6, 5400000, 400)]),
]


async def cargar() -> None:
    db = mongo.get_db()
    ahora = now()
    pwd = hash_password(PASSWORD)
    usuarios = {}
    for uid, cuerpo, nombre, comercial, email, rol, estado in USUARIOS:
        doc = {
            "_id": uid, "rut": rut(cuerpo), "nombre_completo": nombre, "email": email, "password_hash": pwd,
            "tipo_usuario": rol, "estado_cuenta": estado, "telefono": f"+569{uid}7654321"[:12],
            "fecha_registro": ahora - timedelta(days=60 - uid),
        }
        if comercial:
            doc["nombre_comercial"] = comercial
        usuarios[uid] = doc
    await db.usuarios.insert_many(list(usuarios.values()))

    id_postura = 500
    for sid, tipo, vend, base, inc, horas, item, posturas in LOTES:
        termino = ahora + timedelta(hours=horas)
        inicio = min(ahora - timedelta(days=3), termino - timedelta(days=4))
        item = {**item, "imagenes": []}
        recientes, docs_posturas = [], []
        lider = None
        for uid, monto, min_atras in posturas:
            id_postura += 1
            u = usuarios[uid]
            fecha = (termino if horas < 0 else ahora) - timedelta(minutes=min_atras)
            docs_posturas.append({
                "_id": id_postura, "subasta_id": sid,
                "comprador": {"_id": uid, "rut": u["rut"], "nombre_completo": u["nombre_completo"], "email": u["email"]},
                "monto_postura": float(monto), "fecha_hora_postura": fecha, "ip_origen": f"190.161.42.{10 + uid}",
            })
            recientes.insert(0, {"id_postura": id_postura, "monto": float(monto), "postor_alias": alias(u["nombre_completo"]), "fecha_hora": fecha})
            lider = {"_id": uid, "alias": alias(u["nombre_completo"])}
        if docs_posturas:
            await db.posturas.insert_many(docs_posturas)
        await db.subastas.insert_one({
            "_id": sid, "tipo_lote": tipo, "precio_base": float(base),
            "precio_actual": float(posturas[-1][1]) if posturas else float(base),
            "incremento_minimo": float(inc), "fecha_inicio": inicio, "fecha_termino": termino,
            "estado_subasta": "activa", "vendedor": VENDEDORES[vend], "postor_lider": lider, "item": item,
            "posturas_recientes": recientes[:5], "total_posturas": len(posturas),
        })

    await db.contadores.insert_many([
        {"_id": "usuarios", "seq": len(USUARIOS)},
        {"_id": "subastas", "seq": max(l[0] for l in LOTES)},
        {"_id": "posturas", "seq": id_postura},
    ])

    # Cierra las subastas vencidas (ej. #1044) y adjudica la primera para mostrar el flujo completo
    from app.services.adjudicacion_service import cerrar_expiradas

    await cerrar_expiradas()
    await db.subastas.update_one({"_id": 1044}, {"$set": {"estado_subasta": "adjudicada", "fecha_adjudicacion": ahora, "adjudicado_por": 3}})


async def seed_if_empty() -> bool:
    if await mongo.get_db().usuarios.count_documents({}) > 0:
        return False
    await cargar()
    print("✔ Datos de ejemplo cargados (contraseña de todas las cuentas: Subastas2026)")
    return True


async def _main() -> None:
    await mongo.connect()
    db = mongo.get_db()
    if "--reset" in sys.argv:
        for c in ("usuarios", "subastas", "posturas", "contadores"):
            await db[c].delete_many({})
        await mongo.create_indexes()
    if not await seed_if_empty():
        print("La base ya tiene datos. Usa --reset para recargar.")
    await mongo.close()


if __name__ == "__main__":
    asyncio.run(_main())
