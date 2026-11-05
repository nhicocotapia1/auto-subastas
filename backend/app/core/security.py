"""Seguridad: hash de contraseñas con bcrypt (cost 12) y JWT HS256 (RF06 / RNF03)."""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.errors import forbidden, unauthorized
from app.repositories import usuarios_repo

ROLES = ("comprador", "vendedor_tasador", "administrador")

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(usuario: dict) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario["_id"]),
        "rol": usuario["tipo_usuario"],
        "iat": ahora,
        "exp": ahora + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(request: Request, cred: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if cred is None or cred.scheme.lower() != "bearer":
        raise unauthorized("Token ausente. Inicia sesión para continuar.", "TOKEN_AUSENTE")
    try:
        payload = jwt.decode(cred.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise unauthorized("Tu sesión expiró. Vuelve a iniciar sesión.", "TOKEN_EXPIRADO")
    except jwt.InvalidTokenError:
        raise unauthorized("Token inválido o con firma alterada.", "TOKEN_INVALIDO")

    usuario = await usuarios_repo.find_by_id(int(payload["sub"]))
    if usuario is None:
        raise unauthorized("La cuenta asociada al token ya no existe.", "USUARIO_INEXISTENTE")
    if usuario.get("estado_cuenta") != "activo":
        raise forbidden("Tu cuenta se encuentra suspendida. Contacta al administrador.", "CUENTA_SUSPENDIDA")
    request.state.user_id = usuario["_id"]
    return usuario


async def get_optional_user(request: Request, cred: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict | None:
    if cred is None:
        return None
    try:
        return await get_current_user(request, cred)
    except Exception:
        return None


def require_roles(*roles: str):
    async def checker(usuario: dict = Depends(get_current_user)) -> dict:
        if usuario["tipo_usuario"] not in roles:
            nombres = " o ".join(r.replace("_", "/") for r in roles)
            raise forbidden(f"Esta acción requiere rol {nombres}.")
        return usuario

    return checker
