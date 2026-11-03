import asyncio
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Configuración de variables de entorno / URI de conexión
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "autosubastas")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    print(f"Conectando a MongoDB en: {MONGO_URI}...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    # 1. Limpiar colecciones previas para asegurar consistencia
    print("Limpiando colecciones anteriores...")
    await db.usuarios.drop()
    await db.subastas.drop()
    await db.posturas.drop()

    # ------------------------------------------------------------------
    # 2. COLECCIÓN: usuarios (RF06 - Autenticación y Perfiles)
    # ------------------------------------------------------------------
    print(" Insertando usuarios de prueba...")
    password_hash = pwd_context.hash("PasswordSegura123!")
    
    usuarios_data = [
        {
            "_id": 1,
            "rut": "17.890.123-4",
            "nombre_completo": "Gonzalo Morales Tapia",
            "email": "g.morales@correo.cl",
            "password_hash": password_hash,
            "tipo_usuario": "comprador",
            "estado_cuenta": "activo",
            "telefono": "+56976543210",
            "fecha_registro": datetime.utcnow()
        },
        {
            "_id": 2,
            "rut": "76.543.210-K",
            "nombre_completo": "Aseguradora del Sur S.A.",
            "email": "remates@aseguradoradelsur.cl",
            "password_hash": password_hash,
            "tipo_usuario": "vendedor_tasador",
            "estado_cuenta": "activo",
            "telefono": "+56912345678",
            "fecha_registro": datetime.utcnow()
        },
        {
            "_id": 7,
            "rut": "18.345.678-9",
            "nombre_completo": "Tomás Vera Muñoz",
            "email": "tomas.vera@correo.cl",
            "password_hash": password_hash,
            "tipo_usuario": "comprador",
            "estado_cuenta": "activo",
            "telefono": "+56987654321",
            "fecha_registro": datetime.utcnow()
        }
    ]
    await db.usuarios.insert_many(usuarios_data)

    # ------------------------------------------------------------------
    # 3. COLECCIÓN: subastas (Demostración de Polimorfismo + Subset)
    # ------------------------------------------------------------------
    print(" Insertando subastas con esquemas polimórficos...")
    
    subastas_data = [
        # Ejemplo A: Vehículo Completo Siniestrado
        {
            "_id": 1042,
            "tipo_lote": "vehiculo_completo",
            "precio_base": 1500000.00,
            "precio_actual": 2450000.00,
            "incremento_minimo": 50000.00,
            "fecha_inicio": datetime.utcnow() - timedelta(days=5),
            "fecha_termino": datetime.utcnow() + timedelta(days=2),
            "estado_subasta": "activa",
            "vendedor": {
                "_id": 2,
                "nombre_comercial": "Aseguradora del Sur S.A.",
                "email": "remates@aseguradoradelsur.cl"
            },
            "postor_lider": {
                "_id": 7,
                "alias": "T***e"
            },
            "item": {
                "vin_chasis": "8AWCA41JX240998",
                "patente": "KB-XX-12",
                "marca": "Toyota",
                "modelo": "Yaris Sport",
                "anio": 2020,
                "tipo_vehiculo": "sedan",
                "nivel_danio": "medio",
                "kilometraje": 45000,
                "region_ubicacion": "Valparaíso",
                "descripcion_danio": "Impacto frontal severo; deformación de radiador y tren delantero.",
                "imagenes": [
                    {"url_archivo": "/img/1042/portada.jpg", "tipo_vista": "frontal", "es_portada": True},
                    {"url_archivo": "/img/1042/motor.jpg", "tipo_vista": "motor", "es_portada": False}
                ]
            },
            "posturas_recientes": [
                {
                    "id_postura": 504,
                    "monto": 2450000.00,
                    "postor_alias": "T***e",
                    "fecha_hora": datetime.utcnow() - timedelta(minutes=4)
                },
                {
                    "id_postura": 503,
                    "monto": 2400000.00,
                    "postor_alias": "M***a",
                    "fecha_hora": datetime.utcnow() - timedelta(minutes=11)
                }
            ],
            "total_posturas": 12
        },
        # Ejemplo B: Repuesto/Pieza en Desarme
        {
            "_id": 1043,
            "tipo_lote": "pieza_desarme",
            "precio_base": 180000.00,
            "precio_actual": 260000.00,
            "incremento_minimo": 10000.00,
            "fecha_inicio": datetime.utcnow() - timedelta(days=3),
            "fecha_termino": datetime.utcnow() + timedelta(days=3),
            "estado_subasta": "activa",
            "vendedor": {
                "_id": 5,
                "nombre_comercial": "Desarmaduría Central Viña",
                "email": "ventas@centralvina.cl"
            },
            "postor_lider": {
                "_id": 1,
                "alias": "G***o"
            },
            "item": {
                "nombre_pieza": "Culata de Motor 1.5L 1NZ-FE",
                "categoria": "motor",
                "compatibilidad": ["Toyota Yaris 2014-2022", "Toyota Etios"],
                "estado_desgaste": "operativo_verificado",
                "numero_parte_oem": "11101-21030",
                "region_ubicacion": "Valparaíso",
                "observaciones_tecnicas": "Desmontada de vehículo con daño trasero. Probada en banco hidráulico.",
                "imagenes": [
                    {"url_archivo": "/img/1043/culata_1.jpg", "tipo_vista": "superior", "es_portada": True}
                ]
            },
            "posturas_recientes": [
                {
                    "id_postura": 510,
                    "monto": 260000.00,
                    "postor_alias": "G***o",
                    "fecha_hora": datetime.utcnow() - timedelta(minutes=20)
                }
            ],
            "total_posturas": 4
        }
    ]
    await db.subastas.insert_many(subastas_data)

    # ------------------------------------------------------------------
    # 4. COLECCIÓN: posturas (Auditoría e Historial Transaccional Q6)
    # ------------------------------------------------------------------
    print(" Insertando historial de posturas...")
    
    posturas_data = [
        {
            "_id": 504,
            "subasta_id": 1042,
            "comprador": {
                "_id": 7,
                "rut": "18.345.678-9",
                "nombre_completo": "Tomás Vera Muñoz",
                "email": "tomas.vera@correo.cl"
            },
            "monto_postura": 2450000.00,
            "fecha_hora_postura": datetime.utcnow() - timedelta(minutes=4),
            "ip_origen": "190.161.42.10"
        },
        {
            "_id": 510,
            "subasta_id": 1043,
            "comprador": {
                "_id": 1,
                "rut": "17.890.123-4",
                "nombre_completo": "Gonzalo Morales Tapia",
                "email": "g.morales@correo.cl"
            },
            "monto_postura": 260000.00,
            "fecha_hora_postura": datetime.utcnow() - timedelta(minutes=20),
            "ip_origen": "190.161.42.15"
        }
    ]
    await db.posturas.insert_many(posturas_data)

    # ------------------------------------------------------------------
    # 5. CREACIÓN DE ÍNDICES OPTIMIZADOS (Rúbrica Sección 5)
    # ------------------------------------------------------------------
    print(" Creando índices de soporte...")
    await db.subastas.create_index([
        ("estado_subasta", 1),
        ("item.tipo_vehiculo", 1),
        ("item.anio", 1)
    ])
    await db.posturas.create_index([
        ("comprador._id", 1),
        ("fecha_hora_postura", -1)
    ])

    print("\n Base de datos inicializada y cargada exitosamente en MongoDB.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())