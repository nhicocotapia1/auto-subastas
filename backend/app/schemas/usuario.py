"""Modelos Pydantic v2 de la colección usuarios."""
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")


def normalizar_rut(rut: str) -> str:
    """Valida un RUT chileno con dígito verificador (módulo 11) y lo devuelve como 12.345.678-9."""
    limpio = re.sub(r"[^0-9kK]", "", rut or "").upper()
    if len(limpio) < 8 or len(limpio) > 9:
        raise ValueError("El RUT no tiene un formato válido. Ejemplo: 12.345.678-9")
    cuerpo, dv = limpio[:-1], limpio[-1]
    if not cuerpo.isdigit():
        raise ValueError("El RUT no tiene un formato válido. Ejemplo: 12.345.678-9")
    suma, factor = 0, 2
    for d in reversed(cuerpo):
        suma += int(d) * factor
        factor = 2 if factor == 7 else factor + 1
    resto = 11 - (suma % 11)
    esperado = "0" if resto == 11 else "K" if resto == 10 else str(resto)
    if dv != esperado:
        raise ValueError("El dígito verificador del RUT no es correcto.")
    cuerpo_fmt = f"{int(cuerpo):,}".replace(",", ".")
    return f"{cuerpo_fmt}-{dv}"


def _validar_email(v: str) -> str:
    v = v.strip().lower()
    if not EMAIL_RE.match(v):
        raise ValueError("Ingresa un correo electrónico válido.")
    return v


class LoginIn(BaseModel):
    email: str = Field(..., max_length=120)
    password: str = Field(..., min_length=1, max_length=128)

    _e = field_validator("email")(_validar_email)


class RegistroIn(BaseModel):
    rut: str
    nombre_completo: str = Field(..., min_length=3, max_length=120)
    email: str = Field(..., max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    telefono: str | None = Field(None, max_length=20)

    _e = field_validator("email")(_validar_email)

    @field_validator("rut")
    @classmethod
    def _rut(cls, v: str) -> str:
        return normalizar_rut(v)

    @field_validator("nombre_completo")
    @classmethod
    def _nombre(cls, v: str) -> str:
        v = " ".join(v.split())
        if not re.fullmatch(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+", v):
            raise ValueError("El nombre solo puede contener letras y espacios.")
        return v

    @field_validator("password")
    @classmethod
    def _pwd(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("La contraseña debe tener al menos 8 caracteres, con letras y números.")
        return v

    @field_validator("telefono")
    @classmethod
    def _tel(cls, v: str | None) -> str | None:
        if v in (None, ""):
            return None
        limpio = re.sub(r"[\s-]", "", v)
        if not re.fullmatch(r"\+?\d{8,12}", limpio):
            raise ValueError("El teléfono debe tener entre 8 y 12 dígitos. Ejemplo: +56912345678")
        return limpio


class UsuarioAdminUpdate(BaseModel):
    estado_cuenta: Literal["activo", "suspendido"] | None = None
    tipo_usuario: Literal["comprador", "vendedor_tasador", "administrador"] | None = None
    nombre_completo: str | None = Field(None, min_length=3, max_length=120)
    telefono: str | None = None


def usuario_publico(u: dict) -> dict:
    """Nunca devuelve password_hash."""
    return {
        "id": u["_id"],
        "rut": u.get("rut"),
        "nombre": u.get("nombre_completo"),
        "nombre_comercial": u.get("nombre_comercial"),
        "email": u.get("email"),
        "rol": u.get("tipo_usuario"),
        "estado_cuenta": u.get("estado_cuenta"),
        "telefono": u.get("telefono"),
        "fecha_registro": u.get("fecha_registro"),
    }
