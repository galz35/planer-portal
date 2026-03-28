# Auditoría y Correcciones Backend Rust - Reporte Técnico

## 1. Resumen de Hallazgos y Soluciones

Se realizó una auditoría completa del backend Rust (`backendrust`), detectando y corrigiendo varios puntos críticos que impedían la certificación funcional de la API.

### A. Desbloqueo de Login y Auth (Crítico)
- **Problema**: El handoff previo mencionaba un "bloqueo runtime" en `POST /api/auth/login`. Además, los endpoints de `/admin` devolvían siempre `401 Unauthorized`.
- **Causa**: El middleware `require_admin` en `security.rs` no soportaba secretos JWT codificados en Base64 (común en este proyecto), a diferencia del extractor `AuthUser`. Esto causaba fallas en la validación de firma solo en rutas administrativas.
- **Solución**: Se actualizó `security.rs` para soportar Base64 con fallback, alineándolo con el resto del sistema. Se verificó el login exitoso mediante `test_api.js`.

### B. Corrección de Errores de Compilación (Binarios)
- **Problema**: El binario de utilidad `src/bin/db_inspect.rs` no compilaba por falta de `lib.rs` y manejo incorrecto de `QueryItem` de Tiberius.
- **Solución**: 
    1. Se creó `src/lib.rs` y se exportaron los módulos, convirtiendo el proyecto en una librería consumible por sus propios binarios.
    2. Se actualizó `main.rs` para usar la librería.
    3. Se corrigió la lógica de `db_inspect.rs` usando `into_first_result()` para un manejo de filas más limpio.

### C. Bugs en Queries SQL (Side-effects)
- **Problema**: El handler de login intentaba actualizar una columna inexistente (`fechaUltimoLogin`) en `p_Usuarios` e insertar en una tabla inexistente (`p_AuditLogs`).
- **Solución**: Se corrigió el nombre de la tabla a `p_AuditLog`, se mapearon las columnas correctas (`entidad` en lugar de `entidadTipo`, etc.) y se cambió el update de usuario a `fechaActualizacion` (columna real).

### D. Certificación de Pruebas (test_api.js)
- **Problema**: El script de pruebas tenía inconsistencias en los puertos (3200 vs 3201) y errores de acceso al objeto de respuesta (faltaba un nivel de `.data`).
- **Solución**: Se reescribió el script para ser robusto, coherente con el puerto `3200` y con cobertura de endpoints de Auth, Planning, Proyectos, Visitas y Admin.

---

## 2. Estado de la API (Test Run Result)

Ejecución de `node test_api.js` tras las correcciones:

| Módulo | Endpoint | Estado | Nota |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST /auth/login` | ✅ 200 | Token validado y extraído. |
| **Auth** | `GET /auth/config` | ✅ 200 | Retorna configuración de UI. |
| **Planning** | `GET /planning/workload` | ✅ 200 | Retorna carga laboral. |
| **Projects** | `GET /proyectos` | ✅ 200 | Lista de proyectos obtenida. |
| **Admin** | `GET /admin/stats` | ✅ 200 | Resuelto (antes 401). |
| **Visitas** | `GET /visita-admin/visitas` | ✅ 200 | Dashboard administrativo OK. |
| **Extra** | `GET /reports/agenda-compliance`| ✅ 200 | Reporte de cumplimiento OK. |

---

## 3. Revisión de Configuración (.env)
- **Base de Datos**: Conexión contra `Bdplaner` en `190.56.16.85` configurada correctamente.
- **JWT**: Se confirmó el uso de un secreto Base64 de 88 caracteres.
- **Email/Firebase**: Contiene placeholders (`xxxx`), lo cual es esperado para desarrollo local, pero debe ser actualizado para producción.

## 4. Próximos Pasos Recomendados
1. **SSO Portal Bridge**: Implementar `POST /auth/portal/exchange` según el diseño en `docs/2026-03-14/12_PLAN_PORTAL_SSO_PLANIFICACION.md`.
2. **Paridad de Escritura**: Probar endpoints de `POST/PATCH/DELETE` en proyectos y tareas para asegurar que los Stored Procedures también están alineados.
3. **Logs Estándar**: Unificar el uso de `p_AuditLog` vs `p_LogSistema` en todo el proyecto (actualmente hay mezclas).

---
**El backend Rust ya no está bloqueado por el login y es apto para pruebas funcionales exhaustivas.**
