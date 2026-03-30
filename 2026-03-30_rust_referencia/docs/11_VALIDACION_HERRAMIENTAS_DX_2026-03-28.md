# Validacion de Herramientas DX y Claims Externos

Fecha: 2026-03-28

Objetivo: separar lo que realmente esta confirmado por documentacion oficial de lo que esta exagerado, incompleto o no aplica al proyecto `backendrust`.

## Veredicto corto

- `Bacon`: si, util.
- `mold`: si, muy util en Linux si el linker actual es cuello de botella.
- `sccache`: si, util sobre todo en CI, Docker o builds repetidos.
- `Axum + Tower`: si, confirmado y ya es la linea correcta del proyecto.
- `Loco`: real y util para proyectos nuevos; no es la herramienta correcta para reescribir este proyecto ya empezado.
- `SeaORM`: real y productivo, pero no es la mejor salida para este proyecto con SQL Server.
- `SQLx`: muy util en Postgres/MySQL/SQLite; no es la apuesta correcta aqui porque MSSQL fue removido desde `0.7` y sigue fuera en `0.8`.
- `cargo-shuttle`: real y util para deploy rapido; no es una mejora directa para este VPS ni para este backend actual.
- `cargo-leptos`: real, pero enfocado a apps web con Leptos; no aplica como acelerador general de `backendrust`.
- `PyO3`: real y potente, pero no resuelve el cuello de botella principal de esta migracion.
- `inline-python`: no quedo validado como pieza relevante para recomendar hoy en este proyecto.
- `async fn` en traits: si, ya es parte del lenguaje desde Rust `1.75`.
- `async iterators estabilizados`: no lo tomo como claim fuerte confirmado para justificar un cambio de arquitectura en este proyecto.
- `Dyrek`: no quedo validado como opcion dominante o relevante para este stack.

## Lo que si sirve de verdad para este VPS

### 1. Bacon

- da feedback rapido sin lanzar `cargo check` manual cada vez.
- sirve mucho en este VPS cuando se esta iterando handlers, modelos y serializacion.
- recomendacion: usarlo como companero de `cargo check`, no como reemplazo del build real.
- en `backendrust` ya queda mejor aprovechado con `bacon.toml` compartido en el repo.
- correcciones a la receta propuesta:
- la propiedad valida es `on_change_strategy`, no `on_change`
- `F5` es el refresh por defecto; si se quiere `r`, hay que bindearlo
- `bacon` no valida solo los SPs en runtime; para eso siguen siendo necesarias pruebas de integracion o compare vivo

### 2. mold

- en Linux si puede ayudar a bajar el tiempo final de linkeo.
- tiene sentido probarlo aqui si los builds completos siguen siendo un cuello de botella frecuente.
- prioridad: media. Ayuda al ciclo de build, pero no arregla paridad funcional ni SQL Server.

### 3. sccache

- vale la pena si se van a repetir builds, CI o imagenes Docker.
- para trabajo local puro en este VPS ayuda menos que corregir la arquitectura SQL y los SP faltantes.

### 4. Axum

- sigue siendo la decision correcta para `backendrust`.
- el beneficio no es teorico: ya esta integrado con Tokio y el resto del stack real del proyecto.

## Lo que NO cambia la decision del proyecto

### Loco

- Loco existe y acelera proyectos nuevos con enfoque estilo Rails.
- no conviene meterlo en medio de una migracion viva NestJS -> Rust ya avanzada con Axum, Tiberius y SQL Server.

### SeaORM

- sirve para generar entidades y acelerar CRUD.
- problema real aqui: el proyecto esta orientado a `stored procedures`, SQL Server y paridad exacta contra una base existente.
- por eso no lo veo como mejora principal para este caso.

### SQLx

- el claim de usar SQLx como gran acelerador aqui no aplica.
- la documentacion oficial actual de `sqlx 0.8` dice que MSSQL fue removido y queda pendiente de reescritura.
- conclusion: para este proyecto la linea correcta sigue siendo `Tiberius + bb8-tiberius`.

### cargo-shuttle y cargo-leptos

- ambos son reales.
- `cargo-shuttle` ayuda a deployar en la plataforma Shuttle.
- `cargo-leptos` ayuda a apps construidas con Leptos.
- ninguno de los dos es el acelerador central para este backend en este VPS Ubuntu 20.04 con SQL Server local.

### PyO3

- es real y muy util si hay que integrar IA, Python o librerias existentes.
- no es la solucion del cuello de botella actual, que sigue siendo:
- paridad HTTP
- side effects SQL
- procedures faltantes
- mapeo exacto de datos

## Lo que le falta al ecosistema Rust para que esto fuera mas facil

- soporte MSSQL de primer nivel tan maduro como el de Postgres.
- tooling con validacion fuerte de contratos SQL Server sin perder stored procedures.
- menos friccion para comparar contrato HTTP legado vs backend nuevo.
- mejor ecosistema de migracion cuando la verdad del negocio esta enterrada en SPs y SQL historico.

## Conclusiones operativas

- para `backendrust`, la mejora mas rentable no es cambiar de framework.
- lo que mas acelera hoy es:
- `SP-bootstrap-first`
- helpers estrictos que no oculten fallos SQL
- auditoria runtime de `sp_*_rust`
- validacion viva Nest vs Rust
- y, si queremos mejorar build times, probar `mold` y posiblemente `sccache`
