"""Configuración central leída desde variables de entorno (.env)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class Settings:
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "auto_subastas")

    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-cambiar-en-produccion-0123456789abcdef")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    RATE_LIMIT_PUBLIC: int = int(os.getenv("RATE_LIMIT_PUBLIC", "120"))
    RATE_LIMIT_POSTURAS: int = int(os.getenv("RATE_LIMIT_POSTURAS", "10"))

    SEED_ON_START: bool = os.getenv("SEED_ON_START", "1") == "1"

    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_UPLOAD_MB: int = 10

    # Reglas de negocio (RF02)
    INCREMENTO_VEHICULO: float = 50000.0
    INCREMENTO_PIEZA: float = 10000.0


settings = Settings()
settings.UPLOAD_DIR.mkdir(exist_ok=True)
