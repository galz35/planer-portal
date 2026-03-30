# Decisiones de arquitectura SQL Server para futuros proyectos Rust

Objetivo: no repetir una migracion donde la ruta existe pero el frontend se rompe por contratos, permisos o side effects distintos.

## Conclusion corta

La recomendacion para proyectos como este no es un dogma de "0 SQL inline" ni tampoco dejar SQL repartido por handlers.

La mejor base practica es:
- Handlers delgados.
- Capa de repositorios clara por modulo.
- Stored procedures para escrituras, aprobaciones, reglas de negocio, permisos y lecturas complejas que ya existen en SQL Server.
- SQL inline solo para lecturas simples y bien parametrizadas, concentradas en repositorios, nunca en handlers.
- Contratos HTTP y serializacion SQL Server definidos y probados antes de refactorizar tecnologia.

Eso se parece mas a un estilo Dapper disciplinado que a un ORM pesado.

## Convencion recomendada para procedures de Rust

Usa el sufijo `_rust` solo para procedures nuevos o adaptadores creados por la migracion.

Ejemplos sanos:
- `sp_Tarea_RecalcularJerarquia_rust`
- `sp_Proyecto_Listar_rust`

Regla practica:
- Si Nest y Rust pueden compartir exactamente el mismo SP, no dupliques por nombre.
- Si Rust necesita contrato, parametros o side effects distintos, crea un `sp_*_rust` explicito.
- No renombres procedures legacy en masa; crea wrappers/adaptadores cuando haga falta.
- Para migracion activa, no esperes a descubrir si el SP existe: define el `sp_*_rust` antes del primer compare vivo.
- Default futuro: `CREATE OR ALTER PROCEDURE`. Si la firma vieja te puede dejar basura o un wrapper inconsistente, usa `DROP/CREATE` de forma explicita dentro del script de paridad.

## Lo que si conviene hacer

1. Usar stored procedures en altas, actualizaciones, aprobaciones, cierres y cualquier flujo con side effects.
2. Reusar stored procedures existentes si ya contienen reglas reales del negocio.
3. Mantener SQL inline solo cuando la consulta sea simple, estable y legible.
4. Exigir parametros posicionales; nunca interpolacion de strings.
5. Centralizar conversion de tipos SQL Server a JSON.
6. Mantener validaciones y permisos en una capa visible del backend, no escondidos entre consultas dispersas.

## Lo que no conviene repetir

- SQL mezclado en handlers HTTP.
- Queries casi iguales duplicadas en varios archivos.
- Conversion ad hoc de `decimal`, `datetimeoffset`, `uuid` o `time` en cada endpoint.
- Refactorizar a Rust cambiando a la vez contratos HTTP, nombres de campos y comportamiento SQL.
- Asumir que si la ruta responde 200 entonces ya hay paridad.
- Esperar el primer error de runtime para descubrir que faltaba un `sp_*_rust`.
- Devolver `200` con arrays vacios cuando el problema real es una falla de SQL Server o un SP inexistente.

## Regla util para decidir SP vs SQL inline

Usa stored procedure cuando ocurra al menos una de estas condiciones:
- La operacion escribe datos.
- Hay mas de una tabla involucrada.
- Existen reglas de visibilidad o aprobacion.
- Hay side effects que el frontend espera aunque no los vea directo.
- El sistema legacy ya resolvia ese caso por SP y funciona en produccion.

Usa SQL inline parametrizado solo cuando se cumpla todo esto:
- Es lectura.
- La consulta cabe en pocas lineas.
- No contiene reglas de negocio opacas.
- El contrato de salida es pequeno y facil de probar.
- No rompe precision ni formatos al cruzar JSON.

## Patron recomendado para Rust + SQL Server

- `handler`: valida request, autentica, llama caso de uso o repo y devuelve contrato HTTP.
- `repo`: concentra `EXEC sp_*` o SQL inline parametrizado.
- `mapping`: unifica conversion de filas SQL Server a JSON o DTO.
- `tests`: cubren contratos clave, normalizacion y permisos base.

Si el proyecto necesita mucha velocidad de entrega, este patron es mas mantenible que intentar un ORM total y mas seguro que poner SQL suelto por todo el codigo.

## Precision y rendimiento que si importan

- `decimal/numeric`: cruzar JSON como string cuando la precision importe.
- `uniqueidentifier`: string canonico.
- `datetimeoffset`: RFC3339.
- `time`: serializacion consistente.
- Pool MSSQL configurable por entorno.
- Si hay consultas concurrentes, cada rama necesita su propia conexion del pool.

## Estandar sugerido para futuros proyectos

- 70% a 90% de la logica critica apoyada en SP si la base legacy ya esta madura.
- 10% a 30% de lecturas simples con SQL inline parametrizado y corto.
- 0% de SQL armado con concatenacion.
- 0% de reglas de permisos escondidas en cinco endpoints distintos.

## Checklist de arranque para no tropezar otra vez

- Definir primero los contratos HTTP que el frontend ya usa.
- Inventariar SP existentes antes de reescribir consultas.
- Crear o alterar desde el inicio los `sp_*_rust` que Rust vaya a invocar.
- Identificar tipos SQL Server delicados antes de exponer JSON.
- Separar paridad de comportamiento de refactor estetico.
- Agregar pruebas chicas de normalizacion y mapping desde el inicio.
- Medir con datos reales antes de decidir que todo debe ir por ORM o todo por SP.
