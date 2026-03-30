# Corte real de clima a Rust

Fecha: 2026-03-28

Objetivo:
- dejar `clima` apuntando a `backendrust` sin apagar el Nest original y con rollback inmediato

## Estado final

- codigo copiado a `/opt/apps/clima-portal/backendrust`
- proceso nuevo en PM2: `portal-clima-rust`
- proxy publico activo:
  - `/api-portal-clima/` -> `http://127.0.0.1:3125/api/`
- rollback disponible:
  - `/api-portal-clima-nest/` -> `http://127.0.0.1:3025/api/`

## Entorno usado

- `.env` Rust: `/opt/apps/clima-portal/backendrust/.env`
- base SQL Server: `climaBD`
- puertos:
  - Rust REST: `3125`
  - Rust gRPC: `50065`
  - Nest clima: `3025`

## SQL aplicado

- `sp_rust_migration_full.sql`
- `sp_parity_fixes.sql`

Resultado:
- `climaBD` paso de `87` a `129` procedures `_rust`

Advertencias que no bloquean este corte:
- faltan procedures base de modulos fuera de alcance actual:
  - `sp_Plan_Cerrar`
  - `sp_Marcaje_Admin_GestionGeocerca`
  - `sp_Marcaje_Admin_GestionIp`
  - `sp_campo_recorrido_activo`
  - `sp_campo_recorrido_puntos`
  - `sp_campo_recorrido_historial`
  - `sp_vc_cliente_crear`
  - `sp_vc_cliente_actualizar`
  - `sp_vc_cliente_eliminar`
  - `sp_vc_agenda_crear`
  - `sp_vc_agenda_reordenar`
  - `sp_vc_agenda_eliminar`
  - `sp_vc_meta_set`

## Validacion real

- `GET http://127.0.0.1:3125/health` -> `200`
- `POST http://127.0.0.1:3125/api/auth/login` -> `200`
- `POST https://127.0.0.1/api-portal-clima/auth/login` con `Host: www.rhclaroni.com` -> `200`
- `POST https://127.0.0.1/api-portal-clima-nest/auth/login` -> `200`
- `GET https://127.0.0.1/api-portal-clima/proyectos?limit=3` -> `200`

## Hallazgo clave

- el Nest real de `clima` seguia aceptando la clave maestra `123456`
- Rust no lo hacia al inicio
- la paridad de auth se corrigio portando esa compatibilidad al handler `auth_login`

## Operacion

- `portal-clima-api` se deja vivo como backend de rollback
- `portal-clima-rust` es ahora el backend activo por proxy publico
- `pm2 save` ya fue ejecutado
