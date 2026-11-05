"""Errores de negocio y manejadores globales.

Todas las respuestas de error siguen el formato documentado en el informe (sección 6.4):
{ "status_code": 400, "error": "Bad Request", "codigo_interno": "...", "message": "..." }
"""
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError, PyMongoError
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status_code: int, message: str, codigo_interno: str | None = None, headers: dict | None = None):
        self.status_code = status_code
        self.message = message
        self.codigo_interno = codigo_interno
        self.headers = headers


# Atajos para que los servicios lancen errores con semántica clara
def bad_request(msg: str, codigo: str = "REGLA_NEGOCIO") -> ApiError:
    return ApiError(400, msg, codigo)


def unauthorized(msg: str = "Debes iniciar sesión para realizar esta acción.", codigo: str = "NO_AUTENTICADO") -> ApiError:
    return ApiError(401, msg, codigo, {"WWW-Authenticate": "Bearer"})


def forbidden(msg: str = "No tienes permisos para realizar esta acción.", codigo: str = "PERMISO_DENEGADO") -> ApiError:
    return ApiError(403, msg, codigo)


def not_found(msg: str, codigo: str = "NO_ENCONTRADO") -> ApiError:
    return ApiError(404, msg, codigo)


def conflict(msg: str, codigo: str = "CONFLICTO") -> ApiError:
    return ApiError(409, msg, codigo)


def _body(status: int, message: str, codigo: str | None = None, detalles=None) -> dict:
    body = {
        "status_code": status,
        "error": HTTPStatus(status).phrase,
        "message": message,
    }
    if codigo:
        body["codigo_interno"] = codigo
    if detalles:
        body["detalles"] = detalles
    return body


_CAMPOS = {
    "email": "correo electrónico", "password": "contraseña", "rut": "RUT",
    "nombre_completo": "nombre completo", "monto_ofertado": "monto ofertado",
    "precio_base": "precio base", "incremento_minimo": "incremento mínimo",
    "vin_chasis": "VIN / chasis", "anio": "año", "nivel_danio": "nivel de daño",
    "descripcion_danio": "descripción del peritaje", "observaciones_tecnicas": "observaciones técnicas",
    "nombre_pieza": "nombre de la pieza", "region_ubicacion": "región", "duracion_horas": "duración",
    "estado_desgaste": "estado de desgaste", "telefono": "teléfono", "modelo": "modelo", "marca": "marca",
}


def _traducir(e: dict) -> str:
    """Mensajes de Pydantic en español."""
    tipo, ctx = e.get("type", ""), e.get("ctx", {}) or {}
    traducciones = {
        "missing": "campo obligatorio",
        "string_too_short": f"debe tener al menos {ctx.get('min_length')} caracteres",
        "string_too_long": f"debe tener como máximo {ctx.get('max_length')} caracteres",
        "greater_than": f"debe ser mayor que {ctx.get('gt')}",
        "greater_than_equal": f"debe ser mayor o igual a {ctx.get('ge')}",
        "less_than_equal": f"debe ser menor o igual a {ctx.get('le')}",
        "int_parsing": "debe ser un número entero",
        "float_parsing": "debe ser un número",
        "int_type": "debe ser un número entero",
        "float_type": "debe ser un número",
        "string_type": "debe ser texto",
        "literal_error": f"valor no permitido (opciones: {ctx.get('expected')})",
        "json_invalid": "el cuerpo JSON no es válido",
        "model_attributes_type": "formato inválido",
        "dict_type": "debe ser un objeto",
        "list_type": "debe ser una lista",
    }
    if tipo in traducciones:
        return traducciones[tipo]
    return e.get("msg", "valor inválido").replace("Value error, ", "")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error_handler(_: Request, exc: ApiError):
        return JSONResponse(status_code=exc.status_code, content=_body(exc.status_code, exc.message, exc.codigo_interno), headers=exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_: Request, exc: StarletteHTTPException):
        msg = exc.detail if isinstance(exc.detail, str) else "Error en la solicitud."
        if exc.status_code == 404 and msg == "Not Found":
            msg = "La ruta solicitada no existe en la API."
        if exc.status_code == 405:
            msg = "Método HTTP no permitido para esta ruta."
        return JSONResponse(status_code=exc.status_code, content=_body(exc.status_code, msg))

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        detalles = []
        for e in exc.errors():
            loc = [str(p) for p in e.get("loc", []) if p not in ("body", "query", "path")]
            campo = loc[-1] if loc else "solicitud"
            msg = _traducir(e)
            detalles.append({"campo": ".".join(loc) or campo, "mensaje": msg})
        primero = detalles[0] if detalles else {"campo": "solicitud", "mensaje": "inválido"}
        nombre = _CAMPOS.get(primero["campo"].split(".")[-1], primero["campo"])
        return JSONResponse(
            status_code=422,
            content=_body(422, f"Dato inválido en '{nombre}': {primero['mensaje']}", "VALIDACION", detalles),
        )

    @app.exception_handler(DuplicateKeyError)
    async def duplicate_handler(_: Request, exc: DuplicateKeyError):
        texto = str(exc)
        if "rut" in texto:
            msg = "Ya existe una cuenta registrada con ese RUT."
        elif "email" in texto:
            msg = "Este correo ya está registrado. ¿Quieres iniciar sesión?"
        elif "vin_chasis" in texto:
            msg = "Ya existe un lote con ese VIN / número de chasis."
        else:
            msg = "El registro ya existe en el sistema."
        return JSONResponse(status_code=409, content=_body(409, msg, "DUPLICADO"))

    @app.exception_handler(PyMongoError)
    async def mongo_handler(_: Request, exc: PyMongoError):
        return JSONResponse(status_code=503, content=_body(503, "La base de datos no está disponible en este momento. Intenta nuevamente.", "BD_NO_DISPONIBLE"))

    @app.exception_handler(Exception)
    async def generic_handler(_: Request, exc: Exception):
        return JSONResponse(status_code=500, content=_body(500, "Ocurrió un error interno inesperado.", "ERROR_INTERNO"))
