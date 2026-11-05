"""Utilidades comunes: fechas en UTC y serialización de documentos BSON a JSON."""
from datetime import datetime, timezone


def now() -> datetime:
    """Fecha actual en UTC sin tzinfo (así la guarda y devuelve MongoDB)."""
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def to_json(valor):
    """Convierte recursivamente datetimes a ISO-8601 con sufijo Z."""
    if isinstance(valor, datetime):
        if valor.tzinfo is not None:
            valor = valor.astimezone(timezone.utc).replace(tzinfo=None)
        return valor.isoformat() + "Z"
    if isinstance(valor, dict):
        return {k: to_json(v) for k, v in valor.items() if k != "password_hash"}
    if isinstance(valor, list):
        return [to_json(v) for v in valor]
    return valor


def alias(nombre: str) -> str:
    """Anonimiza el nombre del postor para mostrarlo públicamente: 'Tomás' -> 'T***s'."""
    primero = (nombre or "?").split()[0]
    if len(primero) <= 2:
        return primero[0] + "***"
    return f"{primero[0]}***{primero[-1]}"


def clp(monto: float) -> str:
    return "$" + f"{int(round(monto)):,}".replace(",", ".")
