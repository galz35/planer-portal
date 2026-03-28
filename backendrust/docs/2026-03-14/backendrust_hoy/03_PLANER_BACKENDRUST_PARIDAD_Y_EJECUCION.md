# Planer backendrust: paridad real con Nest y plan de ejecucion

## Objetivo

Dejar `backendrust` como reemplazo transparente de `v2backend` para el frontend de planificacion.

Eso significa:

- mismas rutas
- mismos metodos
- mismos aliases
- mismos payloads de entrada
- mismos codigos HTTP
- mismo shape JSON de respuesta y error
- misma autenticacion y autorizacion
- mismos side-effects en base de datos

El frontend solo deberia cambiar el target del backend, no su logica.

## Estado auditado

Fuente reproducible:

- `D:\portal\scripts\audit_planer_backend_parity.ps1`
- `D:\portal\docs\2026-03-14\planer_paridad\report.md`
- `D:\portal\docs\2026-03-14\planer_paridad\endpoint_matrix.csv`
- `D:\portal\docs\2026-03-14\planer_paridad\controller_summary.csv`

Resultado actual:

- 264 endpoints Nest contabilizados
- 129 endpoints certificados por manifiesto
- 132 endpoints declarados en Rust pero no certificados por manifiesto
- 2 endpoints que siguen cayendo en handler generico
- 1 endpoint faltante en router
- 78 hints de posible brecha de seguridad entre guards de Nest y handlers de Rust

## Lo que falta para reemplazo real

### 1. Cerrar la superficie faltante

Pendientes inmediatos:

- `GET /visita-admin/reportes/km`
- `GET /acceso/permiso-area/:carnetRecibe` hoy cae en handler generico
- `GET /acceso/permiso-empleado/:carnetRecibe` hoy cae en handler generico

### 2. Certificar lo ya declarado

Hay muchos endpoints presentes en `router.rs` pero no marcados como implementados en el manifiesto.

Eso no significa que ya esten listos. Significa que:

- existen en router
- tienen handler real
- aun no estan validados por contrato

Los bloques mas importantes ahi son:

- `admin`
- `acceso`
- `planning`
- `marcaje`
- `visita-admin`

### 3. Igualar seguridad

No basta con que el handler responda. Debe exigir lo mismo que Nest:

- JWT donde Nest usa `AuthGuard('jwt')`
- admin donde Nest usa `AdminGuard` o `RolesGuard`
- feature flags donde Nest usa `FeatureFlagGuard`

Sin esto, el backend puede "funcionar" pero no ser equivalente.

### 4. Igualar contrato HTTP

Antes de cortar a Rust, hay que cerrar estos cuatro contratos:

- response success
- response error
- validacion de body/query/path
- tokens y refresh

Si alguno difiere, el frontend rompe aunque la ruta exista.

## Orden correcto de trabajo

### Fase 1. Auth y contrato global

- quitar password maestra de desarrollo
- replicar refresh token con validacion y rotacion real
- unificar wrapper de respuestas exitosas y errores
- agregar validacion estricta de request comparable a Nest

### Fase 2. Seguridad por modulo

- `diagnostico`
- `proyectos`
- `clarity`
- `equipo`
- `foco`
- `notas`
- `notifications`
- `campo`
- `marcaje`
- `visita`

### Fase 3. Cierre de endpoints faltantes o genericos

- reemplazar los 2 handlers genericos restantes
- implementar el endpoint faltante de `visita-admin/reportes/km`

### Fase 4. Certificacion por contrato

Por cada endpoint:

- misma ruta y alias
- mismo status code
- mismo JSON
- mismas validaciones
- mismo comportamiento con errores

### Fase 5. Corte transparente para frontend

Solo cuando la matriz quede sin:

- `missing`
- `generic`
- brechas de auth/guard
- diferencias de contrato confirmadas

ahi el frontend puede cambiar solo el host/backend target.

## Criterio de listo

`backendrust` se considera reemplazo real de Nest solo cuando:

1. el auditor no reporta `missing`
2. el auditor no reporta `generic`
3. auth y guards estan alineados
4. response success/error queda igualado
5. hay contract tests por modulo critico

## Recomendacion operativa

No migrar por intuicion ni por conteo de rutas. Migrar por contrato.

La secuencia correcta es:

1. cerrar auth
2. cerrar seguridad
3. cerrar endpoints faltantes
4. certificar modulo por modulo
5. cambiar frontend

Ese es el camino para que `backendrust` funcione de verdad y no solo "parezca" completo.
