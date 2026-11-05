# Auto-Subastas

Plataforma web para la subasta de vehículos siniestrados y repuestos en desarme.
**ICI-324 Bases de Datos y Programación Web – Universidad de Valparaíso**
Integrantes: Nicolás Tapia, Benjamín Díaz · Profesor: Benjamín Serrano Barba

| Capa | Tecnología |
|------|------------|
| Backend | Python 3.11 + FastAPI (arquitectura por capas: routers → services → repositories) |
| Base de datos | MongoDB 7 (Atlas o local) con driver asíncrono Motor + validación Pydantic v2 |
| Frontend | SPA React + TypeScript + Tailwind CSS (Vite) |
| Seguridad | JWT HS256 (60 min), bcrypt cost 12, CORS restringido, rate limiting |
| Despliegue | Docker (Railway) |

---

## Estructura del proyecto

```
auto-subastas/
├── backend/
│   ├── app/
│   │   ├── main.py              # Punto de entrada FastAPI
│   │   ├── core/                # Configuración, seguridad (JWT/bcrypt), errores, rate limit
│   │   ├── db/mongo.py          # Conexión Motor + índices
│   │   ├── schemas/             # Modelos Pydantic (usuarios, subastas polimórficas)
│   │   ├── repositories/        # Acceso a datos (usuarios, subastas, posturas)
│   │   ├── services/            # Reglas de negocio (auth, subastas, posturas, adjudicación, reportes)
│   │   └── routers/             # Controladores HTTP (/auth, /subastas, /usuarios, /admin)
│   ├── scripts/seed.py          # Datos de ejemplo
│   ├── uploads/                 # Fotos subidas de los lotes
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/               # Una pantalla por archivo (orden del informe)
│       │   ├── Catalogo.tsx         # 1. Catálogo con filtros (Fig. 4 y 11)
│       │   ├── DetalleLote.tsx      # 2. Ficha técnica y puja + modal (Fig. 5, 6 y 12)
│       │   ├── Login.tsx            # 3. Inicio de sesión y registro (Fig. 7)
│       │   ├── MisPujas.tsx         # 4. Historial «Mis Pujas» (Fig. 8)
│       │   ├── PublicarLote.tsx     # 5. Publicar lote CU03 (Fig. 10)
│       │   └── admin/               # 6-9. Panel: Lotes (Fig. 9), Usuarios, Adjudicaciones, Consultas
│       ├── components/          # layout/, ui/ y subastas/ (componentes reutilizables)
│       ├── services/api.ts      # Cliente de la API REST
│       ├── context/             # Sesión (AuthContext) y notificaciones (ToastContext)
│       ├── lib/                 # Formatos, validación de RUT, informe pericial
│       └── types/               # Tipos TypeScript de los contratos JSON
└── Dockerfile
```

Colores del sistema de diseño (sección 7.1 del informe), definidos en `frontend/tailwind.config.js`:
azul marino `#0F2C59` (primario), verde `#16A34A` (éxito / daño leve), ámbar `#D97706` (daño medio), carmesí `#DC2626` (pérdida total). Tipografía Inter.

---

## Cómo ejecutarlo en local

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    |   Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # en Windows: copy .env.example .env
```

Edita `.env` y pon tu cadena de MongoDB en `MONGO_URI`:
- **MongoDB Atlas:** `mongodb+srv://usuario:clave@cluster0.xxxxx.mongodb.net`
- **MongoDB local:** `mongodb://localhost:27017`
- **Sin MongoDB (solo para probar):** `mock://` → base en memoria, se borra al reiniciar.

```bash
uvicorn app.main:app --reload --port 8000
```

Al primer arranque se cargan datos de ejemplo automáticamente. Para recargarlos: `python -m scripts.seed --reset`.
Documentación interactiva de la API (Swagger): http://localhost:8000/docs

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 (Vite redirige `/api` y `/uploads` al backend).

### Cuentas de demostración (contraseña: `Subastas2026`)

| Rol | Correo |
|-----|--------|
| Comprador | g.morales@correo.cl · tomas.vera@correo.cl · camila.rojas@correo.cl |
| Vendedor / Tasador | remates@aseguradoradelsur.cl · ventas@centralvina.cl |
| Administrador | admin@autosubastas.cl |
| Cuenta suspendida (para mostrar el error 403) | felipe.contreras@correo.cl |

---

## Endpoints principales (`/api/v1`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/auth/login` | Público | Inicia sesión, devuelve JWT |
| POST | `/auth/registro` | Público | Crea cuenta de comprador (valida RUT) |
| GET | `/auth/me` | Autenticado | Perfil actual |
| GET | `/subastas` | Público | Q1 catálogo: `categoria, anio_min, anio_max, marca, nivel_danio, region, solo_activas, q, orden, page, limit` |
| GET | `/subastas/filtros` | Público | Marcas, regiones y años disponibles |
| GET | `/subastas/{id}` | Público | Q2 ficha técnica + últimas 5 posturas (Subset Pattern) |
| POST | `/subastas/{id}/posturas` | Comprador | Q3 emitir postura (actualización atómica) |
| GET | `/usuarios/me/posturas` | Comprador | Q6 «Mis Pujas» |
| GET/POST | `/admin/lotes` | Vendedor/Admin | Listar / publicar lote (CU03) |
| PATCH/DELETE | `/admin/lotes/{id}` | Vendedor/Admin | Editar / dar de baja (lógica) |
| POST | `/admin/lotes/{id}/imagenes` | Vendedor/Admin | Subir fotos (multipart) |
| GET | `/admin/lotes/{id}/posturas` | Vendedor/Admin | Q4 auditoría con IP |
| GET/PATCH | `/admin/usuarios[/{id}]` | Admin | Listar, cambiar rol, suspender |
| GET | `/admin/adjudicaciones` | Admin | Remates cerrados |
| POST | `/admin/subastas/{id}/cerrar` · `/adjudicar` | Admin | Cierre anticipado / adjudicación formal |
| GET | `/admin/reportes/{nombre}` | Admin | Consultas con `$lookup`, operadores y `$group` |

Todos los errores usan el formato `{ status_code, error, codigo_interno, message }` con los códigos 400, 401, 403, 404, 409, 422, 429 y 503, y el frontend los muestra al usuario.

## Consultas (rúbrica: JOIN, operadores y GROUP BY)

En **Panel de control → Consultas** (cuenta admin) se ejecutan y presentan 5 consultas, mostrando el resultado, el pipeline MQL ejecutado y su equivalente SQL:

1. Actividad por lote – `$group` + `$lookup` + `$match/$gte` (HAVING)
2. Ranking de compradores – `$match/$gte` + `$group` + `$lookup` + `$limit`
3. Lotes por región – `$in` + `$gte` + `$group` compuesto
4. Demanda por marca – `$gte/$lte` (BETWEEN) + `$ne` + `$group`
5. Recaudación por vendedor – `$in` + `$group/$sum/$subtract` + `$lookup`

«Mis Pujas» también usa `$group` + `$lookup` en vivo.

## Despliegue en Railway

1. Sube el repositorio a GitHub y crea un proyecto en Railway desde el repo (usa el `Dockerfile`).
2. Variables de entorno: `MONGO_URI`, `MONGO_DB`, `JWT_SECRET`, `FRONTEND_ORIGIN` (la URL pública de Railway).
3. El mismo contenedor sirve la API y el frontend compilado.
