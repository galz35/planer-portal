# backendrust map

Project root:
- /opt/apps/porta-planer/backendrust

Key files:
- Cargo.toml: dependency truth.
- src/main.rs: runtime boot and REST/gRPC startup.
- src/config.rs: env vars.
- src/db.rs: SQL Server pool bootstrap.
- src/handlers/equipo.rs: shared SQL helpers and row_to_json.
- build.rs + proto/: gRPC/protobuf generation.
- data/endpoints_manifest.json + data/implemented_endpoints.json: migration manifest required at compile time.

Migration tracking:
- /opt/apps/porta-planer/2026-03-27_backendrust_migracion/00_RESUMEN_EJECUTIVO.md
- /opt/apps/porta-planer/2026-03-27_backendrust_migracion/05_CHECKLIST_AVANCES.md

Known VPS build command:
```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
CC=gcc-10 CXX=g++-10 cargo check
```

Known system packages already needed here:
- pkg-config
- libssl-dev
- build-essential
- gcc-10
- g++-10
