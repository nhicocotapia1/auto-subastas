"""Servicio de autenticación y registro (RF06)."""
from app.core.config import settings
from app.core.errors import ApiError, conflict, forbidden
from app.core.security import create_access_token, hash_password, verify_password
from app.core.utils import now
from app.repositories import usuarios_repo
from app.schemas.usuario import LoginIn, RegistroIn, usuario_publico


async def registrar(data: RegistroIn) -> dict:
    if await usuarios_repo.find_by_rut(data.rut):
        raise conflict("Ya existe una cuenta registrada con ese RUT.", "RUT_DUPLICADO")
    if await usuarios_repo.find_by_email(data.email):
        raise conflict("Este correo ya está registrado. ¿Quieres iniciar sesión?", "EMAIL_DUPLICADO")

    usuario = await usuarios_repo.insert({
        "rut": data.rut,
        "nombre_completo": data.nombre_completo,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "tipo_usuario": "comprador",
        "estado_cuenta": "activo",
        "telefono": data.telefono,
        "fecha_registro": now(),
    })
    return _sesion(usuario)


async def login(data: LoginIn) -> dict:
    usuario = await usuarios_repo.find_by_email(data.email)
    # Mismo mensaje para email inexistente o clave incorrecta (no revela qué correos existen)
    if usuario is None or not verify_password(data.password, usuario["password_hash"]):
        raise ApiError(401, "Correo o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.", "CREDENCIALES_INVALIDAS")
    if usuario.get("estado_cuenta") != "activo":
        raise forbidden("Tu cuenta se encuentra suspendida. Contacta al administrador.", "CUENTA_SUSPENDIDA")
    return _sesion(usuario)


def _sesion(usuario: dict) -> dict:
    return {
        "access_token": create_access_token(usuario),
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRE_MINUTES * 60,
        "usuario": usuario_publico(usuario),
    }
