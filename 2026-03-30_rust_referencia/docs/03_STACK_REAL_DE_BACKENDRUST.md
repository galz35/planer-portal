# Stack real de backendrust

Fuente local:
- /opt/apps/porta-planer/backendrust/Cargo.toml
- /opt/apps/porta-planer/backendrust/src/main.rs
- /opt/apps/porta-planer/backendrust/src/config.rs
- /opt/apps/porta-planer/backendrust/src/db.rs
- /opt/apps/porta-planer/backendrust/build.rs

Arquitectura actual:
- REST: Axum 0.7
- Runtime async: Tokio 1 con features full
- Serializacion: Serde + serde_json
- Logs: tracing + tracing-subscriber
- SQL Server: Tiberius 0.12 + bb8-tiberius 0.15
- HTTP saliente: reqwest 0.13.2
- gRPC: tonic 0.12 + prost 0.13
- Auth: jsonwebtoken 9 + bcrypt 0.15
- Middleware HTTP: tower-http 0.5
- Plantillas: tera 1.20.1
- Mail: lettre 0.11.19
- OAuth Google: yup-oauth2 12.1.2

Flujo de arranque:
1. Lee .env con dotenvy.
2. Construye AppConfig desde variables de entorno.
3. Crea pool bb8 para SQL Server.
4. Levanta Axum para REST.
5. Levanta Tonic para gRPC.

SQL Server actual:
- src/db.rs crea un bb8::Pool<ConnectionManager>.
- Host por defecto: 127.0.0.1
- Puerto por defecto: 1433
- Base por defecto: master
- Usuario por defecto: sa
- El pool hoy esta hardcodeado con max_size(10).

Patron de acceso a datos:
- El proyecto usa en gran medida stored procedures *_rust para preservar logica ya existente.
- El helper compartido principal esta en src/handlers/equipo.rs:
  - exec_sp_to_json
  - exec_sp_multi_to_json
  - exec_query_to_json
  - row_to_json

Build system:
- build.rs usa protoc-bin-vendored y compila:
  - proto/common.proto
  - proto/auth.proto
  - proto/planning.proto
  - proto/proyectos.proto
  - proto/marcaje.proto

Conclusiones utiles:
- El proyecto ya esta bien encaminado para una migracion pragmatica: HTTP con Axum, gRPC con tonic y SQL Server via Tiberius.
- El punto delicado no es "usar Rust" sino conservar paridad exacta de contratos y tipos cuando SQL Server responde datos reales.
