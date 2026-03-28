# Backendrust - Qué falta para 100% real (no solo paridad HTTP)

Estado actual:
- Paridad de rutas/métodos del manifiesto: **259/259**.
- Parte de los endpoints aún responde con handlers genéricos `501` y/o mocks de transición.

## 1) Cerrar infraestructura transversal (prioridad alta)

- [ ] Pool SQL Server real con timeouts/retries y healthcheck DB.
- [ ] Capa de errores tipada (`AppError`) + mapeo HTTP estandarizado.
- [ ] Autenticación JWT real (access/refresh) y middleware de autorización por rol.
- [ ] Observabilidad productiva: request-id, métricas, trazas estructuradas.

## 2) Sustituir handlers genéricos por lógica real por dominio

- [ ] `acceso` (permisos/delegaciones/organización).
- [ ] `visibilidad` (reglas de alcance jerárquico).
- [ ] `campo` (recorridos y tracking persistente).
- [ ] `jornada` (horarios/patrones/asignaciones).
- [ ] `visita-admin` y `visita-campo`.
- [ ] `notifications` (push/email reales, no endpoints de prueba).

## 3) Reforzar calidad de entrega

- [ ] Tests de integración por módulo (DB real o testcontainers).
- [ ] Contract tests contra OpenAPI/fixtures de NestJS.
- [ ] Criterio de salida: cada endpoint deja de ser mock/genérico y queda cubierto por test.

## 4) Criterio para declarar “100% completo”

Se considera 100% real cuando:
1. No quedan handlers genéricos 501 para rutas de negocio.
2. No quedan respuestas mock en endpoints críticos.
3. Pasa suite: unit + integración + contrato.
4. Métricas/errores/autenticación están habilitados en producción.
