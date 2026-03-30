# Replica a clima-portal post-cierre

Fecha: 2026-03-28

Objetivo: documentar como llevar `backendrust` desde `porta-planer` a `clima-portal` sin repetir errores de entorno ni mezclar configuraciones entre clones.

## Regla base

- primero se cierra `backendrust` en `porta-planer`
- despues se replica a `clima-portal`
- no se usa el `.env` de planner dentro de clima

## Rutas confirmadas

- Rust fuente: `/opt/apps/porta-planer/backendrust`
- destino previsto: `/opt/apps/clima-portal/backendrust`
- Nest clima actual: `/opt/apps/clima-portal/clima-api-nest`
- `.env` de clima: `/opt/apps/clima-portal/clima-api-nest/.env`
- frontend clima: `/opt/apps/clima-portal/v2frontend`

## Hallazgos reales de clima ya confirmados

- el backend Nest de clima arranca por `process.env.PORT`
- hoy el `.env` de clima define `PORT=3025`
- clima tiene base SQL Server propia y `JWT_SECRET` propio
- clima tambien define `PORTAL_API_URL` y `CORS_ORIGIN` propios

## Reglas de migracion para este clon

1. copiar codigo Rust, no configuracion de planner
2. mapear variables desde el `.env` real de clima
3. dar a clima sus propios puertos de prueba
4. usar nombre PM2 distinto
5. usar ruta frontend/proxy de prueba distinta

## Propuesta inicial de puertos paralelos

- Nest clima actual: `3025`
- Rust REST de prueba: `3125`
- Rust gRPC de prueba: `50065`

Nota:
- esto es propuesta operativa inicial
- se valida ocupacion real de puertos antes de desplegar

## Checklist futuro

- copiar `backendrust` a `clima-portal`
- crear `.env` Rust basado en clima
- compilar y arrancar local
- registrar PM2 separado
- validar frontend de clima contra ruta de prueba
- comparar Nest clima vs Rust clima
- documentar diferencias y cierre

## Leccion que no se debe olvidar

- cuando un sistema es clon funcional de otro, el codigo puede reutilizarse
- el entorno no
- bases, puertos, JWT, urls portal, CORS, PM2 y Nginx deben tratarse como configuracion del sistema destino, no del sistema fuente

## Ejecucion real 2026-03-28

- copia realizada a `/opt/apps/clima-portal/backendrust`
- `.env` Rust creado desde `/opt/apps/clima-portal/clima-api-nest/.env`
- puertos usados:
  - Nest clima: `3025`
  - Rust clima REST: `3125`
  - Rust clima gRPC: `50065`
- PM2 nuevo: `portal-clima-rust`
- proxy publico movido:
  - `/api-portal-clima/` -> Rust `3125`
  - `/api-portal-clima-nest/` -> Nest `3025` como rollback

Hallazgos reales:
- `climaBD` ya tenia base funcional similar a planner y `87` procedures `_rust` antes del bootstrap
- despues de aplicar `sp_rust_migration_full.sql` y `sp_parity_fixes.sql`, `climaBD` quedo con `129` procedures `_rust`
- quedaron advertencias de dependencias faltantes solo en modulos fuera de alcance actual:
  - `sp_Plan_Cerrar`
  - `sp_Marcaje_Admin_GestionGeocerca`
  - `sp_Marcaje_Admin_GestionIp`
  - `sp_campo_recorrido_*`
  - `sp_vc_*`
- el corte inicial fallo en login porque Rust no habia portado la clave maestra `123456` que Nest aun usa como compatibilidad
- despues de portar esa regla, `POST /api-portal-clima/auth/login` quedo `200` por Nginx y tambien se valido el rollback Nest

Regla nueva de clonacion:
- antes de mover un clon a Rust, revisar siempre el `validateUser` del Nest desplegado y no solo la tabla `p_UsuariosCredenciales`
