"""Rate limiting simple en memoria con ventana deslizante de 60 s (sección 6.5 del informe).

- Endpoints públicos: RATE_LIMIT_PUBLIC solicitudes/minuto por IP.
- Endpoint de posturas: RATE_LIMIT_POSTURAS solicitudes/minuto por usuario autenticado.
"""
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import settings
from app.core.errors import ApiError

_ventanas: dict[str, deque] = defaultdict(deque)


def _check(clave: str, limite: int) -> None:
    ahora = time.monotonic()
    cola = _ventanas[clave]
    while cola and ahora - cola[0] > 60:
        cola.popleft()
    if len(cola) >= limite:
        espera = int(60 - (ahora - cola[0])) + 1
        raise ApiError(
            429,
            f"Superaste el límite de {limite} solicitudes por minuto. Intenta nuevamente en {espera} s.",
            "LIMITE_EXCEDIDO",
            {"Retry-After": str(espera)},
        )
    cola.append(ahora)


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "desconocida"


async def limit_publico(request: Request) -> None:
    _check(f"ip:{client_ip(request)}", settings.RATE_LIMIT_PUBLIC)


def limit_posturas(user_id: int) -> None:
    _check(f"postura:{user_id}", settings.RATE_LIMIT_POSTURAS)


def reset() -> None:
    _ventanas.clear()
