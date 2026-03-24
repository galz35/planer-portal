MEGA-PROMPT — PLANER: “VISITAS A CLIENTE + GPS + RECORRIDO + DASHBOARD” (inspirado en un software comercial)
================================================================================

ROL
Eres un agente senior fullstack (SQL Server SP-first + NestJS + React + Flutter offline-first).
Tu trabajo NO es “clonar” un producto, sino implementar funcionalidades equivalentes que la empresa usa:
agenda, visitas a clientes, geocercas, GPS, recorrido, reportes, evidencia y control jerárquico.

REGLA LEGAL / ÉTICA (OBLIGATORIA)
- NO copiar marca, textos, UI exacta, nombres comerciales, ni flujos propietarios.
- NO replicar “look&feel” idéntico. Solo funcionalidad inspirada.
- Nombres internos: “VisitaCliente”, “AgendaCampo”, “TrackingGPS”, “Geocerca”.

OBJETIVO DE NEGOCIO
- Reemplazar el uso actual del software de visitas (costo mensual alto) por Planer.
- Entregar un MVP estable y usable en producción interna con:
  1) Clientes georreferenciados + radio de geocerca
  2) Agenda de visitas por usuario (día/semana)
  3) Check-in y Check-out con validación geofence (Haversine)
  4) Tracking GPS (recorrido real) con filtros antiruido
  5) Modo offline real (colas SQLite + sync)
  6) Mapa web con clientes + círculos + ruta (polyline)
  7) KPIs + reportes + exportación
  8) Visibilidad por jerarquía (supervisor ve su equipo)
  9) Evidencia (foto + firma) (MVP opcional, pero debe quedar habilitable)

RESTRICCIONES TÉCNICAS DEL PROYECTO
- BD: SQL Server. Lógica pesada en SPs (Stored Procedure First).
- Backend: NestJS sin ORM (NO TypeORM). Acceso por pool mssql y ejecutarSP/ejecutarQuery.
- Frontend: React. Mapas: Leaflet (preferir CDN).
- Mobile: Flutter con SQLite (sqflite) + SyncWorker + colas offline.
- Identidad: JWT con claim/field “carnet” (NO userId).
- Variables/tablas en español.
- UI paleta: rojo/blanco/gris/negro/verde pastel (evitar azules).
- Performance: nada de queries sin índices por fecha/carnet.

================================================================================
A) AUDITORÍA DEL REPO (OBLIGATORIA, ANTES DE PROGRAMAR)
================================================================================

1) Lee documentación base del repo (para no inventar arquitectura):
- estructura/INDEX.md
- estructura/ARCHITECTURE_OVERVIEW.md
- estructura/DATABASE_SCHEMA.md
- estructura/BACKEND_LOGIC.md
- estructura/FRONTEND_REACT.md
- estructura/MOBILE_FLUTTER.md
- estructura/FUSION_GUIDE.md
- docs/PLAN_TRABAJO_MARCAJE_CAMPO.md
- docs/ASIGNACION_TRABAJO_AI.md

2) Localiza código existente relacionado (NO asumas, abre archivos):
SQL:
- v2sistema/v2backend/sql/000_fn_haversine_metros.sql
- v2sistema/v2backend/sql/visita_cliente/001_stored_procedures_vc.sql
- (y cualquier script visita_cliente/000_create_tables_vc.sql, seeds, etc.)

BACKEND:
- v2sistema/v2backend/src/marcaje/marcaje.controller.ts
- v2sistema/v2backend/src/marcaje/marcaje.service.ts
- v2sistema/v2backend/src/visita-cliente/* (controllers/services/repos/dtos)
- guard de feature flag si existe: src/common/guards/feature-flag.guard.ts (o equivalente)

FRONTEND:
- v2sistema/v2frontend/src/pages/Campo/VCTrackingPage.tsx
- v2sistema/v2frontend/src/pages/Admin/VisitaCliente/* (clientes, visitas, agenda, reportes, metas, dashboard)
- v2sistema/v2frontend/src/services/* (visitaApi, etc.)
- router: v2sistema/v2frontend/src/routes/AppRoutes.tsx

FLUTTER:
- v2sistema/v2flutter_movil/lib/features/campo/data/visita_local_db.dart
- v2sistema/v2flutter_movil/lib/features/campo/services/tracking_service.dart
- v2sistema/v2flutter_movil/lib/features/campo/presentation/* (agenda/checkin/checkout/resumen/evidencia)
- SyncWorker: archivo donde se drenan colas y se postea al backend

3) Produce salida “RADAR” (corta) en consola:
- YA_EXISTE: lista con (ruta archivo → qué hace)
- FALTA: lista con (ruta archivo a crear/modificar → qué falta)
- RIESGOS: batería/permisos/spoofing/performance/offline/seguridad
- ORDEN_RECOMENDADO: qué implementar primero para ver valor rápido

REGLA: Si algo YA EXISTE, NO lo reescribas: complétalo.

================================================================================
B) DEFINICIÓN DE DATOS (MODELO) — MVP
================================================================================

Definir/confirmar tablas (SQL Server) para “VisitaCliente”.
Si ya existen, revisa columnas y ajusta con ALTER + índices, sin romper data.

1) TABLA CLIENTES (vc_clientes)
Campos mínimos:
- id (PK)
- codigo (string)
- nombre (string)
- direccion (string nullable)
- telefono (string nullable)
- contacto (string nullable)
- lat (decimal(10,7))
- lon (decimal(10,7))
- radio_metros (int default 100)
- zona (string nullable)
- activo (bit)
- creado_en, actualizado_en (datetime)

Índices:
- IX_vc_clientes_codigo
- (opcional) IX_vc_clientes_zona

2) TABLA AGENDA (vc_agenda)
Agenda por día/usuario:
- id (PK)
- carnet (string)
- fecha (date)
- cliente_id (FK vc_clientes)
- orden (int)
- estado (PENDIENTE/EN_CURSO/FINALIZADA/CANCELADA)
- notas (string nullable)
- creado_en, actualizado_en
Índices:
- IX_vc_agenda_carnet_fecha (carnet, fecha)
- IX_vc_agenda_fecha (fecha)

3) TABLA VISITAS (vc_visitas)
Instancia real de visita (checkin/out):
- id (PK)
- agenda_id (FK vc_agenda nullable si se permite visita libre)
- carnet (string)
- cliente_id (FK)
- estado (EN_CURSO/FINALIZADA/ANULADA)
- checkin_fecha (datetime)
- checkin_lat, checkin_lon, checkin_accuracy
- distancia_inicio_m (float)  // Haversine al cliente
- dentro_geocerca (bit)
- checkout_fecha (datetime nullable)
- checkout_lat, checkout_lon, checkout_accuracy (nullable)
- distancia_fin_m (float nullable)
- duracion_min (int nullable)
- observacion (string nullable)
- offline_id (string unique)  // idempotencia checkin
- creado_en, actualizado_en
Índices:
- IX_vc_visitas_carnet_fecha (carnet, checkin_fecha)
- IX_vc_visitas_cliente_fecha (cliente_id, checkin_fecha)
- UX_vc_visitas_offline_id UNIQUE

4) TRACKING GPS (vc_tracking)
Puntos GPS del recorrido:
- id (PK)
- carnet (string)
- fecha (date)  // derivada de timestamp local/servidor
- lat, lon (decimal(10,7))
- accuracy (decimal(10,2) nullable)
- velocidad (decimal(10,2) nullable)
- timestamp (datetime) // el timestamp del punto
- fuente (string nullable) // FOREGROUND/BACKGROUND
- creado_en
Índices:
- IX_vc_tracking_carnet_fecha_ts (carnet, fecha, timestamp)
- IX_vc_tracking_fecha (fecha)

5) EVIDENCIA (vc_evidencias) — opcional MVP (habilitable)
- id (PK)
- visita_id (FK)
- tipo (FOTO/FIRMA/OTRO)
- url (string)
- mime (string)
- tamano_bytes (int)
- hash (string) (opcional)
- creado_en
Índice:
- IX_vc_evidencias_visita

6) FORMULARIOS (vc_formularios, vc_respuestas) — fase posterior
- schema_json y respuestas_json

7) ALERTAS (vc_alertas) — fase posterior
- fuera_geocerca, sin_tracking, agenda_pendiente, etc.

REGLA: Usa dbo.fn_haversine_metros existente para distancias.

================================================================================
C) STORED PROCEDURES — “SP-FIRST”
================================================================================

Implementa/valida estos SPs (si ya existen, revisa que cumplan esto):

1) sp_vc_checkin
Inputs:
- @carnet, @cliente_id, @agenda_id (nullable), @lat, @lon, @accuracy, @timestamp (nullable), @offline_id
Lógica:
- Buscar cliente lat/lon/radio_metros
- distancia_inicio_m = dbo.fn_haversine_metros(@lat,@lon,cliente.lat,cliente.lon)
- dentro_geocerca = CASE WHEN distancia <= radio THEN 1 ELSE 0 END
- Idempotencia:
  - si @offline_id ya existe → retorna el id existente (NO duplicar)
- Crear/actualizar:
  - Inserta visita EN_CURSO
  - Marca agenda EN_CURSO si agenda_id viene
Return:
- visita_id, dentro_geocerca, distancia_inicio_m, mensaje/flag

2) sp_vc_checkout
Inputs:
- @carnet, @visita_id, @lat,@lon,@accuracy,@timestamp, @observacion
Lógica:
- Verifica que visita exista y esté EN_CURSO y carnet coincida
- distancia_fin_m
- duracion_min
- estado FINALIZADA
- agenda FINALIZADA
Return:
- ok, visita_id, duracion_min

3) sp_vc_tracking_batch
Inputs:
- @carnet, @puntos_json (array json)
Lógica:
- Insertar puntos en vc_tracking
- fecha = CONVERT(date, timestamp)
- Validar payload básico (lat/lon no null)
Return:
- insertados

4) sp_vc_tracking_por_dia  (CRÍTICO para el MAPA)
Inputs:
- @carnet, @fecha
Salida:
- puntos ordenados asc
- ya filtrados (mínimo):
  - accuracy <= 50m (configurable)
  - saltos imposibles (ver regla abajo)
Reglas antiruido sugeridas (mínimo):
- Si accuracy > 50 → descartar
- Si distancia entre punto i e i+1 > 1000m en < 30s → descartar siguiente
- Si velocidad estimada > 130km/h → descartar
(Implementar con window functions y cálculo de delta_t + haversine consecutivo)

5) sp_vc_calculo_km_dia
Inputs:
- @carnet, @fecha
Salida:
- km_total, puntos_validos, segmentos_validos
Lógica:
- sumar haversine entre puntos válidos consecutivos
- retornar totales

6) sp_vc_agenda_hoy
Inputs:
- @carnet, @fecha, @lat_actual,@lon_actual (opc)
Salida:
- agenda del día con:
  - cliente info + radio
  - estado agenda + estado visita + timestamps
  - distancia_actual_m (si lat/lon actual viene)

7) sp_vc_dashboard_kpis
Inputs:
- @fecha, @carnet (nullable, para admin/supervisor)
Salida:
- visitas_planificadas, finalizadas, fuera_geofence, km_total, tiempo_total, etc.

8) sp_vc_importar_clientes
Inputs:
- @json_clientes o tabla tipo TVP (si existe patrón)
Lógica:
- MERGE por codigo
- upsert
Return:
- insertados, actualizados

ÍNDICES OBLIGATORIOS:
- vc_tracking(carnet,fecha,timestamp)
- vc_visitas(offline_id unique)
- vc_agenda(carnet,fecha)

================================================================================
D) BACKEND NESTJS — ENDPOINTS Y PERMISOS
================================================================================

Regla: Controllers finos, Services orquestan, la lógica pesada en SP.

1) Endpoints CAMPO (móvil)
- GET  /visita-campo/agenda?fecha=YYYY-MM-DD&lat=..&lon=..
- POST /visita-campo/checkin
- POST /visita-campo/checkout
- POST /visita-campo/tracking-batch
- GET  /visita-campo/resumen-dia?fecha=YYYY-MM-DD
- GET  /visita-campo/tracking-raw?fecha=YYYY-MM-DD&carnet=XXXX   (para mapa)
Reglas:
- carnet se obtiene del JWT por defecto
- si viene carnet en query (tracking-raw), validar permiso:
  - mismo carnet: OK
  - supervisor: OK si pertenece a su jerarquía
  - admin: OK

2) Endpoints ADMIN (web)
- GET  /visita-admin/clientes
- POST /visita-admin/clientes
- PUT  /visita-admin/clientes/:id
- POST /visita-admin/importar-clientes
- GET  /visita-admin/agenda?fecha=...&carnet=...
- POST /visita-admin/agenda/asignar
- PUT  /visita-admin/agenda/reordenar
- GET  /visita-admin/visitas?fecha=...&carnet=...
- GET  /visita-admin/dashboard?fecha=...&carnet=...
- GET  /visita-admin/reportes?fecha_inicio=...&fecha_fin=...

3) Seguridad
- Reutilizar motor de visibilidad por organigrama existente.
- Guard común: “puedeVerCarnet(targetCarnet)”.
- Log mínimo de auditoría para acciones sensibles:
  - checkin/checkout fuera geofence
  - tracking batch 0 puntos
  - edición masiva de clientes

4) Idempotencia
- checkin: offline_id evita duplicados
- tracking batch: se acepta duplicado si timestamp igual? (opcional)
  - si quieres anti duplicado: UNIQUE(carnet,timestamp,lat,lon) (cuidado)

================================================================================
E) FRONTEND REACT — PÁGINAS MVP
================================================================================

1) Campo/Mapa Rutas (ya existe VCTrackingPage.tsx)
Objetivo: que muestre ruta real (polyline).
- Consumir /visita-campo/tracking-raw (puntos)
- Dibujar polyline
- Marcador inicio/fin
- FitBounds incluye ruta + clientes
- UI: selector fecha + selector usuario (si rol permite)

2) Admin/Clientes
- Tabla + modal CRUD
- Importar Excel/CSV (mínimo CSV)
- Validación: lat/lon obligatorios para geofence

3) Admin/Agenda
- Por fecha y usuario
- Asignar clientes y orden
- Reordenar (botones arriba/abajo o drag simple)

4) Admin/Visitas
- Tabla con filtros
- Estado, dentro_geocerca, duración, distancia inicio/fin
- Link a Mapa (abrir VCTrackingPage con carnet+fecha)

5) Admin/Dashboard
- KPIs del día/semana
- Alertas (fase posterior)
- Export CSV

Mapas:
- Leaflet por CDN (como ya está)
- Tiles OSM
- No meter librerías gigantes.

================================================================================
F) FLUTTER — OFFLINE FIRST REAL
================================================================================

Confirma que ya existen colas SQLite (visita_local_db.dart).
Si existen, verifica que cubran:
- vc_checkin_queue (offline_id unique)
- vc_checkout_queue
- vc_tracking_queue
- vc_clientes_cache
- vc_agenda_cache

1) Captura GPS
- tracking_service.dart: captar puntos cada N segundos (ej 60s)
- Guardar en vc_tracking_queue
- Guardar accuracy, velocidad, timestamp ISO

2) Pantallas mínimas
- AgendaScreen: lista del día, muestra distancia y estado
- ClienteDetalleScreen: botón Iniciar Visita (checkin)
- CheckinScreen: muestra “dentro/fuera” del radio (visual)
- CheckoutScreen: observación + finalizar visita
- ResumenDiaScreen: KPIs local/servidor

3) SyncWorker (orden de prioridad)
- 1) checkins → 2) checkouts → 3) tracking → 4) uploads evidencia → 5) formularios
- Reintentos con backoff
- Si falla permanente: marcar registro con error y no bloquear el resto

4) Permisos
- Android: location + background (si tracking en background)
- iOS: lo mínimo (si aplica)

================================================================================
G) LO QUE FALTA (GAP) — LISTA OBLIGATORIA A PRODUCIR
================================================================================

Después de auditoría, debes listar TODO lo faltante con:
- Archivo a tocar/crear
- Qué debe contener
- Por qué (impacto en MVP)
- Criterio de aceptación

No omitir nada, incluye:
- SPs no existentes o incompletos
- índices faltantes
- endpoints faltantes
- UI faltante
- validaciones (accuracy/velocidad/saltos)
- permisos jerárquicos
- export
- seeds demo

================================================================================
H) ORDEN DE EJECUCIÓN (PARA ENTREGAR RÁPIDO)
================================================================================

Fase 0: Auditoría + checklist
Fase 1: Tracking raw + polyline en mapa (valor inmediato)
Fase 2: Agenda + clientes + checkin/checkout estable
Fase 3: KPIs + reportes + export
Fase 4: Evidencia (foto/firma) y reglas por cliente
Fase 5: Formularios dinámicos + alertas

REGLA: Termina cada fase con “Cómo probar” paso a paso.

================================================================================
I) TESTING (NO NEGOCIABLE)
================================================================================

1) Offline:
- modo avión: checkin + tracking + checkout
- reconectar: sync
- verificar en web: visita finalizada + ruta

2) Geofence:
- checkin dentro (ok)
- checkin fuera (marca fuera_geofence y alerta)

3) Antiruido:
- accuracy 200m: se descarta
- salto 2km en 10s: se descarta

4) Seguridad:
- usuario solo ve lo suyo
- supervisor ve su equipo
- admin ve todo

================================================================================
J) ENTREGABLES EXACTOS
================================================================================

Al final debe existir:
- Scripts SQL listos (DDL + SP + índices + seeds demo)
- Backend compila y endpoints listos
- Frontend build OK, mapa con ruta real
- Flutter build OK, offline + sync OK
- Documento “Demo”:
  1) importar clientes
  2) asignar agenda
  3) salir a campo y registrar visita + tracking
  4) ver mapa ruta + KPIs
  5) export reportes

================================================================================
K) EJECUTA YA
================================================================================

PASO 1: Auditoría y reporte YA_EXISTE/FALTA/RIESGOS.
PASO 2: Implementa Fase 1 completa:
- sp_vc_tracking_por_dia
- GET /visita-campo/tracking-raw
- polyline en VCTrackingPage
PASO 3: Pruebas Fase 1 (documentadas).
PASO 4: Sigue Fase 2 y así sucesivamente.

FIN DEL PROMPT