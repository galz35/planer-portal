# Rust en este VPS

Objetivo: dejar una base de trabajo util para Rust y, en especial, para /opt/apps/porta-planer/backendrust.

Contenido:
- [01_RUST_ECOSISTEMA_Y_USO.md](./01_RUST_ECOSISTEMA_Y_USO.md): que es Rust, como se usa hoy y por que encaja en backends.
- [02_FUENTES_OFICIALES.md](./02_FUENTES_OFICIALES.md): documentacion primaria y para que sirve cada fuente.
- [03_STACK_REAL_DE_BACKENDRUST.md](./03_STACK_REAL_DE_BACKENDRUST.md): mapa exacto del stack real del proyecto.
- [04_SQL_SERVER_EN_RUST.md](./04_SQL_SERVER_EN_RUST.md): decision de librerias y reglas de precision/rendimiento con SQL Server.
- [05_WORKFLOW_UBUNTU20_Y_VALIDACION.md](./05_WORKFLOW_UBUNTU20_Y_VALIDACION.md): comandos y notas operativas de este VPS.
- [06_BACKENDRUST_HALLAZGOS_Y_ACCIONES.md](./06_BACKENDRUST_HALLAZGOS_Y_ACCIONES.md): hallazgos concretos que afectan la migracion actual.
- [07_CRATES_DEL_PROYECTO.md](./07_CRATES_DEL_PROYECTO.md): crates usados por backendrust y su funcion.
- [08_SQL_SERVER_DECISIONES_DE_ARQUITECTURA.md](./08_SQL_SERVER_DECISIONES_DE_ARQUITECTURA.md): reglas futuras para elegir stored procedures, SQL inline y convenciones `_rust` mantenibles.
- [09_ERRORES_REALES_Y_SOLUCIONES_BACKENDRUST.md](./09_ERRORES_REALES_Y_SOLUCIONES_BACKENDRUST.md): errores reales cometidos en la migracion, su causa y la solucion util para futuros proyectos.
- [10_AUDITORIA_SP_RUNTIME_2026-03-28.md](./10_AUDITORIA_SP_RUNTIME_2026-03-28.md): auditoria real de procedures `_rust` usados por handlers versus los que realmente existian en SQL Server.
- [11_VALIDACION_HERRAMIENTAS_DX_2026-03-28.md](./11_VALIDACION_HERRAMIENTAS_DX_2026-03-28.md): validacion de afirmaciones externas sobre productividad Rust y que si aplica o no a este VPS y a backendrust.
- [12_BACON_Y_HERRAMIENTAS_COMPLEMENTARIAS_2026-03-28.md](./12_BACON_Y_HERRAMIENTAS_COMPLEMENTARIAS_2026-03-28.md): decision practica sobre Bacon, cargo-nextest, watchexec, just y que herramienta conviene usar primero en este VPS.
- [13_REPLICA_A_CLIMA_PORTAL_POST_CIERRE.md](./13_REPLICA_A_CLIMA_PORTAL_POST_CIERRE.md): guia futura para copiar `backendrust` a `clima-portal` sin mezclar `.env`, puertos ni procesos de `porta-planer`.
- [14_CLIMA_CORTE_RUST_2026-03-28.md](./14_CLIMA_CORTE_RUST_2026-03-28.md): ejecucion real del corte de `clima` hacia Rust, puertos, rollback y hallazgos de autenticacion.

Arranque rapido en este VPS:

```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
CC=gcc-10 CXX=g++-10 cargo check
```

Ruta de seguimiento de la migracion actual:
- /opt/apps/porta-planer/2026-03-27_backendrust_migracion
