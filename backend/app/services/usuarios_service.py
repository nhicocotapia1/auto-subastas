"""Mantenedor de usuarios (RF04)."""
from app.core.errors import bad_request, not_found
from app.repositories import usuarios_repo
from app.schemas.usuario import UsuarioAdminUpdate, usuario_publico


async def listar(q: str | None, rol: str | None, estado: str | None) -> list[dict]:
    return [usuario_publico(u) for u in await usuarios_repo.listar(q, rol, estado)]


async def actualizar(user_id: int, data: UsuarioAdminUpdate, admin: dict) -> dict:
    u = await usuarios_repo.find_by_id(user_id)
    if u is None:
        raise not_found(f"El usuario #{user_id} no existe.", "USUARIO_NO_ENCONTRADO")
    cambios = data.model_dump(exclude_none=True)
    if not cambios:
        raise bad_request("No enviaste ningún cambio para guardar.", "SIN_CAMBIOS")
    if user_id == admin["_id"] and (cambios.get("estado_cuenta") == "suspendido" or cambios.get("tipo_usuario", "administrador") != "administrador"):
        raise bad_request("No puedes suspender ni quitarte el rol de administrador a ti mismo.", "AUTO_MODIFICACION")
    actualizado = await usuarios_repo.update(user_id, cambios)
    accion = "suspendida" if cambios.get("estado_cuenta") == "suspendido" else "actualizada"
    return {"mensaje": f"Cuenta de {actualizado['nombre_completo']} {accion} correctamente.", "usuario": usuario_publico(actualizado)}
