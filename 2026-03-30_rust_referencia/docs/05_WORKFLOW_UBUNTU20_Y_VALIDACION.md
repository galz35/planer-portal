# Workflow Ubuntu 20.04 y validacion

Contexto real de este VPS:
- Ubuntu 20.04.6 LTS
- Rust instalado con rustup en /root/.cargo y /root/.rustup
- Este proyecto necesita gcc-10/g++-10 para evitar un fallo de aws-lc-sys con gcc 9.4.0 de Ubuntu 20.04

Comando base de compilacion:

```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
CC=gcc-10 CXX=g++-10 cargo check
```

Formateo:

```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
cargo fmt -- --check
```

Linting util:

```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
CC=gcc-10 CXX=g++-10 cargo clippy --all-targets -- -D warnings
```

Dependencias de sistema que ya quedaron necesarias en este VPS:
- pkg-config
- libssl-dev
- build-essential
- gcc-10
- g++-10

Variables de entorno actuales relevantes:
- HOST
- PORT
- GRPC_PORT
- RUST_LOG
- LOG_FORMAT
- MSSQL_HOST
- MSSQL_PORT
- MSSQL_DATABASE
- MSSQL_USER
- MSSQL_PASSWORD
- MSSQL_TRUST_CERT
- JWT_SECRET

Productividad instalada en este VPS:

```bash
source /root/.cargo/env
bacon --version
```

Uso recomendado mientras se edita `backendrust`:

```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
bacon
```

Nota:
- `bacon` ya quedo instalado el `2026-03-28`.
- `backendrust` ya trae `bacon.toml` propio con `check-sp` como job por defecto.
- sirve para feedback continuo; no reemplaza `cargo build` ni la validacion viva contra SQL Server.
- correccion importante: `bacon` acelera compilacion/tests, pero no detecta por si solo una regresion de contrato SQL Server si el problema solo aparece al ejecutar el SP real.
- en esta configuracion, `r` relanza el job actual y `shift-t` dispara `test-db`.

Notas utiles:
- Si falla openssl-sys, revisar pkg-config y libssl-dev.
- Si falla aws-lc-sys con gcc 9.4.0, usar CC=gcc-10 CXX=g++-10.
- build.rs ya resuelve protoc con protoc-bin-vendored; no hace falta instalar protoc del sistema para este repo.
- src/migration/mod.rs depende de data/endpoints_manifest.json y data/implemented_endpoints.json; si faltan, la compilacion falla.
- Antes de certificar endpoints con SQL Server, conviene auditar los `sp_*_rust` usados por handlers contra `sys.procedures`.

Paso de auditoria recomendado:

```bash
rg -o 'sp_[A-Za-z0-9_]+_rust' /opt/apps/porta-planer/backendrust/src/handlers | sed 's/.*://' | sort -u > /tmp/backendrust_handler_sps.txt
```

Luego comparar esa lista con `sys.procedures` de SQL Server y corregir los faltantes antes del compare vivo.
