# 📱 PLAN DE TRABAJO DETALLADO: Completar Flutter Móvil al 100%

**Proyecto:** Momentus Mobile (flutter_movil)  
**Fecha:** 5 de Febrero, 2026  
**Objetivo:** Documento ultra-detallado para que cualquier desarrollador o IA complete el proyecto

---

## 📚 GLOSARIO DE TÉRMINOS

| Término | Significado |
|---------|-------------|
| **MVP** | **Minimum Viable Product** - Producto Mínimo Viable. Es la versión más básica de un producto que tiene suficientes funcionalidades para ser usable por usuarios reales y generar retroalimentación. |
| **Offline-First** | Estrategia donde la app guarda datos localmente primero y sincroniza con el servidor después. Permite trabajar sin conexión. |
| **Sync Queue** | Cola de sincronización. Lista de operaciones pendientes de enviar al servidor. |
| **Backoff Exponencial** | Estrategia de reintentos donde el tiempo de espera entre intentos se duplica (1s, 2s, 4s, 8s...). |
| **FCM** | Firebase Cloud Messaging - Servicio de Google para enviar notificaciones push a dispositivos Android. |
| **APNs** | Apple Push Notification service - Servicio de Apple para enviar notificaciones push a dispositivos iOS. |
| **JWT** | JSON Web Token - Estándar para tokens de autenticación. |
| **SQLite** | Base de datos local embebida que no requiere servidor. |
| **Provider** | Librería de Flutter para manejo de estado (State Management). |

---

## 🏗️ ARQUITECTURA DEL PROYECTO

### Estructura de Directorios

```
flutter_movil/
├── lib/
│   ├── main.dart                 # Punto de entrada
│   ├── app.dart                  # Configuración de la app
│   │
│   ├── core/                     # INFRAESTRUCTURA COMPARTIDA
│   │   ├── config/
│   │   │   └── app_config.dart   # URLs, timeouts, configuración
│   │   ├── network/
│   │   │   ├── api_client.dart   # Cliente HTTP con interceptores
│   │   │   ├── api_utils.dart    # Funciones helper para API
│   │   │   └── cache_store.dart  # Almacenamiento de caché
│   │   └── theme/
│   │       └── app_theme.dart    # Tema visual de la app
│   │
│   └── features/                 # MÓDULOS FUNCIONALES
│       ├── auth/                 # Autenticación
│       ├── agenda/               # Pantalla Hoy/Agenda
│       ├── assignment/           # Mi Asignación
│       ├── pending/              # Pendientes
│       ├── projects/             # Proyectos
│       ├── team/                 # Equipos
│       ├── reports/              # Dashboard/Reportes
│       ├── notes/                # Notas de reunión
│       ├── sync/                 # Sincronización
│       ├── settings/             # Ajustes
│       ├── tasks/                # Gestión de tareas (CRUD completo)
│       ├── home/                 # Shell principal con navegación
│       └── common/               # Servicios compartidos
```

### Patrón por Feature

Cada feature sigue esta estructura:
```
feature_name/
├── data/                         # Capa de datos
│   ├── local/                    # Acceso a SQLite
│   ├── remote/                   # Acceso a API
│   └── repositories/             # Abstracción que une local + remote
├── domain/                       # Capa de negocio
│   └── models/                   # Modelos/Entidades
└── presentation/                 # Capa de UI
    ├── screens/                  # Pantallas (Widgets)
    └── controllers/              # Controladores de estado
```

---

## 📊 ANÁLISIS DETALLADO POR MÓDULO

---

### 🔐 MÓDULO: AUTH (Autenticación)

**Archivos:**
- `lib/features/auth/data/auth_repository.dart` (72 líneas)
- `lib/features/auth/domain/session_user.dart`
- `lib/features/auth/presentation/auth_controller.dart` (56 líneas)
- `lib/features/auth/presentation/login_screen.dart` (76 líneas)

**Estado Actual:** 88% ✅

**¿Qué FUNCIONA?**
1. ✅ Login con email y contraseña via `POST /auth/login`
2. ✅ Guardado seguro de tokens (access_token y refresh_token) en FlutterSecureStorage
3. ✅ Restauración de sesión al reabrir la app
4. ✅ Inyección automática del token en cada request
5. ✅ Renovación automática de token cuando expira (401 → refresh → retry)
6. ✅ Logout con limpieza de tokens

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| AUTH-1 | Pantalla de Recuperación de Contraseña | Media | Baja | 2-3 horas |
| AUTH-2 | Validación de formulario en login | Baja | Baja | 1 hora |
| AUTH-3 | Indicador de "Recordar contraseña" | Baja | Baja | 30 min |

**INSTRUCCIONES DETALLADAS PARA AUTH-1 (Recuperación de Contraseña):**

```dart
// CREAR ARCHIVO: lib/features/auth/presentation/forgot_password_screen.dart

// La pantalla debe:
// 1. Tener un TextField para ingresar email
// 2. Botón "Enviar enlace de recuperación"
// 3. Llamar a POST /auth/forgot-password con { "correo": email }
// 4. Mostrar mensaje de éxito o error
// 5. Botón "Volver a Login"

// En login_screen.dart agregar TextButton debajo del ElevatedButton:
// TextButton(
//   onPressed: () => Navigator.push(context, MaterialPageRoute(
//     builder: (_) => const ForgotPasswordScreen()
//   )),
//   child: const Text('¿Olvidaste tu contraseña?'),
// )
```

---

### 📅 MÓDULO: AGENDA (Hoy/Día)

**Archivos:**
- `lib/features/agenda/presentation/agenda_screen.dart` (116 líneas)

**Estado Actual:** 86% ✅

**¿Qué FUNCIONA?**
1. ✅ Consumo de `GET /mi-dia?fecha=YYYY-MM-DD`
2. ✅ Fallback automático a caché local cuando no hay red
3. ✅ Muestra métricas: tareas sugeridas, backlog, bloqueos
4. ✅ Lista de tareas del día
5. ✅ Indicador visual cuando se muestra caché

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| AGE-1 | Bitácora/Historial del día | Media | Media | 4 horas |
| AGE-2 | Vista de calendario (seleccionar fecha) | Media | Media | 4 horas |
| AGE-3 | Acciones rápidas por tarea (marcar hecha, posponer) | Alta | Media | 3 horas |
| AGE-4 | Pull-to-refresh | Baja | Baja | 30 min |

**INSTRUCCIONES DETALLADAS PARA AGE-3 (Acciones Rápidas):**

```dart
// MODIFICAR: lib/features/agenda/presentation/agenda_screen.dart

// En el ListTile de cada tarea, agregar trailing con IconButton:
// trailing: IconButton(
//   icon: const Icon(Icons.check_circle_outline),
//   onPressed: () => _markDone(task),
// ),

// Agregar método:
Future<void> _markDone(Map<String, dynamic> task) async {
  final id = task['idTarea'] ?? task['id'];
  if (id == null) return;

  try {
    await ApiClient.dio.patch('/tareas/$id', data: {'estado': 'Hecha'});
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tarea completada'))
      );
    }
    setState(() => _future = _fetchAgenda()); // Recargar
  } catch (_) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error al actualizar'))
      );
    }
  }
}
```

---

### ✅ MÓDULO: PENDIENTES

**Archivos:**
- `lib/features/pending/presentation/pending_screen.dart` (118 líneas)

**Estado Actual:** 89% ✅

**¿Qué FUNCIONA?**
1. ✅ Consumo de `GET /tareas/mias?estado=Pendiente`
2. ✅ Fallback a caché local
3. ✅ Acción rápida "Marcar como hecha" via `PATCH /tareas/:id`
4. ✅ Lista de tareas con título y descripción

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| PEN-1 | Filtros por proyecto | Media | Media | 2 horas |
| PEN-2 | Filtros por fecha (hoy, esta semana, atrasadas) | Media | Media | 2 horas |
| PEN-3 | Filtros por prioridad | Baja | Baja | 1 hora |
| PEN-4 | Búsqueda por texto | Media | Baja | 1 hora |
| PEN-5 | Pull-to-refresh | Baja | Baja | 30 min |

**INSTRUCCIONES DETALLADAS PARA PEN-1 y PEN-2 (Filtros):**

```dart
// MODIFICAR: lib/features/pending/presentation/pending_screen.dart

// 1. Agregar variables de estado:
String _filterProject = 'Todos';
String _filterDate = 'Todas';
List<String> _projectNames = ['Todos'];

// 2. Extraer proyectos únicos de las tareas:
void _extractProjects(List<dynamic> tasks) {
  final names = tasks
      .map((t) => (t['proyectoNombre'] ?? 'Sin proyecto').toString())
      .toSet()
      .toList();
  _projectNames = ['Todos', ...names];
}

// 3. Agregar Row de filtros arriba del ListView:
SingleChildScrollView(
  scrollDirection: Axis.horizontal,
  padding: const EdgeInsets.symmetric(horizontal: 12),
  child: Row(
    children: [
      ChoiceChip(label: Text('Hoy'), selected: _filterDate == 'Hoy', onSelected: (_) => setState(() => _filterDate = 'Hoy')),
      ChoiceChip(label: Text('Esta semana'), selected: _filterDate == 'Semana', onSelected: (_) => setState(() => _filterDate = 'Semana')),
      ChoiceChip(label: Text('Atrasadas'), selected: _filterDate == 'Atrasadas', onSelected: (_) => setState(() => _filterDate = 'Atrasadas')),
      ChoiceChip(label: Text('Todas'), selected: _filterDate == 'Todas', onSelected: (_) => setState(() => _filterDate = 'Todas')),
    ],
  ),
),

// 4. Filtrar la lista según selección antes de mostrar
```

---

### 📂 MÓDULO: PROYECTOS

**Archivos:**
- `lib/features/projects/presentation/projects_screen.dart` (151 líneas)

**Estado Actual:** 88% ✅

**¿Qué FUNCIONA?**
1. ✅ Consumo de `GET /planning/my-projects`
2. ✅ Fallback a caché local
3. ✅ Lista de proyectos con nombre y descripción
4. ✅ Detalle básico: muestra tareas del proyecto via `GET /proyectos/:id/tareas`

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| PRO-1 | Pantalla de detalle completo (no solo modal) | Media | Media | 4 horas |
| PRO-2 | Vista de timeline simplificada | Media | Alta | 6 horas |
| PRO-3 | Indicadores de progreso del proyecto | Baja | Baja | 2 horas |
| PRO-4 | Búsqueda de proyectos | Baja | Baja | 1 hora |

**INSTRUCCIONES DETALLADAS PARA PRO-1 (Detalle Completo):**

```dart
// CREAR ARCHIVO: lib/features/projects/presentation/project_detail_screen.dart

class ProjectDetailScreen extends StatefulWidget {
  final Map<String, dynamic> project;
  const ProjectDetailScreen({super.key, required this.project});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  late Future<List<dynamic>> _tasksFuture;

  @override
  void initState() {
    super.initState();
    _tasksFuture = _fetchTasks();
  }

  Future<List<dynamic>> _fetchTasks() async {
    final id = widget.project['idProyecto'] ?? widget.project['id'];
    final response = await ApiClient.dio.get('/proyectos/$id/tareas');
    return unwrapApiList(response.data);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.project['nombre']?.toString() ?? 'Proyecto'),
      ),
      body: Column(
        children: [
          // Header con info del proyecto
          Card(
            margin: EdgeInsets.all(16),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Descripción: ${widget.project['descripcion'] ?? 'Sin descripción'}'),
                  Text('Estado: ${widget.project['estado'] ?? '-'}'),
                  Text('Fecha inicio: ${widget.project['fechaInicio'] ?? '-'}'),
                  Text('Fecha fin: ${widget.project['fechaFin'] ?? '-'}'),
                ],
              ),
            ),
          ),
          // Lista de tareas
          Expanded(
            child: FutureBuilder(/* ... */),
          ),
        ],
      ),
    );
  }
}

// En projects_screen.dart, cambiar onTap para navegar:
// onTap: () => Navigator.push(context, MaterialPageRoute(
//   builder: (_) => ProjectDetailScreen(project: p)
// )),
```

---

### 👥 MÓDULO: EQUIPOS

**Archivos:**
- `lib/features/team/presentation/team_screen.dart` (152 líneas)

**Estado Actual:** 86% ✅

**¿Qué FUNCIONA?**
1. ✅ Consumo de `GET /planning/team`
2. ✅ Fallback a caché local
3. ✅ Lista de miembros con nombre y correo
4. ✅ Detalle básico: tareas asignadas via `GET /equipo/miembro/:id/tareas`

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| TEA-1 | Pantalla de agenda por miembro | Media | Media | 4 horas |
| TEA-2 | Vista de bloqueos del equipo | Media | Media | 3 horas |
| TEA-3 | Indicadores de carga de trabajo | Baja | Media | 3 horas |
| TEA-4 | Búsqueda de miembros | Baja | Baja | 1 hora |

**INSTRUCCIONES DETALLADAS PARA TEA-2 (Bloqueos):**

```dart
// CREAR ARCHIVO: lib/features/team/presentation/team_blockers_screen.dart

// Consumir: GET /equipo/bloqueos
// Mostrar lista con:
// - Título del bloqueo
// - Usuario afectado
// - Fecha de creación
// - Estado (activo/resuelto)

// Agregar a home_shell.dart en el Drawer:
// _drawerItem('Bloqueos del Equipo', const TeamBlockersScreen()),
```

---

### 📊 MÓDULO: REPORTS (Dashboard)

**Archivos:**
- `lib/features/reports/presentation/reports_screen.dart` (98 líneas)

**Estado Actual:** 82% ✅

**¿Qué FUNCIONA?**
1. ✅ Consumo de `GET /planning/stats?mes=X&anio=Y`
2. ✅ Fallback a caché local
3. ✅ Muestra estadísticas en lista de key-value

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| REP-1 | Gráficas visuales (barras, pie chart) | Media | Alta | 6 horas |
| REP-2 | Selector de período (mes/año) | Media | Baja | 2 horas |
| REP-3 | Comparativos con período anterior | Baja | Media | 3 horas |
| REP-4 | KPIs destacados en cards | Media | Baja | 2 horas |

**INSTRUCCIONES DETALLADAS PARA REP-1 (Gráficas):**

```yaml
# Agregar dependencia en pubspec.yaml:
dependencies:
  fl_chart: ^0.68.0  # Librería de gráficas para Flutter
```

```dart
// MODIFICAR: lib/features/reports/presentation/reports_screen.dart

import 'package:fl_chart/fl_chart.dart';

// En build(), agregar gráfica de barras:
Widget _buildBarChart(Map<String, dynamic> data) {
  final entries = data.entries.where((e) => e.value is num).toList();
  
  return SizedBox(
    height: 200,
    child: BarChart(
      BarChartData(
        barGroups: entries.asMap().entries.map((e) {
          return BarChartGroupData(
            x: e.key,
            barRods: [
              BarChartRodData(
                toY: (e.value.value as num).toDouble(),
                color: Colors.green,
              ),
            ],
          );
        }).toList(),
      ),
    ),
  );
}
```

---

### 📝 MÓDULO: NOTAS

**Archivos:**
- `lib/features/notes/presentation/notes_screen.dart` (110 líneas)

**Estado Actual:** 75% ⚠️

**¿Qué FUNCIONA?**
1. ✅ CRUD completo local (Crear, Leer, Actualizar, Eliminar)
2. ✅ Guardado en SQLite (tabla `notes`)
3. ✅ Modal para crear/editar nota
4. ✅ Lista ordenada por fecha

**¿Qué FALTA?** (CRÍTICO)

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| NOT-1 | Sincronización con servidor (OPCIONAL) | Baja | Alta | 8 horas |
| NOT-2 | Campo para vincular nota a proyecto | Media | Baja | 2 horas |
| NOT-3 | Búsqueda de notas | Baja | Baja | 1 hora |

**INSTRUCCIONES DETALLADAS PARA NOT-1 (Sincronización):**

```
PASO 1: CREAR ENDPOINT EN BACKEND (planning.controller.ts)

// Agregar en PlanningController:
@Post('notes')
@ApiOperation({ summary: 'Crear nota móvil' })
async createNote(@Request() req: any, @Body() body: any) {
  return await this.planningService.createNote(req.user.carnet, body);
}

@Get('notes')
@ApiOperation({ summary: 'Obtener notas del usuario' })
async getNotes(@Request() req: any) {
  return await this.planningService.getNotes(req.user.carnet);
}

@Put('notes/:id')
@ApiOperation({ summary: 'Actualizar nota' })
async updateNote(@Param('id') id: number, @Body() body: any) {
  return await this.planningService.updateNote(id, body);
}

@Delete('notes/:id')
@ApiOperation({ summary: 'Eliminar nota' })
async deleteNote(@Param('id') id: number) {
  return await this.planningService.deleteNote(id);
}
```

```
PASO 2: CREAR TABLA EN SQL SERVER

CREATE TABLE p_NotasMobile (
  idNota INT IDENTITY(1,1) PRIMARY KEY,
  carnet NVARCHAR(20) NOT NULL,
  titulo NVARCHAR(200) NOT NULL,
  contenido NVARCHAR(MAX),
  fechaCreacion DATETIME2 DEFAULT GETDATE(),
  fechaActualizacion DATETIME2 DEFAULT GETDATE(),
  activo BIT DEFAULT 1
);

CREATE INDEX IX_NotasMobile_Carnet ON p_NotasMobile(carnet, activo);
```

```dart
// PASO 3: MODIFICAR notes_screen.dart PARA SINCRONIZAR

// Agregar método de sync:
Future<void> _syncNotes() async {
  final db = await LocalDatabase.instance.database;
  final localNotes = await db.query('notes');
  
  for (final note in localNotes) {
    final remoteId = note['remote_id'];
    if (remoteId == null) {
      // Nota nueva, crear en servidor
      final response = await ApiClient.dio.post('/planning/notes', data: {
        'titulo': note['titulo'],
        'contenido': note['contenido'],
      });
      final newId = response.data['data']['idNota'];
      await db.update('notes', {'remote_id': newId}, 
        where: 'id = ?', whereArgs: [note['id']]);
    }
  }
}

// Agregar columna remote_id a tabla local:
// ALTER TABLE notes ADD COLUMN remote_id INTEGER;
```

---

### 🔄 MÓDULO: SYNC (Sincronización)

**Archivos:**
- `lib/features/sync/presentation/sync_screen.dart` (97 líneas)

**Estado Actual:** 95% ✅

**¿Qué FUNCIONA?**
1. ✅ Pantalla de estado de sincronización
2. ✅ Muestra eventos sincronizados, pendientes, última sync
3. ✅ Botón "Sincronizar ahora"
4. ✅ Muestra errores de sync en rojo
5. ✅ Auto-sync al volver a foreground
6. ✅ Auto-sync al recuperar conectividad (con debounce)

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| SYN-1 | **Background sync (Android WorkManager)** | **ALTA** | **ALTA** | **8 horas** |
| SYN-2 | Background sync (iOS BGTaskScheduler) | Alta | Alta | 6 horas |
| SYN-3 | Log de historial de sync | Baja | Baja | 2 horas |

**INSTRUCCIONES DETALLADAS PARA SYN-1 (Background Sync Android):**

```yaml
# Agregar dependencia en pubspec.yaml:
dependencies:
  workmanager: ^0.5.2
```

```dart
// CREAR ARCHIVO: lib/core/background/background_sync.dart

import 'package:workmanager/workmanager.dart';

const taskSyncPeriodic = 'momentus_sync_periodic';

void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == taskSyncPeriodic) {
      // Ejecutar sync (necesita inicializar DB y ApiClient)
      try {
        // ... lógica de sync
        return Future.value(true);
      } catch (e) {
        return Future.value(false);
      }
    }
    return Future.value(true);
  });
}

Future<void> initBackgroundSync() async {
  await Workmanager().initialize(callbackDispatcher, isInDebugMode: false);
  await Workmanager().registerPeriodicTask(
    'sync-tasks',
    taskSyncPeriodic,
    frequency: const Duration(minutes: 15),
    constraints: Constraints(
      networkType: NetworkType.connected,
      requiresBatteryNotLow: true,
    ),
  );
}

// En main.dart, llamar initBackgroundSync() después de runApp
```

---

### ⚙️ MÓDULO: SETTINGS (Ajustes)

**Archivos:**
- `lib/features/settings/presentation/settings_screen.dart` (121 líneas)
- `lib/features/settings/data/notification_preferences_service.dart`

**Estado Actual:** 72% ⚠️

**¿Qué FUNCIONA?**
1. ✅ Preferencias de notificaciones (activar/desactivar)
2. ✅ Control de alertas de asignación
3. ✅ Control de recordatorios de pendientes
4. ✅ Persistencia local de preferencias

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| SET-1 | **Integración FCM/APNs (INFRAESTRUCTURA)** | **CRITICA** | **ALTA** | **10 horas** |
| SET-2 | **DISPARADOR: Notificación al asignar tarea** | **CRITICA** | **MEDIA** | **4 horas** |
| SET-3 | Biometría (huella/Face ID) | Media | Media | 4 horas |
| SET-4 | Selector de idioma | Baja | Baja | 2 horas |
| SET-5 | Selector de tema (claro/oscuro) | Baja | Baja | 2 horas |
| SET-6 | PIN local / cierre por inactividad | Media | Media | 4 horas |

**INSTRUCCIONES DETALLADAS PARA SET-1 (Push Notifications):**

```yaml
# Agregar dependencias en pubspec.yaml:
dependencies:
  firebase_core: ^2.27.0
  firebase_messaging: ^14.7.15
```

```dart
// CREAR ARCHIVO: lib/core/notifications/push_service.dart

import 'package:firebase_messaging/firebase_messaging.dart';

class PushService {
  static final PushService _instance = PushService._();
  static PushService get instance => _instance;
  PushService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> initialize() async {
    // Solicitar permisos
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Obtener token FCM
      final token = await _messaging.getToken();
      print('FCM Token: $token');
      
      // TODO: Enviar token al backend para asociarlo al usuario
      // await ApiClient.dio.post('/users/fcm-token', data: {'token': token});
    }

    // Escuchar mensajes en foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Mensaje recibido: ${message.notification?.title}');
      // Mostrar notificación local
    });
  }
}

// En main.dart:
// await Firebase.initializeApp();
// await PushService.instance.initialize();
```

**INSTRUCCIONES DETALLADAS PARA SET-2 (Biometría):**

```yaml
# Agregar dependencia en pubspec.yaml:
dependencies:
  local_auth: ^2.2.0
```

```dart
// CREAR ARCHIVO: lib/core/security/biometric_service.dart

import 'package:local_auth/local_auth.dart';

class BiometricService {
  final LocalAuthentication _auth = LocalAuthentication();

  Future<bool> isAvailable() async {
    final canCheck = await _auth.canCheckBiometrics;
    final isDeviceSupported = await _auth.isDeviceSupported();
    return canCheck && isDeviceSupported;
  }

  Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Autentícate para acceder a Momentus',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } catch (e) {
      return false;
    }
  }
}

// En settings_screen.dart, agregar toggle para activar biometría
// Guardar preferencia en FlutterSecureStorage
// En app.dart, verificar al iniciar si biometría está activada
```

---

### 📋 MÓDULO: MI ASIGNACIÓN

**Archivos:**
- `lib/features/assignment/presentation/my_assignment_screen.dart` (187 líneas)

**Estado Actual:** 92% ✅

**¿Qué FUNCIONA?**
1. ✅ Consumo de `GET /tareas/mias`
2. ✅ Fallback a caché local
3. ✅ Filtro por estado (Todas, Pendiente, EnCurso, Hecha)
4. ✅ Búsqueda por texto
5. ✅ Acción "Marcar hecha"
6. ✅ Chips de estado con colores

**¿Qué FALTA?**

| # | Tarea | Prioridad | Complejidad | Tiempo Est. |
|---|-------|-----------|-------------|-------------|
| ASI-1 | Pantalla de detalle de asignación | Media | Media | 3 horas |
| ASI-2 | Acciones adicionales (posponer, agregar comentario) | Media | Media | 4 horas |
| ASI-3 | Indicador de prioridad visual | Baja | Baja | 1 hora |

---

## 📋 RESUMEN DE TAREAS PENDIENTES

### 🔴 PRIORIDAD CRÍTICA (Bloqueantes para Release)

| ID | Módulo | Tarea | Tiempo |
|----|--------|-------|--------|
| SET-1 | Settings | Integración FCM/APNs (Infra) | 10h |
| SET-2 | Settings | DISPARADOR: Notificación al asignar | 4h |
| SYN-1 | Sync | Background sync Android | 8h |

**Total Crítico: ~22 horas**

### 🟡 PRIORIDAD ALTA (Importante para UX)

| ID | Módulo | Tarea | Tiempo |
|----|--------|-------|--------|
| AGE-3 | Agenda | Acciones rápidas por tarea | 3h |
| AUTH-1 | Auth | Recuperación de contraseña | 3h |
| SYN-2 | Sync | Background sync iOS | 6h |
| SET-3 | Settings | Biometría | 4h |

**Total Alta: ~16 horas**

### 🟢 PRIORIDAD MEDIA (Mejoras de Funcionalidad)

| ID | Módulo | Tarea | Tiempo |
|----|--------|-------|--------|
| PEN-1 | Pendientes | Filtros por proyecto | 2h |
| PEN-2 | Pendientes | Filtros por fecha | 2h |
| PRO-1 | Proyectos | Detalle completo | 4h |
| REP-1 | Reports | Gráficas visuales | 6h |
| AGE-1 | Agenda | Bitácora | 4h |
| AGE-2 | Agenda | Calendario | 4h |
| TEA-1 | Team | Agenda por miembro | 4h |
| TEA-2 | Team | Bloqueos del equipo | 3h |

**Total Media: ~29 horas**

### 🔵 PRIORIDAD BAJA (Nice to Have)

| ID | Módulo | Tarea | Tiempo |
|----|--------|-------|--------|
| SET-3 | Settings | Selector idioma | 2h |
| SET-4 | Settings | Tema claro/oscuro | 2h |
| PEN-4 | Pendientes | Búsqueda | 1h |
| PRO-4 | Proyectos | Búsqueda | 1h |
| REP-4 | Reports | KPIs en cards | 2h |
| Varios | Varios | Pull-to-refresh | 2h |

**Total Baja: ~10 horas**

---

## ⏱️ CRONOGRAMA SUGERIDO

### Semana 1: Notificaciones (El foco actual)
- [ ] SET-1: FCM/APNs (Configuración inicial) (10h)
- [ ] SET-2: Backend Trigger - Notificar al asignar tarea (4h)

### Semana 2: Críticos + Alta Prioridad
- [ ] SYN-1: Background sync Android (8h)
- [ ] AGE-3: Acciones rápidas agenda (3h)
- [ ] AUTH-1: Recuperación contraseña (3h)

### Semana 3: Alta + Media Prioridad
- [ ] SYN-2: Background sync iOS (6h)
- [ ] SET-2: Biometría (4h)
- [ ] PEN-1/PEN-2: Filtros pendientes (4h)
- [ ] PRO-1: Detalle proyecto (4h)

### Semana 4: Media Prioridad
- [ ] REP-1: Gráficas dashboard (6h)
- [ ] AGE-1/AGE-2: Bitácora + Calendario (8h)
- [ ] TEA-1/TEA-2: Team features (7h)

### Semana 5: QA + Baja Prioridad
- [ ] Tests E2E
- [ ] Corrección de bugs
- [ ] Tareas de baja prioridad restantes

---

## 🧪 CHECKLIST DE QA ANTES DE RELEASE

### Funcionalidad Offline
- [ ] Abrir app sin internet → debe mostrar caché
- [ ] Crear tarea sin internet → debe guardarse local
- [ ] Reconectar internet → debe sincronizar automáticamente
- [ ] Ver indicador "Sin conexión" cuando corresponda

### Seguridad
- [ ] Login con credenciales válidas → acceso correcto
- [ ] Login con credenciales inválidas → mensaje de error
- [ ] Token expirado → refresh automático sin logout
- [ ] Logout → tokens eliminados de almacenamiento seguro

### Sincronización
- [ ] Eventos pendientes se sincronizan al reconectar
- [ ] Errores de sync muestran mensaje al usuario
- [ ] Pantalla de sync muestra estado correcto

### UX General
- [ ] App abre sin crashear
- [ ] Navegación entre pantallas fluida
- [ ] Datos se cargan correctamente en cada módulo
- [ ] Pull-to-refresh funciona donde aplica

---

## 📞 ENDPOINTS BACKEND REQUERIDOS

### Ya Existentes (Funcionando)
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /mi-dia`
- `GET /tareas/mias`
- `PATCH /tareas/:id`
- `GET /planning/my-projects`
- `GET /planning/team`
- `GET /planning/stats`
- `GET /proyectos/:id/tareas`
- `GET /equipo/miembro/:id/tareas`
- `POST /mobile/sync/tasks`

### Pendientes de Crear
- `POST /auth/forgot-password` - Recuperación de contraseña
- `GET /planning/notes` - Obtener notas del usuario
- `POST /planning/notes` - Crear nota
- `PUT /planning/notes/:id` - Actualizar nota
- `DELETE /planning/notes/:id` - Eliminar nota
- `POST /users/fcm-token` - Registrar token de push
- `GET /equipo/bloqueos` - Bloqueos del equipo

---

## 🎯 CRITERIO DE "100% COMPLETADO"

El proyecto se considera 100% completado cuando:

1. ✅ Todos los módulos del MVP funcionan con datos reales
2. ✅ Sincronización offline/online funciona perfectamente
3. ✅ Push notifications funcionan en Android y iOS
4. ✅ Background sync activo
5. ✅ Notas sincronizadas con servidor
6. ✅ Biometría disponible como opción
7. ✅ QA completo sin bugs críticos
8. ✅ App lista para stores (App Store / Play Store)

---

*Documento generado para handoff completo del proyecto Flutter Móvil*
*Cualquier IA o desarrollador puede seguir estas instrucciones para completar el proyecto*
