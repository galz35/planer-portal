# Rust: ecosistema y uso real

Resumen corto:
- Rust se usa mucho para servicios de red, CLIs, gateways, workers y componentes donde importan seguridad de memoria, latencia estable y concurrencia real.
- El stack backend mas comun hoy es Tokio + Serde + tracing + un framework HTTP como Axum o Actix.
- Para gRPC, tonic es la pieza dominante del ecosistema moderno.

Como lo usan hoy:
- Tokio se presenta como el runtime asincrono mas usado y su tutorial lo coloca como la base para aplicaciones de red escalables.
- Axum se posiciona como framework web ergonomico y modular, apoyado sobre tower/tower-http.
- En bases de datos, la eleccion depende del motor. Para SQL Server puro en Rust, Tiberius sigue siendo la ruta directa y asincrona.

Lectura practica para este proyecto:
- Si el objetivo es que el frontend no note el cambio de tecnologia, Rust no debe "reinventar" los contratos. Debe respetar payloads, fechas, nullability, codigos HTTP y reglas de negocio.
- En backendrust eso significa: Axum para HTTP, Tokio para concurrencia, Tiberius para SQL Server, bb8-tiberius para pooling y tonic para gRPC.

Notas de adopcion utiles:
- El Rust Project Survey 2025 reporto 7156 respuestas validas y confirma uso amplio del compilador stable en trabajo real.
- Tokio describe su runtime como el mas usado para Async Rust.

Fuentes:
- Rust Book: https://doc.rust-lang.org/book/
- Tokio tutorial: https://tokio.rs/tokio/tutorial
- Axum docs: https://docs.rs/axum/latest/axum/
- Rust survey 2025: https://blog.rust-lang.org/2025/02/13/2025-survey-launch/
