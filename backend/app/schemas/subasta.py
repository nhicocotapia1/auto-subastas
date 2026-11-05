"""Modelos Pydantic v2 de la colección subastas (con objeto item polimórfico)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

TipoLote = Literal["vehiculo_completo", "pieza_desarme"]
NivelDanio = Literal["leve", "medio", "perdida_total"]
REGIONES = [
    "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso",
    "Metropolitana", "O'Higgins", "Maule", "Ñuble", "Biobío", "Araucanía", "Los Ríos",
    "Los Lagos", "Aysén", "Magallanes",
]
TIPOS_VEHICULO = ["sedan", "hatchback", "suv", "camioneta", "furgon", "moto"]
CATEGORIAS_PIEZA = ["motor", "transmision", "carroceria", "suspension", "electrico", "interior", "otro"]
ESTADOS_DESGASTE = ["operativo_verificado", "operativo_sin_probar", "para_reparar"]


class ItemVehiculo(BaseModel):
    vin_chasis: str = Field(..., min_length=11, max_length=17)
    patente: str | None = Field(None, max_length=10)
    marca: str = Field(..., min_length=2, max_length=40)
    modelo: str = Field(..., min_length=1, max_length=60)
    anio: int = Field(..., ge=1980, le=datetime.now().year + 1)
    tipo_vehiculo: str = "sedan"
    nivel_danio: NivelDanio
    kilometraje: int | None = Field(None, ge=0, le=2_000_000)
    airbags: str | None = Field(None, max_length=60)
    documentacion: str | None = Field(None, max_length=60)
    region_ubicacion: str
    descripcion_danio: str = Field(..., min_length=10, max_length=1500)

    @field_validator("vin_chasis")
    @classmethod
    def _vin(cls, v: str) -> str:
        v = v.strip().upper()
        if not v.isalnum():
            raise ValueError("El VIN solo puede contener letras y números.")
        return v

    @field_validator("tipo_vehiculo")
    @classmethod
    def _tipo(cls, v: str) -> str:
        if v not in TIPOS_VEHICULO:
            raise ValueError(f"Tipo de vehículo inválido. Opciones: {', '.join(TIPOS_VEHICULO)}")
        return v

    @field_validator("region_ubicacion")
    @classmethod
    def _region(cls, v: str) -> str:
        if v not in REGIONES:
            raise ValueError("Región no válida.")
        return v


class ItemPieza(BaseModel):
    nombre_pieza: str = Field(..., min_length=3, max_length=100)
    categoria: str
    marca: str = Field(..., min_length=2, max_length=40, description="Marca del vehículo de origen")
    compatibilidad: list[str] = Field(default_factory=list, max_length=15)
    estado_desgaste: str
    numero_parte_oem: str | None = Field(None, max_length=40)
    region_ubicacion: str
    observaciones_tecnicas: str = Field(..., min_length=10, max_length=1500)

    @field_validator("categoria")
    @classmethod
    def _cat(cls, v: str) -> str:
        if v not in CATEGORIAS_PIEZA:
            raise ValueError(f"Categoría de pieza inválida. Opciones: {', '.join(CATEGORIAS_PIEZA)}")
        return v

    @field_validator("estado_desgaste")
    @classmethod
    def _des(cls, v: str) -> str:
        if v not in ESTADOS_DESGASTE:
            raise ValueError("Estado de desgaste inválido.")
        return v

    @field_validator("region_ubicacion")
    @classmethod
    def _region(cls, v: str) -> str:
        if v not in REGIONES:
            raise ValueError("Región no válida.")
        return v


class LoteIn(BaseModel):
    tipo_lote: TipoLote
    precio_base: float = Field(..., gt=0, le=500_000_000)
    incremento_minimo: float | None = Field(None, gt=0)
    duracion_horas: int = Field(72, ge=1, le=24 * 30)
    item: dict

    @model_validator(mode="after")
    def _validar_item(self):
        # Polimorfismo: el contenido de item depende de tipo_lote
        modelo = ItemVehiculo if self.tipo_lote == "vehiculo_completo" else ItemPieza
        self.item = modelo.model_validate(self.item).model_dump()
        return self


class LoteUpdate(BaseModel):
    precio_base: float | None = Field(None, gt=0)
    incremento_minimo: float | None = Field(None, gt=0)
    extender_horas: int | None = Field(None, ge=1, le=24 * 30)
    item: dict | None = None


class PosturaIn(BaseModel):
    monto_ofertado: float = Field(..., gt=0, le=1_000_000_000)
