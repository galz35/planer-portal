# Backendrust P1 Real

Fecha: 2026-03-14

Este documento corrige la lista vieja de prioridad 1 en `COMPARACION_NESTJS_VS_RUST.txt`.

Hoy varias piezas P1 ya no estan "faltantes"; ya existen en codigo y el trabajo real pendiente es validar contrato y runtime contra Nest.

## Estado real P1

| Item | Estado real hoy | Archivo |
| --- | --- | --- |
| `GET /tareas/mias` | Implementado. Falta certificar contrato/runtime. | `src/handlers/tareas.rs` |
| `PATCH /tareas/:id` | Implementado. Falta validar flujo de aprobacion y shape exacto. | `src/handlers/tareas.rs` |
| `POST /tareas/rapida` | Implementado. Falta revisar response shape y side-effects. | `src/handlers/tareas.rs` |
| `GET /planning/workload` | Implementado con `users`, `tasks`, `agenda`. Falta validar contenido real. | `src/handlers/planning.rs` |
| `POST /planning/check-permission` | Implementado con SP y reglas basicas. Falta validar paridad exacta. | `src/handlers/planning.rs` |
| `GET /mi-dia` | Implementado con `checkinHoy` real. Falta smoke y contrato fino. | `src/handlers/planning.rs` |
| `GET /planning/mi-asignacion` | Implementado. Falta comparar resumen/campos contra Nest. | `src/handlers/planning.rs` |

## Traduccion honesta

La prioridad 1 ya no es "crear endpoints".

La prioridad 1 ahora es:

1. Validar respuesta exacta contra Nest.
2. Validar side-effects SQL reales.
3. Detectar campos faltantes o nombres distintos.
4. Resolver el bloqueo runtime del login para poder correr smoke masivos.

## Siguiente orden correcto

1. `auth/login`
2. `planning/workload`
3. `tareas/mias`
4. `tareas/:id` update
5. `mi-dia`
6. `planning/mi-asignacion`
