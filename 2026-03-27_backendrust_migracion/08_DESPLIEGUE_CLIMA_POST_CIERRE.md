# Despliegue Clima Post-Cierre

Fecha: 2026-03-28

Objetivo: dejar definido el pase de `backendrust` a `clima-portal` para ejecutarlo solo despues de cerrar `porta-planer` al `100%`.

## Regla de activacion

- este paso no corre ahora
- solo inicia cuando `backendrust` ya este certificado en `porta-planer`
- primero se cierra paridad REST principal, luego se replica a clima

## Fuente y destino

- fuente Rust: `/opt/apps/porta-planer/backendrust`
- destino previsto: `/opt/apps/clima-portal/backendrust`
- backend Nest actual de clima: `/opt/apps/clima-portal/clima-api-nest`
- frontend de clima: `/opt/apps/clima-portal/v2frontend`

## Regla de configuracion

- no copiar el `.env` de `porta-planer`
- usar como base el `.env` de clima en `/opt/apps/clima-portal/clima-api-nest/.env`
- mapear a Rust las variables propias de clima:
- SQL Server de clima
- `JWT_SECRET`
- `PORTAL_API_URL`
- `CORS_ORIGIN`
- correo/smtp

## Puertos

- Nest de clima hoy usa `PORT=3025`
- para prueba paralela, la propuesta inicial es:
- Rust REST: `3125`
- Rust gRPC: `50065`
- los puertos definitivos se confirman en el momento del despliegue segun ocupacion real del VPS

## Flujo previsto

1. copiar `backendrust` de `porta-planer` a `/opt/apps/clima-portal/backendrust`
2. ajustar `.env` de Rust usando el entorno real de clima
3. validar compilacion y arranque local
4. registrar proceso separado en PM2
5. montar frontend o ruta de prueba de clima apuntando a Rust
6. comparar Nest clima vs Rust clima
7. documentar diferencias especificas de clima antes del corte

## Reglas para no tropezar

- no reutilizar nombres de PM2 de `porta-planer`
- no reutilizar proxies ni rutas de Nginx de `porta-planer`
- no asumir que `PORTAL_API_URL` o JWT de clima son iguales a planner
- no cortar el frontend principal de clima sin prueba paralela

## Cierre documental esperado

Cuando este paso se ejecute de verdad, debe dejar:

- puertos reales usados
- nombre PM2 real
- variables de entorno mapeadas
- rutas proxy/frontend de prueba
- diferencias de contrato si aparecen
- lecciones nuevas en `/root/rust`
