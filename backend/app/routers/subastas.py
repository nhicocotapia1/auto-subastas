"""Controlador público de subastas: /api/v1/subastas"""
from fastapi import APIRouter, Depends, Query, Request, status

from app.core.rate_limit import client_ip, limit_publico
from app.core.security import require_roles
from app.core.utils import to_json
from app.schemas.subasta import PosturaIn
from app.services import posturas_service, subastas_service

router = APIRouter(prefix="/subastas", tags=["Subastas"])


def _lista(valor: str | None) -> list[str]:
    return [v.strip() for v in valor.split(",") if v.strip()] if valor else []


@router.get("", summary="Q1 – Catálogo con filtros multicriterio", dependencies=[Depends(limit_publico)])
async def catalogo(
    categoria: str = Query("todos", description="todos | vehiculo_completo | pieza_desarme"),
    anio_min: int | None = Query(None, ge=1980, le=2100),
    anio_max: int | None = Query(None, ge=1980, le=2100),
    marca: str | None = Query(None, description="Marcas separadas por coma"),
    nivel_danio: str | None = Query(None, description="leve,medio,perdida_total"),
    region: str | None = Query(None, description="Regiones separadas por coma"),
    solo_activas: bool = True,
    q: str | None = Query(None, max_length=60),
    orden: str = "termina_pronto",
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
):
    res = await subastas_service.catalogo(
        categoria, anio_min, anio_max, _lista(marca), _lista(nivel_danio), _lista(region),
        solo_activas, q, orden, page, limit,
    )
    return to_json(res)


@router.get("/filtros", summary="Valores disponibles para los filtros", dependencies=[Depends(limit_publico)])
async def filtros():
    return to_json(await subastas_service.opciones_filtros())


@router.get("/{id_subasta}", summary="Q2 – Detalle del lote y peritaje", dependencies=[Depends(limit_publico)])
async def detalle(id_subasta: int):
    return to_json(await subastas_service.detalle(id_subasta))


@router.post("/{id_subasta}/posturas", status_code=status.HTTP_201_CREATED, summary="Q3 – Emitir postura (rol comprador)")
async def postura(id_subasta: int, data: PosturaIn, request: Request, usuario: dict = Depends(require_roles("comprador"))):
    return to_json(await posturas_service.emitir_postura(id_subasta, data.monto_ofertado, usuario, client_ip(request)))
