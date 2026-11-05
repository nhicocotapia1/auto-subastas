"""Controlador del usuario autenticado: /api/v1/usuarios"""
from fastapi import APIRouter, Depends

from app.core.security import require_roles
from app.core.utils import to_json
from app.services import posturas_service

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("/me/posturas", summary="Q6 – Historial «Mis Pujas»")
async def mis_posturas(usuario: dict = Depends(require_roles("comprador"))):
    return to_json(await posturas_service.mis_pujas(usuario))
