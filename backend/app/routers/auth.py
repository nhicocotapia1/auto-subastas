"""Controlador de autenticación: /api/v1/auth"""
from fastapi import APIRouter, Depends, status

from app.core.rate_limit import limit_publico
from app.core.security import get_current_user
from app.core.utils import to_json
from app.schemas.usuario import LoginIn, RegistroIn, usuario_publico
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticación"], dependencies=[Depends(limit_publico)])


@router.post("/login", summary="Iniciar sesión y obtener JWT")
async def login(data: LoginIn):
    return to_json(await auth_service.login(data))


@router.post("/registro", status_code=status.HTTP_201_CREATED, summary="Crear cuenta de comprador")
async def registro(data: RegistroIn):
    return to_json(await auth_service.registrar(data))


@router.get("/me", summary="Perfil del usuario autenticado")
async def me(usuario: dict = Depends(get_current_user)):
    return to_json(usuario_publico(usuario))
