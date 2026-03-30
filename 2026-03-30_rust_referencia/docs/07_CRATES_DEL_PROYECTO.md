# Crates de backendrust y su funcion

Core:
- axum 0.7: router HTTP y handlers REST.
- tokio 1: runtime async.
- serde / serde_json: serializacion.
- anyhow: errores rapidos de aplicacion.
- tracing / tracing-subscriber: logs y observabilidad.
- dotenvy: carga de .env.
- chrono: fechas.

SQL Server:
- tiberius 0.12: cliente async TDS para SQL Server.
- bb8 0.8: pool genrico.
- bb8-tiberius 0.15: adaptador de pool para Tiberius.
- futures-util 0.3: consumo de streams.
- tokio-util 0.7: compatibilidad async para sockets/streams.

Auth y seguridad:
- jsonwebtoken 9: JWT.
- bcrypt 0.15: hashing de password.

HTTP y middleware:
- tower-http 0.5: CORS, trace, compression, timeout.
- tower 0.4: servicios y middleware.
- reqwest 0.13.2: cliente HTTP saliente.

gRPC / protobuf:
- tonic 0.12: gRPC.
- prost 0.13 y prost-types 0.13: protobuf.
- tonic-build 0.12: codegen.
- protoc-bin-vendored 3.2.0: protoc integrado en build.

Integraciones y vista:
- lettre 0.11.19: SMTP.
- yup-oauth2 12.1.2: OAuth.
- tera 1.20.1: plantillas.

Lectura operativa:
- Este stack es razonable para un backend mixto REST + gRPC + SQL Server.
- Donde mas cuidado exige no es en performance bruta del runtime, sino en fidelidad del contrato JSON y en el mapping de tipos SQL Server.
