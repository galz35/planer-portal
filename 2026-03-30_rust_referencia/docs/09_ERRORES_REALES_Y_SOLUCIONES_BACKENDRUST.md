# Errores reales y soluciones en backendrust

Objetivo: dejar por escrito los errores que ya ocurrieron en esta migracion para no repetirlos en futuros proyectos Rust + SQL Server.

## Regla nueva obligatoria

- Si un endpoint Rust depende de un `sp_*_rust`, ese SP se crea o altera antes del primer compare vivo.
- Regla por defecto: `CREATE OR ALTER PROCEDURE`.
- Si la firma anterior puede dejar un wrapper roto o ambiguo, se permite `DROP PROCEDURE` + `CREATE PROCEDURE` en el script de paridad.
- No se espera al primer `Could not find stored procedure ...` para reaccionar.

## Error 1. Confundir cobertura de rutas con paridad real

Sintoma:
- la API existia, pero React igual podia romperse.

Causa:
- faltaban ajustes de contrato JSON, codigos HTTP, permisos o side effects.

Solucion:
- validar siempre cuerpo, `statusCode`, `path`, errores y efecto en BD.

Leccion:
- `0 faltantes de ruta` no significa `100%`.

## Error 2. Dejar que un helper esconda fallos SQL con `[]`

Sintoma:
- `GET /planning/stats/performance` devolvia `200` con `data: []`.

Causa:
- el helper compartido tragaba el error de SQL Server y convertia el fallo en lista vacia.

Solucion:
- crear helpers estrictos para endpoints criticos y devolver `500` cuando falle el SP.

Leccion:
- un falso `200` es peor que un `500` visible durante migracion.

## Error 3. Invocar SPs `_rust` sin crearlos primero

Sintoma:
- logs con `Could not find stored procedure 'sp_Planning_StatsPerformance_rust'`.

Causa:
- el handler ya dependia del SP, pero el script SQL no lo habia creado todavia.

Solucion:
- agregar el SP al script de paridad antes del primer test vivo y aplicarlo a la base.

Leccion:
- bootstrap primero, compare despues.

## Error 4. Wrapper `sp_ActualizarTarea_rust` con firma incorrecta

Sintoma:
- `POST /planning/update-operative` fallaba indicando que `@idTarea` no era parametro valido.

Causa:
- el wrapper `_rust` no reflejaba la firma que el handler realmente estaba enviando.

Solucion:
- rehacer el wrapper con parametros nombrados y firma alineada a `sp_ActualizarTarea`.

Leccion:
- si un wrapper existe, igual hay que validar su firma real.

## Error 5. Asumir semantica de delete sin comparar Nest vivo

Sintoma:
- parecia que `DELETE /proyectos/:id` debia borrar fisicamente.

Causa:
- se asumio una semantica REST generica en lugar de comprobar el comportamiento real de Nest.

Solucion:
- probar el flujo en vivo y validar el estado final en la API.

Resultado real:
- Nest hace soft delete y deja `estado = Cancelado`.

Leccion:
- la verdad es el sistema vivo, no la intuicion del nombre del endpoint.

## Error 6. Seguir un alias legacy que ya no importaba

Sintoma:
- `notes` consumio tiempo aunque no era bloqueador del release real.

Causa:
- se arrastro un backlog historico sin confirmar necesidad actual en React ni en el Nest desplegado.

Solucion:
- validar primero si el alias existe y si el frontend actual lo usa.

Leccion:
- backlog historico sin contexto puede inflar el porcentaje y desviar trabajo.

## Error 7. Subestimar diferencias pequenas de contrato HTTP

Sintoma:
- respuestas "casi iguales" seguian teniendo diferencias de `path`, `statusCode` o campos nulos.

Causa:
- Rust devolvia envelopes validos pero no equivalentes a Nest.

Solucion:
- normalizar el envelope REST y revisar la respuesta viva, no solo el payload de negocio.

Leccion:
- el frontend nota tambien los detalles pequenos.

## Error 8. Asumir un manejo distinto del secreto JWT

Sintoma:
- tokens reales de Nest no autenticaban en Rust.

Causa:
- Rust estaba priorizando una interpretacion distinta del secreto en lugar de usarlo como raw secret igual que Nest.

Solucion:
- alinear la verificacion JWT con `JWT_SECRET` raw.

Leccion:
- autenticacion compartida exige la misma regla exacta, no una "equivalente".

## Error 9. Mapear tipos SQL Server sin disciplina

Sintoma:
- riesgo de precision perdida o formatos incompatibles.

Causa:
- conversion generica sin tratamiento explicito para `decimal/numeric`, `uniqueidentifier`, `datetimeoffset` y `time`.

Solucion:
- endurecer `row_to_json` y centralizar el mapping.

Leccion:
- la precision se rompe en la serializacion, no solo en la query.

## Error 10. Arrancar la verificacion viva sin el contexto minimo

Sintoma:
- pruebas iniciales con `401` o comparaciones parciales.

Causa:
- consultar endpoints protegidos sin token o sin confirmar el path real del backend montado.

Solucion:
- obtener token real, probar Nest y Rust con el mismo usuario y usar la misma query string.

Leccion:
- la prueba viva debe ser comparable, no aproximada.

## Error 11. Concatenar hora sobre fechas crudas del frontend

Sintoma:
- `planning/workload` lanzo en vivo:
  `Error converting data type nvarchar to datetime`

Causa:
- el frontend no usa un solo formato:
  - unas vistas mandan `YYYY-MM-DD`
  - otras mandan `toISOString()`
- el handler Rust agregaba ` 00:00:00` y ` 23:59:59` directamente al string recibido

Solucion:
- normalizar `startDate/endDate` en Rust antes de construir el rango SQL
- aceptar `YYYY-MM-DD`, ISO completo y `YYYY-MM-DD HH:MM:SS`
- endurecer el endpoint para no esconder el fallo SQL
- mover la conversion final al SP con `TRY_CONVERT`

Leccion:
- nunca concatenar hora sobre input crudo del frontend
- si la pantalla cambia de componente, puede cambiar el formato de fecha aunque el contrato "parezca" igual

## Error 12. Pensar que `bacon` sustituye la validacion viva

Sintoma:
- tentacion de tratar `bacon` como prueba suficiente porque el loop es rapido y limpio

Causa:
- `bacon` valida compilacion y tests locales, no runtime real con SQL Server ni paridad HTTP

Solucion:
- usar `bacon` para feedback rapido
- cerrar el ciclo con `cargo build`, restart real y compare vivo

Validacion real:
- probado en este repo con:
  `timeout 20s bacon --headless -j check-sp`
- resultado:
  `Checking backendrust ... Finished`

Leccion:
- `bacon` si aporta velocidad real
- no reemplaza deploy, SPs aplicados ni trafico real desde frontend

## Error 13. Usar `unwrap` sobre tipos/columnas no garantizados en SQL Server

Sintoma:
- `GET /jornada/horarios` y `GET /jornada/patrones` tiraron `502`
- en logs:
  - conversion de `numeric(8.00)` a `f32`
  - columna `id_detalle` inexistente en `marcaje_patrones_detalle`

Causa:
- el handler Rust asumio que:
  - `duracion_horas` se podia leer directo como `f32`
  - el detalle del patron traia una columna llamada `id_detalle`
- ninguna de las dos suposiciones estaba garantizada por la BD real

Solucion:
- leer `duracion_horas` a partir del mapping ya normalizado (`row_to_json`) y parsearlo con tolerancia
- reemplazar `unwrap/get` por `try_get`
- usar el nombre real de columna (`id`) en `marcaje_patrones_detalle`

Leccion:
- en Rust + SQL Server no se hace `unwrap` sobre columnas o tipos si la BD no esta 100% bajo control del mismo modulo
- primero se inspecciona el schema real y luego se endurece la lectura

## Error 14. Asumir que el login real depende solo de `bcrypt`

Sintoma:
- en `clima`, el mismo usuario que Nest aceptaba con `123456` devolvia `401` en Rust

Causa:
- el Nest desplegado en `porta-planer` y `clima` tenia una regla de compatibilidad viva:
  - si `pass === '123456'`, el login entra sin validar `bcrypt`
- Rust habia implementado solo la verificacion de `passwordHash`

Solucion:
- revisar primero el comportamiento vivo y el servicio Nest real
- portar la compatibilidad exacta al login Rust antes del corte
- validar despues contra el mismo usuario por la ruta publica

Leccion:
- autenticacion de migracion no es solo JWT y hashes
- tambien hay que portar bypasses temporales, backdoors de soporte o reglas legacy si el sistema vivo aun depende de ellas

## Checklist futuro corto

1. Confirmar endpoint vivo en Nest y payload real del frontend.
2. Crear o alterar los `sp_*_rust` antes de correr el compare.
3. Ejecutar `cargo check`.
4. Probar con token real si la ruta es protegida.
5. Comparar cuerpo, status, path y side effects.
6. Documentar el error y la solucion cuando aparezca una nueva clase de falla.
