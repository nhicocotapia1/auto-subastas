"""Punto de entrada de la API Auto-Subastas (FastAPI)."""
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.db import mongo
from app.routers import admin, auth, subastas, usuarios
from app.services.adjudicacion_service import loop_cierre

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await mongo.connect()
    if settings.SEED_ON_START:
        from scripts.seed import seed_if_empty

        await seed_if_empty()
    tarea = asyncio.create_task(loop_cierre(30))  # Proceso automático de cierre (RF05)
    yield
    tarea.cancel()
    await mongo.close()


app = FastAPI(
    title="Auto-Subastas API",
    version="1.0.0",
    description="API REST para la subasta de vehículos siniestrados y repuestos en desarme. ICI-324 – Universidad de Valparaíso.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.FRONTEND_ORIGIN.split(",")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
register_error_handlers(app)

API = "/api/v1"
app.include_router(auth.router, prefix=API)
app.include_router(subastas.router, prefix=API)
app.include_router(usuarios.router, prefix=API)
app.include_router(admin.router, prefix=API)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get(f"{API}/health", tags=["Sistema"])
async def health():
    return {"status": "ok"}


# Si existe el build del frontend (frontend/dist), se sirve desde el mismo servidor (útil para Railway)
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{ruta:path}", include_in_schema=False)
    async def spa(ruta: str):
        if ruta.startswith("api/"):
            from app.core.errors import not_found

            raise not_found("La ruta solicitada no existe en la API.")
        archivo = DIST / ruta
        if ruta and archivo.is_file():
            return FileResponse(archivo)
        return FileResponse(DIST / "index.html")
