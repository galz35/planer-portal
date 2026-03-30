# Bacon y herramientas complementarias

Fecha: 2026-03-28

Objetivo: decidir que herramienta usar de verdad para acelerar `backendrust` sin crear una falsa sensacion de seguridad sobre SQL Server o la paridad HTTP.

## Decision corta

- watcher principal: `bacon`
- runner de tests para la siguiente fase seria: `cargo-nextest`
- watcher generico para reiniciar procesos arbitrarios: `watchexec`
- orquestador de comandos si el equipo quiere recetas estables: `just`
- no recomendar `cargo-watch` para flujo nuevo en este proyecto

## Lo que si hace bien Bacon

- corre el job por defecto en cambios de archivos y evita lanzar `cargo check` manual a cada rato
- tiene `bacon.toml` por proyecto y recarga configuracion sin relanzar la app
- soporta `--headless` para correr sin TUI
- soporta varios jobs, keybindings, exports y `cargo_json`
- funciona bien con `clippy`, `test`, `doc`, `run` y tambien con `nextest`
- puede exportar `.bacon-locations` para editores o LSP

## Lo que Bacon NO resuelve por si solo

- no garantiza que un stored procedure exista en SQL Server real
- no valida por si solo que el shape del resultset siga igual
- no sustituye compare vivo Nest vs Rust
- no reemplaza levantar o reiniciar el backend para probar contratos reales

Conclusion:
- `bacon` es el loop rapido de compilacion y tests
- la verdad final de este proyecto sigue siendo runtime real con SQL Server y frontend

## Herramientas similares o complementarias

### 1. cargo-nextest

Cuando conviene:
- cuando el proyecto tenga mas tests de integracion o DB
- cuando hagan falta retries, filtros fuertes, grupos de tests o control serio de concurrencia

Ventajas reales:
- retries configurables
- perfiles por entorno
- overrides por test
- grupos para limitar concurrencia contra recursos compartidos como SQL Server

Decision:
- es la mejor evolucion para tests serios
- mejor pareja con `bacon` que `cargo test` puro cuando la suite crezca

### 2. watchexec

Cuando conviene:
- cuando lo que quieres reiniciar en cambios no es solo `cargo check`
- por ejemplo, recompilar y reiniciar un binario, un script Node de compare o cualquier comando arbitrario

Ventajas reales:
- no esta atado a Rust
- maneja bien reinicios de procesos
- entiende `.gitignore` y `.ignore`

Decision:
- no reemplaza a `bacon`
- sirve cuando el problema es auto-restart de procesos, no diagnosticos Rust

### 3. just

Cuando conviene:
- cuando el equipo ya tiene demasiados comandos largos
- cuando quieres estandarizar recetas del repo: `check`, `build`, `restart`, `compare-live`, `apply-sql`

Ventajas reales:
- centraliza comandos repetidos
- se puede invocar desde subdirectorios
- evita recordar lineas largas con env vars del VPS

Decision:
- es complemento organizativo, no watcher
- util si este repo va a seguir vivo con varios pasos operativos

### 4. cargo-watch

Estado:
- el repo `watchexec/cargo-watch` fue archivado el 2025-01-18

Decision:
- no lo tomaria como base nueva para este proyecto
- entre `cargo-watch` y `bacon`, hoy prefiero `bacon`
- entre `cargo-watch` y `watchexec`, hoy prefiero `watchexec`

## Orden recomendado de adopcion para backendrust

1. `bacon` ahora mismo
2. `cargo-nextest` cuando la suite de tests de DB crezca o necesite retries/grupos
3. `watchexec` si queremos auto-restart serio de binario o scripts auxiliares
4. `just` si queremos unificar comandos del repo
5. `mold` o `sccache` solo si el cuello de botella vuelve a ser tiempo de compilacion

## Modo recomendado para este VPS

### Bucle rapido

```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
bacon
```

Esto usa `backendrust/bacon.toml` y arranca con `check-sp`.

### Test mas pesado

Dentro de bacon:
- `shift-t` para `test-db`
- `r` para relanzar el job actual
- `F5` sigue siendo refresh oficial
- `ctrl-j` abre el menu de jobs

### Headless

```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
bacon --headless
```

## Validacion real en este proyecto

Prueba ejecutada:

```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
timeout 20s bacon --headless -j check-sp
```

Resultado observado:
- `Checking backendrust v0.1.0`
- `Finished dev profile`
- el job `check-sp` del `bacon.toml` se ejecuto bien

Hallazgo practico:
- `bacon` si sirve aqui como reemplazo del `cargo check` repetitivo
- sigue siendo necesario hacer `cargo build` cuando el binario de PM2 debe cambiar
- para bugs de SQL Server o contratos HTTP, `bacon` ayuda a llegar mas rapido al punto de prueba, pero no cierra la verificacion

## Regla practica para no tropezar otra vez

- si el problema es "quiero ver errores Rust rapido": `bacon`
- si el problema es "quiero reiniciar cualquier proceso en cambios": `watchexec`
- si el problema es "quiero tests mas serios y controlados": `cargo-nextest`
- si el problema es "quiero comandos estables del proyecto": `just`
- si el problema es "quiero saber si el SP real y el contrato HTTP siguen bien": compare vivo y pruebas reales, no solo watcher
