"""Controlador de administración: /api/v1/admin

- Lotes (CRUD): vendedor_tasador (solo los suyos) y administrador.
- Usuarios, adjudicaciones y consultas: solo administrador.
"""
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from app.core.security import require_roles
from app.core.utils import to_json
from app.schemas.subasta import CATEGORIAS_PIEZA, ESTADOS_DESGASTE, REGIONES, TIPOS_VEHICULO, LoteIn, LoteUpdate
from app.schemas.usuario import UsuarioAdminUpdate
from app.services import adjudicacion_service, posturas_service, reportes_service, subastas_service, usuarios_service

router = APIRouter(prefix="/admin", tags=["Administración"])

gestor = require_roles("vendedor_tasador", "administrador")
admin = require_roles("administrador")


# ------------------------------ Lotes ------------------------------
@router.get("/catalogos", summary="Listas de valores para formularios")
async def catalogos(_: dict = Depends(gestor)):
    return {"regiones": REGIONES, "tipos_vehiculo": TIPOS_VEHICULO, "categorias_pieza": CATEGORIAS_PIEZA, "estados_desgaste": ESTADOS_DESGASTE}


@router.get("/lotes", summary="Listar lotes (propios o todos si es admin)")
async def listar_lotes(estado: str | None = None, usuario: dict = Depends(gestor)):
    return to_json(await subastas_service.listar_admin(usuario, estado))


@router.post("/lotes", status_code=status.HTTP_201_CREATED, summary="CU03 – Publicar nuevo lote")
async def crear_lote(data: LoteIn, usuario: dict = Depends(gestor)):
    return to_json(await subastas_service.crear_lote(data, usuario))


@router.patch("/lotes/{id_subasta}", summary="Editar parámetros del lote")
async def editar_lote(id_subasta: int, data: LoteUpdate, usuario: dict = Depends(gestor)):
    return to_json(await subastas_service.actualizar_lote(id_subasta, data, usuario))


@router.delete("/lotes/{id_subasta}", summary="Dar de baja (deshabilitación lógica)")
async def baja_lote(id_subasta: int, usuario: dict = Depends(gestor)):
    return to_json(await subastas_service.dar_de_baja(id_subasta, usuario))


@router.post("/lotes/{id_subasta}/imagenes", status_code=status.HTTP_201_CREATED, summary="Cargar fotos del peritaje")
async def subir_imagenes(
    id_subasta: int,
    archivos: list[UploadFile] = File(...),
    vistas: list[str] = Form(default=[]),
    usuario: dict = Depends(gestor),
):
    return to_json(await subastas_service.subir_imagenes(id_subasta, archivos, vistas, usuario))


@router.get("/lotes/{id_subasta}/posturas", summary="Q4 – Auditoría completa de posturas (con IP)")
async def auditoria(id_subasta: int, usuario: dict = Depends(gestor)):
    return to_json(await posturas_service.auditoria(id_subasta, usuario))


# ------------------------------ Usuarios ------------------------------
@router.get("/usuarios", summary="RF04 – Listar usuarios")
async def listar_usuarios(q: str | None = None, rol: str | None = None, estado: str | None = None, _: dict = Depends(admin)):
    return to_json(await usuarios_service.listar(q, rol, estado))


@router.patch("/usuarios/{id_usuario}", summary="RF04 – Modificar rol / suspender cuenta")
async def editar_usuario(id_usuario: int, data: UsuarioAdminUpdate, usuario: dict = Depends(admin)):
    return to_json(await usuarios_service.actualizar(id_usuario, data, usuario))


# ------------------------------ Adjudicaciones ------------------------------
@router.get("/adjudicaciones", summary="RF05 – Subastas cerradas")
async def adjudicaciones(_: dict = Depends(admin)):
    return to_json(await adjudicacion_service.listar())


@router.post("/subastas/{id_subasta}/cerrar", summary="Cerrar subasta anticipadamente")
async def cerrar(id_subasta: int, _: dict = Depends(admin)):
    return to_json(await adjudicacion_service.cerrar_ahora(id_subasta))


@router.post("/subastas/{id_subasta}/adjudicar", summary="RF05 – Adjudicación formal")
async def adjudicar(id_subasta: int, usuario: dict = Depends(admin)):
    return to_json(await adjudicacion_service.confirmar_adjudicacion(id_subasta, usuario))


# ------------------------------ Consultas (JOIN / operadores / GROUP BY) ------------------------------
@router.get("/reportes/actividad-lotes", summary="Posturas por lote ($group + $lookup)")
async def r_actividad(min_posturas: int = Query(1, ge=0, le=1000), _: dict = Depends(admin)):
    return to_json(await reportes_service.actividad_por_lote(min_posturas))


@router.get("/reportes/ranking-compradores", summary="Top compradores ($match $gte + $group + $lookup)")
async def r_ranking(dias: int = Query(30, ge=1, le=3650), _: dict = Depends(admin)):
    return to_json(await reportes_service.ranking_compradores(dias))


@router.get("/reportes/lotes-region", summary="Lotes por región ($in + $gte + $group)")
async def r_region(estados: str = "activa,finalizada,adjudicada", precio_min: int = Query(0, ge=0), _: dict = Depends(admin)):
    return to_json(await reportes_service.lotes_por_region([e for e in estados.split(",") if e], precio_min))


@router.get("/reportes/demanda-marca", summary="Demanda por marca ($gte/$lte + $group)")
async def r_marca(anio_min: int = Query(2000, ge=1980), anio_max: int = Query(2100, le=2100), _: dict = Depends(admin)):
    return to_json(await reportes_service.demanda_por_marca(anio_min, anio_max))


@router.get("/reportes/recaudacion-vendedor", summary="Recaudación por vendedor ($group + $lookup)")
async def r_vendedor(_: dict = Depends(admin)):
    return to_json(await reportes_service.recaudacion_por_vendedor())
