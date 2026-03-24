# ══════════════════════════════════════════════════════════════════════════════
# 📱 DOCUMENTACIÓN TÉCNICA COMPLETA: MOMENTUS MOBILE (Flutter)
# Proyecto: flutter_movil - Aplicación Móvil Nativa
# Fecha: 8 de Febrero de 2026
# Versión del Documento: 1.0
# ══════════════════════════════════════════════════════════════════════════════

## 📋 ÍNDICE GENERAL

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Especificaciones Técnicas](#2-especificaciones-técnicas)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Inventario de Módulos](#4-inventario-de-módulos)
5. [Integración con Backend](#5-integración-con-backend)
6. [Estrategia Offline-First](#6-estrategia-offline-first)
7. [Estado de Implementación Detallado](#7-estado-de-implementación-detallado)
8. [Plan de Completitud al 100%](#8-plan-de-completitud-al-100)
9. [Guía de Instalación y Ejecución](#9-guía-de-instalación-y-ejecución)
10. [Cronograma de Desarrollo](#10-cronograma-de-desarrollo)
11. [Riesgos y Mitigaciones](#11-riesgos-y-mitigaciones)
12. [Checklist de Producción](#12-checklist-de-producción)

---

# 1. RESUMEN EJECUTIVO

## 1.1 ¿Qué es Momentus Mobile?

**Momentus Mobile** es la aplicación móvil nativa del sistema de gestión de productividad Clarity/Momentus. Desarrollada en **Flutter**, permite a los usuarios:

- Realizar check-in diario y ver su agenda desde cualquier lugar
- Gestionar tareas pendientes con acciones rápidas
- Consultar proyectos y estado del equipo
- Trabajar sin conexión a internet (offline-first)
- Sincronizar cambios automáticamente al recuperar conectividad

## 1.2 Tecnologías Principales

| Componente | Tecnología | Versión |
|:-----------|:-----------|:--------|
| **Framework** | Flutter | 3.3.0+ |
| **Lenguaje** | Dart | Incluido en Flutter |
| **Base de Datos Local** | SQLite (sqflite) | 2.3.3+ |
| **Cliente HTTP** | Dio | 5.7.0 |
| **Estado Global** | Provider | 6.1.2 |
| **Almacenamiento Seguro** | flutter_secure_storage | 9.2.2 |
| **Conectividad** | connectivity_plus | 6.1.0 |

## 1.3 Estadísticas del Código

| Métrica | Valor |
|:--------|------:|
| Archivos Dart | 30 |
| Líneas de Código (aprox.) | ~2,500 |
| Módulos Funcionales | 13 |
| Endpoints Integrados | 11 |
| Dependencias Externas | 8 |
| Documentos de Apoyo | 11 |

## 1.4 Estado General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ESTADO ACTUAL DEL PROYECTO: 86% IMPLEMENTADO                         │
│                                                                         │
│   ████████████████████████████████████████████████████░░░░░░░░░  86%   │
│                                                                         │
│   ✅ Core funcional: Auth, Agenda, Tareas, Proyectos, Equipo           │
│   ✅ Offline-first operativo                                           │
│   ⚠️ Pendiente: Push notifications, Background sync, Notas sync        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 2. ESPECIFICACIONES TÉCNICAS

## 2.1 Requisitos del Sistema de Desarrollo

### Windows
| Componente | Requisito |
|:-----------|:----------|
| Sistema Operativo | Windows 10 64-bit o superior |
| RAM | 8 GB mínimo (16 GB recomendado) |
| Disco | 10 GB libres para Flutter SDK + herramientas |
| Flutter SDK | ≥3.3.0, <4.0.0 |
| Android Studio | Última versión estable |
| Java JDK | 11 (incluido con Android Studio) |

### macOS (para desarrollo iOS)
| Componente | Requisito |
|:-----------|:----------|
| Sistema Operativo | macOS Monterey 12.0 o superior |
| Xcode | 14.0 o superior |
| CocoaPods | Última versión |
| Simulator iOS | iOS 15+ |

## 2.2 Requisitos de Dispositivos Objetivo

### Android
| Especificación | Requisito |
|:---------------|:----------|
| Versión Mínima | Android 6.0 (API 23) |
| Versión Recomendada | Android 10+ (API 29+) |
| Arquitecturas | arm64-v8a, armeabi-v7a, x86_64 |
| RAM Mínima | 2 GB |
| Almacenamiento | 100 MB libres |

### iOS
| Especificación | Requisito |
|:---------------|:----------|
| Versión Mínima | iOS 12.0 |
| Versión Recomendada | iOS 15+ |
| Dispositivos | iPhone 6s y posteriores |
| Almacenamiento | 100 MB libres |

## 2.3 Dependencias Externas (pubspec.yaml)

```yaml
name: flutter_movil
version: 0.1.0+1
description: Momentus Mobile - app nativa Flutter con experiencia offline-first.
publish_to: 'none'

environment:
  sdk: '>=3.3.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # UI
  cupertino_icons: ^1.0.8         # Iconos estilo iOS
  
  # State Management
  provider: ^6.1.2                 # Gestión de estado reactivo
  
  # Networking
  dio: ^5.7.0                      # Cliente HTTP avanzado
  connectivity_plus: ^6.1.0        # Detección de conectividad
  
  # Storage
  sqflite: ^2.3.3+1                # Base de datos SQLite
  path: ^1.9.0                     # Utilidades de rutas
  path_provider: ^2.1.4            # Acceso a directorios del sistema
  flutter_secure_storage: ^9.2.2   # Almacenamiento seguro (tokens)
  
  # Utilities
  intl: ^0.19.0                    # Formato de fechas e i18n

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
```

---

# 3. ARQUITECTURA DEL SISTEMA

## 3.1 Estructura de Directorios

```
flutter_movil/
│
├── docs/                              # 📚 Documentación del proyecto
│   ├── ANALISIS_COMPLETO_PROYECTO.md  # Análisis técnico detallado
│   ├── BACKEND_REUSE_MAP.md           # Mapeo de endpoints backend
│   ├── CHECKLIST_FINAL_LOCAL.md       # Checklist de verificación
│   ├── ESTADO_IMPLEMENTACION_MOVIL.md # Estado por módulo
│   ├── MAPA_FUNCIONAL_WEB_A_MOVIL.md  # Mapeo funcional web→móvil
│   ├── PLAN_COMPLETAR_100_PORCIENTO.md # Plan de completitud
│   └── ... (5 más)
│
├── lib/                               # 🎯 Código fuente principal
│   ├── main.dart                      # Punto de entrada de la app
│   ├── app.dart                       # Configuración de la app
│   │
│   ├── core/                          # 🔧 Infraestructura compartida
│   │   ├── config/
│   │   │   └── app_config.dart        # "API_BASE_URL", timeouts
│   │   ├── network/
│   │   │   ├── api_client.dart        # Cliente HTTP con interceptores
│   │   │   ├── api_utils.dart         # Helpers de deserialización
│   │   │   └── cache_store.dart       # Sistema de caché local
│   │   └── theme/
│   │       └── app_theme.dart         # Tema visual (colores, tipografía)
│   │
│   └── features/                      # 📦 Módulos funcionales
│       ├── auth/                      # 🔐 Autenticación
│       │   ├── data/                  # AuthRepository
│       │   ├── domain/                # SessionUser model
│       │   └── presentation/          # LoginScreen, AuthController
│       │
│       ├── agenda/                    # 📅 Vista Hoy/Agenda
│       │   └── presentation/          # AgendaScreen
│       │
│       ├── assignment/                # 📋 Mi Asignación
│       │   └── presentation/          # MyAssignmentScreen
│       │
│       ├── pending/                   # ✅ Tareas Pendientes
│       │   └── presentation/          # PendingScreen
│       │
│       ├── projects/                  # 📂 Proyectos
│       │   └── presentation/          # ProjectsScreen
│       │
│       ├── team/                      # 👥 Mi Equipo
│       │   └── presentation/          # TeamScreen
│       │
│       ├── reports/                   # 📊 Dashboard/Reportes
│       │   └── presentation/          # ReportsScreen
│       │
│       ├── notes/                     # 📝 Notas de Reunión
│       │   └── presentation/          # NotesScreen
│       │
│       ├── sync/                      # 🔄 Sincronización
│       │   └── presentation/          # SyncScreen
│       │
│       ├── settings/                  # ⚙️ Ajustes
│       │   ├── data/                  # NotificationPreferencesService
│       │   └── presentation/          # SettingsScreen
│       │
│       ├── tasks/                     # 📌 Gestión de Tareas (CRUD)
│       │   ├── data/
│       │   │   ├── local/             # LocalTaskDataSource (SQLite)
│       │   │   ├── remote/            # RemoteTaskDataSource (API)
│       │   │   └── repositories/      # TasksRepository
│       │   ├── domain/                # Task model
│       │   └── presentation/          # TaskController, screens
│       │
│       ├── home/                      # 🏠 Shell Principal
│       │   └── presentation/          # HomeShell (navegación)
│       │
│       └── common/                    # 🔗 Servicios Compartidos
│           └── offline_resource_service.dart
│
├── test/                              # 🧪 Pruebas
│   └── smoke_test.dart                # Test básico de humo
│
└── pubspec.yaml                       # 📦 Dependencias
```

## 3.2 Patrón de Arquitectura por Feature

Cada módulo funcional sigue la arquitectura **Clean Architecture simplificada**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PATRÓN POR FEATURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    PRESENTATION LAYER                           │   │
│  │  • Screens (Widgets) - UI declarativa                          │   │
│  │  • Controllers - Estado y lógica de UI                         │   │
│  │  • ChangeNotifier para reactividad                             │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      DOMAIN LAYER                               │   │
│  │  • Models/Entities - Definición de datos                       │   │
│  │  • Business Logic - Validaciones, transformaciones             │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       DATA LAYER                                │   │
│  │  • Local DataSource - SQLite (sqflite)                         │   │
│  │  • Remote DataSource - API (Dio)                               │   │
│  │  • Repository - Abstracción que unifica local + remote         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3.3 Flujo de Datos

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ESCRITURA (Write Path)                                                  │
│  ─────────────────────                                                   │
│                                                                          │
│  Usuario → Screen → Controller → Repository → Local DB (SQLite)         │
│                                      ↓                                   │
│                              Encolar en sync_queue                       │
│                                      ↓                                   │
│                              [Si hay red] → API → Servidor               │
│                                      ↓                                   │
│                              [Si OK] Marcar synced=1                     │
│                              [Si Error] Retry con backoff                │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  LECTURA (Read Path)                                                     │
│  ───────────────────                                                     │
│                                                                          │
│  Usuario → Screen → Controller → Repository → API (primero)             │
│                                      ↓                                   │
│                              [Si OK] Actualizar cache, mostrar           │
│                              [Si Error] Leer de cache local              │
│                                      ↓                                   │
│                              Mostrar aviso "Datos offline"               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

# 4. INVENTARIO DE MÓDULOS

## 4.1 Tabla de Módulos

| # | Módulo | Directorio | Archivos | Descripción |
|:--|:-------|:-----------|:--------:|:------------|
| 1 | **Auth** | `features/auth/` | 4 | Login, logout, gestión de sesión |
| 2 | **Agenda** | `features/agenda/` | 1 | Vista "Hoy", métricas del día |
| 3 | **Assignment** | `features/assignment/` | 1 | "Mi Asignación" - tareas asignadas |
| 4 | **Pending** | `features/pending/` | 1 | Tareas pendientes con acciones |
| 5 | **Projects** | `features/projects/` | 1 | Listado y detalle de proyectos |
| 6 | **Team** | `features/team/` | 1 | Mi equipo y sus tareas |
| 7 | **Reports** | `features/reports/` | 1 | Dashboard y estadísticas |
| 8 | **Notes** | `features/notes/` | 1 | Notas de reunión locales |
| 9 | **Sync** | `features/sync/` | 1 | Pantalla de sincronización |
| 10 | **Settings** | `features/settings/` | 2 | Ajustes y preferencias |
| 11 | **Tasks** | `features/tasks/` | 7 | CRUD completo de tareas |
| 12 | **Home** | `features/home/` | 1 | Shell de navegación |
| 13 | **Common** | `features/common/` | 1 | Servicios compartidos |

## 4.2 Detalle por Módulo

### 4.2.1 AUTH (Autenticación)

**Archivos:**
- `auth_repository.dart` - Lógica de autenticación
- `session_user.dart` - Modelo de usuario en sesión
- `auth_controller.dart` - Controlador de estado auth
- `login_screen.dart` - Pantalla de login

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Login con email/password | ✅ |
| Guardado seguro de tokens | ✅ |
| Refresh token automático | ✅ |
| Restaurar sesión al abrir app | ✅ |
| Logout con limpieza | ✅ |
| Recuperación de contraseña | ❌ |

### 4.2.2 AGENDA (Hoy/Día)

**Archivos:**
- `agenda_screen.dart` - Pantalla principal del día

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Consumo de `/mi-dia` | ✅ |
| Fallback a cache offline | ✅ |
| Métricas del día | ✅ |
| Lista de tareas del día | ✅ |
| Bitácora/Historial | ❌ |
| Calendario (cambiar fecha) | ❌ |
| Acciones rápidas por tarea | ❌ |

### 4.2.3 PENDING (Pendientes)

**Archivos:**
- `pending_screen.dart` - Lista de tareas pendientes

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Consumo de `/tareas/mias?estado=Pendiente` | ✅ |
| Cache offline | ✅ |
| Marcar tarea como hecha | ✅ |
| Filtros por proyecto | ❌ |
| Filtros por fecha | ❌ |
| Búsqueda por texto | ❌ |

### 4.2.4 PROJECTS (Proyectos)

**Archivos:**
- `projects_screen.dart` - Lista de proyectos

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Consumo de `/planning/my-projects` | ✅ |
| Cache offline | ✅ |
| Lista con nombre y descripción | ✅ |
| Detalle de proyecto | ✅ Básico |
| Timeline simplificado | ❌ |
| Indicadores de progreso | ❌ |

### 4.2.5 TEAM (Equipos)

**Archivos:**
- `team_screen.dart` - Vista de mi equipo

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Consumo de `/planning/team` | ✅ |
| Cache offline | ✅ |
| Lista de miembros | ✅ |
| Ver tareas de miembro | ✅ Básico |
| Agenda por miembro | ❌ |
| Bloqueos del equipo | ❌ |

### 4.2.6 REPORTS (Dashboard)

**Archivos:**
- `reports_screen.dart` - Dashboard de KPIs

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Consumo de `/planning/stats` | ✅ |
| Cache offline | ✅ |
| Lista de métricas | ✅ |
| Gráficas visuales | ❌ |
| Selector de período | ❌ |
| Comparativos | ❌ |

### 4.2.7 NOTES (Notas)

**Archivos:**
- `notes_screen.dart` - Gestión de notas

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| CRUD local SQLite | ✅ |
| Modal crear/editar | ✅ |
| Lista ordenada por fecha | ✅ |
| Sincronización con servidor | ❌ CRÍTICO |
| Vincular a proyecto | ❌ |

### 4.2.8 SYNC (Sincronización)

**Archivos:**
- `sync_screen.dart` - Estado de sincronización

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Estado de sync visible | ✅ |
| Eventos pendientes/completados | ✅ |
| Botón "Sincronizar ahora" | ✅ |
| Auto-sync al volver a foreground | ✅ |
| Auto-sync al reconectar | ✅ |
| Background sync (WorkManager) | ❌ CRÍTICO |

### 4.2.9 SETTINGS (Ajustes)

**Archivos:**
- `settings_screen.dart` - Pantalla de ajustes
- `notification_preferences_service.dart` - Preferencias de notificaciones

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Toggle notificaciones globales | ✅ |
| Toggle nuevas asignaciones | ✅ |
| Toggle recordatorios | ✅ |
| Persistencia local | ✅ |
| Integración FCM/APNs | ❌ CRÍTICO |
| Biometría (huella/Face ID) | ❌ |
| Selector de idioma | ❌ |
| Tema claro/oscuro | ❌ |

### 4.2.10 TASKS (Gestión de Tareas)

**Archivos (7):**
```
tasks/
├── data/
│   ├── local/local_task_datasource.dart
│   ├── remote/remote_task_datasource.dart
│   └── repositories/tasks_repository.dart
├── domain/
│   └── task.dart
└── presentation/
    ├── task_controller.dart
    └── screens/
```

**Funcionalidades:**
| Funcionalidad | Estado |
|:--------------|:------:|
| Crear tarea local | ✅ |
| Actualizar tarea | ✅ |
| Eliminar tarea | ✅ |
| Listar tareas | ✅ |
| Encolar para sync | ✅ |
| Marcar como completada | ✅ |
| KPIs rápidos | ✅ |

---

# 5. INTEGRACIÓN CON BACKEND

## 5.1 Endpoints Utilizados

| Método | Endpoint | Módulo | Descripción |
|:-------|:---------|:-------|:------------|
| POST | `/auth/login` | Auth | Inicio de sesión |
| POST | `/auth/refresh` | Auth | Renovar token |
| GET | `/mi-dia?fecha=YYYY-MM-DD` | Agenda | Resumen del día |
| GET | `/tareas/mias` | Assignment | Tareas del usuario |
| GET | `/tareas/mias?estado=Pendiente` | Pending | Tareas pendientes |
| PATCH | `/tareas/:id` | Tasks | Actualizar tarea |
| GET | `/planning/my-projects` | Projects | Mis proyectos |
| GET | `/proyectos/:id/tareas` | Projects | Tareas de proyecto |
| GET | `/planning/team` | Team | Mi equipo |
| GET | `/equipo/miembro/:id/tareas` | Team | Tareas de miembro |
| GET | `/planning/stats` | Reports | Estadísticas |
| POST | `/mobile/sync/tasks` | Sync | Sincronizar tareas |

## 5.2 Cliente HTTP (api_client.dart)

```dart
// Características del ApiClient:

1. INYECCIÓN AUTOMÁTICA DE TOKEN
   - Cada request incluye header "Authorization: Bearer <token>"
   - Token se lee de FlutterSecureStorage

2. RENOVACIÓN AUTOMÁTICA (401 Handling)
   - Detecta respuesta 401 (Unauthorized)
   - Llama a POST /auth/refresh con refresh_token
   - Si OK: guarda nuevos tokens, repite request original
   - Si falla: dirige a login

3. TIMEOUTS
   - Conexión: 15 segundos
   - Recepción: 15 segundos
   - Configurables via --dart-define

4. INTERCEPTORES
   - LogInterceptor (desarrollo)
   - AuthInterceptor (tokens)
   - ErrorInterceptor (manejo de errores)
```

## 5.3 Mapeo de Respuestas (api_utils.dart)

```dart
// El backend puede retornar datos en diferentes formatos:

// Formato 1: { "data": [...] }
// Formato 2: { "items": [...] }
// Formato 3: [ ... ] (array directo)

// La función unwrapApiList() maneja todos los casos:
List<dynamic> unwrapApiList(dynamic responseData) {
  if (responseData is List) return responseData;
  if (responseData is Map) {
    if (responseData['data'] is List) return responseData['data'];
    if (responseData['items'] is List) return responseData['items'];
  }
  return [];
}
```

---

# 6. ESTRATEGIA OFFLINE-FIRST

## 6.1 Filosofía

La app implementa **offline-first real**, no simulado:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       OFFLINE-FIRST STRATEGY                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  "El móvil es la primera fuente de verdad para el usuario."            │
│                                                                         │
│  → Todos los cambios se guardan localmente PRIMERO                     │
│  → La sincronización con el servidor es EVENTUAL                       │
│  → La app NUNCA bloquea al usuario por falta de red                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Base de Datos Local (SQLite)

### Tablas Principales

```sql
-- Tabla de tareas locales
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remote_id INTEGER,           -- ID del servidor (null si no synced)
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'Pendiente',
  prioridad TEXT DEFAULT 'Normal',
  fecha_objetivo TEXT,
  synced INTEGER DEFAULT 0,    -- 0=pendiente, 1=sincronizado
  created_at TEXT,
  updated_at TEXT
);

-- Cola de sincronización
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,    -- CREATE, UPDATE, DELETE
  table_name TEXT NOT NULL,    -- 'tasks', 'notes', etc.
  record_id INTEGER NOT NULL,  -- ID local del registro
  payload TEXT,                -- JSON con datos a enviar
  sync_attempts INTEGER DEFAULT 0,
  next_retry_at TEXT,
  created_at TEXT
);

-- Cache de lecturas
CREATE TABLE kv_cache (
  key TEXT PRIMARY KEY,        -- Ej: 'agenda_2026-02-08', 'projects_list'
  value TEXT,                  -- JSON de la respuesta
  expires_at TEXT              -- Tiempo de expiración
);

-- Notas locales
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remote_id INTEGER,
  titulo TEXT NOT NULL,
  contenido TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

## 6.3 Cola de Sincronización

### Flujo de Encolamiento

```
1. Usuario crea/modifica tarea
         ↓
2. TasksRepository.save()
         ↓
3. INSERT/UPDATE en tabla 'tasks' con synced=0
         ↓
4. INSERT en 'sync_queue' con event_type y payload
         ↓
5. [ASYNC] SyncService.processQueue()
         ↓
6. Para cada evento en cola:
   a. Enviar a API
   b. Si OK → DELETE de cola, UPDATE synced=1
   c. Si Error 4xx → DELETE de cola (error de cliente)
   d. Si Error 5xx/Network → sync_attempts++, next_retry_at = backoff
```

### Backoff Exponencial

```dart
// Cálculo de siguiente reintento:
Duration getBackoffDuration(int attempts) {
  // Base: 1 segundo, máximo: 5 minutos
  final seconds = min(300, pow(2, attempts).toInt());
  return Duration(seconds: seconds);
}

// Ejemplo de progresión:
// Intento 1: 2 segundos
// Intento 2: 4 segundos
// Intento 3: 8 segundos
// Intento 4: 16 segundos
// ...
// Intento 8+: 5 minutos (cap)
```

## 6.4 Cache de Lecturas

```dart
// Estrategia de cache para módulos de solo lectura:

class OfflineResourceService {
  final String cacheKey;
  final Duration cacheDuration;
  final Future<List<dynamic>> Function() apiFetcher;
  
  Future<List<dynamic>> fetch() async {
    // 1. Intentar API
    try {
      final data = await apiFetcher();
      await _saveToCache(data);
      return data;
    } catch (e) {
      // 2. Fallback a cache
      final cached = await _readFromCache();
      if (cached != null) return cached;
      throw Exception('Sin datos disponibles');
    }
  }
}

// Uso en AgendaScreen:
final agendaService = OfflineResourceService(
  cacheKey: 'agenda_${fecha}',
  cacheDuration: Duration(hours: 4),
  apiFetcher: () => ApiClient.dio.get('/mi-dia?fecha=$fecha'),
);
```

## 6.5 Sincronización Automática

### Triggers de Sync

| Evento | Acción |
|:-------|:-------|
| App vuelve a foreground | `syncNow()` |
| Conectividad recuperada | `syncNow()` (con debounce 3s) |
| Usuario presiona botón | `syncNow()` |
| Background task (Android) | `syncNow()` (pendiente) |

### Debounce de Conectividad

```dart
// Evita ráfagas de sync cuando la red es inestable:

Timer? _debounceTimer;

void onConnectivityChanged(bool hasConnection) {
  if (!hasConnection) return;
  
  _debounceTimer?.cancel();
  _debounceTimer = Timer(Duration(seconds: 3), () {
    syncNow();
  });
}
```

---

# 7. ESTADO DE IMPLEMENTACIÓN DETALLADO

## 7.1 Resumen Visual

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ESTADO POR MÓDULO                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Auth            ████████████████████████████████████░░░░░░░░  88%      │
│ Agenda          ██████████████████████████████████░░░░░░░░░░  86%      │
│ Pending         ████████████████████████████████████░░░░░░░░  89%      │
│ Projects        ████████████████████████████████████░░░░░░░░  88%      │
│ Team            ██████████████████████████████████░░░░░░░░░░  86%      │
│ Reports         ████████████████████████████████░░░░░░░░░░░░  82%      │
│ Notes           ██████████████████████████████░░░░░░░░░░░░░░  75%      │
│ Mi Asignación   ██████████████████████████████████████░░░░░░  92%      │
│ Sync            ██████████████████████████████████████░░░░░░  95%      │
│ Settings        ████████████████████████████░░░░░░░░░░░░░░░░  72%      │
│                                                                         │
│ PROMEDIO        ██████████████████████████████████░░░░░░░░░░  86%      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 7.2 Funcionalidades por Estado

### ✅ COMPLETADAS (Funciona al 100%)

1. **Autenticación**
   - Login/Logout
   - Sesión persistente
   - Refresh token automático

2. **Offline-First Core**
   - Escritura local primero
   - Cola de sincronización
   - Retry con backoff
   - Cache de lecturas

3. **Integraciones API**
   - Mi Día
   - Tareas (CRUD)
   - Proyectos (lista)
   - Equipo (lista)
   - Estadísticas

4. **Navegación**
   - Shell con Drawer
   - Bottom navigation
   - Flujo protegido (auth required)

### ⚠️ PARCIALES (Funciona pero incompleto)

1. **Agenda**
   - Falta: bitácora, calendario, acciones rápidas

2. **Pendientes**
   - Falta: filtros avanzados

3. **Proyectos**
   - Falta: detalle completo, timeline

4. **Equipo**
   - Falta: agenda por miembro, bloqueos

5. **Reportes**
   - Falta: gráficas, comparativos

6. **Notas**
   - Falta: sincronización con servidor (CRÍTICO)

7. **Ajustes**
   - Falta: FCM/APNs, biometría, idioma

### ❌ PENDIENTES (No implementado)

1. **Push Notifications** (FCM/APNs)
2. **Background Sync** (WorkManager/BGTask)
3. **Recuperación de Contraseña**
4. **Biometría** (Face ID/Huella)
5. **Gráficas Avanzadas** (fl_chart)
6. **Tema Oscuro**

---

# 8. PLAN DE COMPLETITUD AL 100%

## 8.1 Resumen de Tareas Pendientes

| Prioridad | Cantidad | Horas Totales |
|:----------|:--------:|:-------------:|
| 🔴 CRÍTICA | 3 | 22h |
| 🟠 ALTA | 4 | 16h |
| 🟡 MEDIA | 8 | 29h |
| 🟢 BAJA | 5 | 10h |
| **TOTAL** | **20** | **~77h** |

## 8.2 Tareas Críticas (Bloqueantes para Release)

| ID | Módulo | Tarea | Horas | Descripción |
|:---|:-------|:------|:-----:|:------------|
| SET-1 | Settings | Integración FCM/APNs | 10h | Configurar Firebase + código push |
| SET-2 | Settings | Disparador al asignar | 4h | Backend envía push cuando asignan tarea |
| SYN-1 | Sync | Background sync Android | 8h | WorkManager para sync en segundo plano |

### SET-1: Integración FCM/APNs

**Dependencias a agregar:**
```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^2.27.0
  firebase_messaging: ^14.7.15
```

**Pasos de implementación:**

1. **Configurar Firebase Console**
   - Crear proyecto en Firebase
   - Añadir app Android (package name)
   - Añadir app iOS (bundle ID)
   - Descargar `google-services.json` (Android)
   - Descargar `GoogleService-Info.plist` (iOS)

2. **Configurar Android (`android/app/build.gradle`)**
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

3. **Crear PushService**
   ```dart
   // lib/core/notifications/push_service.dart
   import 'package:firebase_messaging/firebase_messaging.dart';
   
   class PushService {
     final FirebaseMessaging _messaging = FirebaseMessaging.instance;
     
     Future<void> initialize() async {
       // Solicitar permisos
       await _messaging.requestPermission();
       
       // Obtener token
       final token = await _messaging.getToken();
       
       // Enviar token al backend
       await ApiClient.dio.post('/users/device-token', data: {'token': token});
       
       // Listener foreground
       FirebaseMessaging.onMessage.listen(_handleMessage);
     }
   }
   ```

4. **Inicializar en main.dart**
   ```dart
   await Firebase.initializeApp();
   await PushService.instance.initialize();
   ```

### SYN-1: Background Sync Android

**Dependencias:**
```yaml
dependencies:
  workmanager: ^0.5.2
```

**Implementación:**
```dart
// lib/core/background/background_sync.dart

import 'package:workmanager/workmanager.dart';

const taskSync = 'momentus_sync';

void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == taskSync) {
      // Inicializar DB y ApiClient
      await LocalDatabase.instance.database;
      await SyncService.instance.syncNow();
      return true;
    }
    return true;
  });
}

Future<void> initBackgroundSync() async {
  await Workmanager().initialize(callbackDispatcher);
  await Workmanager().registerPeriodicTask(
    'sync-1',
    taskSync,
    frequency: Duration(minutes: 15),
    constraints: Constraints(networkType: NetworkType.connected),
  );
}
```

## 8.3 Tareas de Alta Prioridad

| ID | Módulo | Tarea | Horas |
|:---|:-------|:------|:-----:|
| AGE-3 | Agenda | Acciones rápidas por tarea | 3h |
| AUTH-1 | Auth | Recuperación de contraseña | 3h |
| SYN-2 | Sync | Background sync iOS | 6h |
| SET-3 | Settings | Biometría | 4h |

## 8.4 Tareas de Media Prioridad

| ID | Módulo | Tarea | Horas |
|:---|:-------|:------|:-----:|
| PEN-1 | Pending | Filtros por proyecto | 2h |
| PEN-2 | Pending | Filtros por fecha | 2h |
| PRO-1 | Projects | Detalle completo | 4h |
| REP-1 | Reports | Gráficas visuales | 6h |
| AGE-1 | Agenda | Bitácora | 4h |
| AGE-2 | Agenda | Calendario | 4h |
| TEA-1 | Team | Agenda por miembro | 4h |
| TEA-2 | Team | Bloqueos del equipo | 3h |

## 8.5 Tareas de Baja Prioridad

| ID | Módulo | Tarea | Horas |
|:---|:-------|:------|:-----:|
| SET-4 | Settings | Selector de idioma | 2h |
| SET-5 | Settings | Tema claro/oscuro | 2h |
| SET-6 | Settings | PIN/Bloqueo por inactividad | 4h |
| NOT-2 | Notes | Vincular nota a proyecto | 2h |
| PEN-4 | Pending | Búsqueda por texto | 1h |

---

# 9. GUÍA DE INSTALACIÓN Y EJECUCIÓN

## 9.1 Instalación de Flutter (Windows)

```powershell
# 1. Descargar Flutter SDK
# Ir a: https://docs.flutter.dev/get-started/install/windows
# Descargar el archivo .zip más reciente

# 2. Extraer a una ubicación sin espacios
# Recomendado: C:\flutter

# 3. Agregar al PATH del sistema
# Panel de Control → Sistema → Configuración avanzada → Variables de entorno
# Agregar a PATH: C:\flutter\bin

# 4. Verificar instalación
flutter doctor

# 5. Aceptar licencias Android
flutter doctor --android-licenses
```

## 9.2 Configuración del Proyecto

```bash
# Navegar al proyecto
cd d:\planificacion\flutter_movil

# Instalar dependencias
flutter pub get

# Verificar análisis estático
flutter analyze

# Ejecutar tests
flutter test
```

## 9.3 Ejecución en Diferentes Plataformas

### Android Emulator

```bash
# Verificar emuladores disponibles
flutter emulators

# Iniciar emulador
flutter emulators --launch <emulator_id>

# Ejecutar app (usa 10.0.2.2 para localhost del host)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

### Android Físico (USB)

```bash
# Verificar dispositivo conectado
flutter devices

# Ejecutar (reemplazar con tu IP LAN)
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:3000
```

### iOS Simulator (solo macOS)

```bash
# Abrir simulator
open -a Simulator

# Ejecutar
flutter run --dart-define=API_BASE_URL=http://localhost:3000
```

### Web (para pruebas rápidas)

```bash
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000
```

## 9.4 Build de Producción

### Android APK

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://api.tudominio.com
```

### Android App Bundle (Google Play)

```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.tudominio.com
```

### iOS (solo macOS)

```bash
flutter build ios --release --dart-define=API_BASE_URL=https://api.tudominio.com
```

---

# 10. CRONOGRAMA DE DESARROLLO

## 10.1 Fase 1: Críticas (Semana 1-2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 1: Push Notifications                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Día 1-2: Configuración Firebase                                        │
│   ├── Crear proyecto Firebase Console                                  │
│   ├── Configurar Android (google-services.json)                        │
│   └── Configurar iOS (GoogleService-Info.plist)                        │
│                                                                         │
│ Día 3-4: Implementación Flutter                                        │
│   ├── Crear PushService                                                │
│   ├── Solicitar permisos                                               │
│   └── Listener de mensajes foreground                                  │
│                                                                         │
│ Día 5: Backend + Testing                                               │
│   ├── Endpoint para guardar device token                               │
│   ├── Lógica de envío de push al asignar tarea                        │
│   └── Pruebas end-to-end                                               │
├─────────────────────────────────────────────────────────────────────────┤
│ SEMANA 2: Background Sync                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ Día 1-3: Android WorkManager                                           │
│   ├── Configurar dependencia workmanager                               │
│   ├── Crear callbackDispatcher                                         │
│   └── Registrar tarea periódica                                        │
│                                                                         │
│ Día 4-5: iOS BGTaskScheduler + Testing                                 │
│   ├── Configurar Info.plist                                            │
│   ├── Implementar BGAppRefreshTask                                     │
│   └── Pruebas de sincronización en background                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 10.2 Fase 2: Alta Prioridad (Semana 3)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 3: Funcionalidades de Alta Prioridad                            │
├─────────────────────────────────────────────────────────────────────────┤
│ Día 1: Acciones Rápidas en Agenda                                      │
│   ├── Botón "Marcar hecha" en cada tarea                               │
│   └── Pull-to-refresh                                                  │
│                                                                         │
│ Día 2: Recuperación de Contraseña                                      │
│   ├── Pantalla ForgotPasswordScreen                                    │
│   ├── Llamada a POST /auth/forgot-password                             │
│   └── Mensajes de éxito/error                                          │
│                                                                         │
│ Día 3-4: Biometría                                                     │
│   ├── Agregar dependencia local_auth                                   │
│   ├── Crear BiometricService                                           │
│   └── Toggle en Settings + verificación al abrir app                   │
│                                                                         │
│ Día 5: Testing y Buffer                                                │
│   ├── Pruebas de flujos completados                                    │
│   └── Corrección de bugs encontrados                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 10.3 Fase 3: Media Prioridad (Semana 4-5)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 4: Filtros y Detalles                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Día 1-2: Filtros en Pendientes                                         │
│   ├── Chips de filtro por fecha (Hoy, Semana, Atrasadas)              │
│   └── Dropdown de filtro por proyecto                                  │
│                                                                         │
│ Día 3-4: Detalle de Proyecto                                           │
│   ├── Pantalla ProjectDetailScreen                                     │
│   ├── Header con info del proyecto                                     │
│   └── Lista de tareas del proyecto                                     │
│                                                                         │
│ Día 5: Bitácora en Agenda                                              │
│   ├── Tab de historial del día                                         │
│   └── Timeline de acciones                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ SEMANA 5: Gráficas y Equipos                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Día 1-2: Gráficas en Reports                                           │
│   ├── Agregar fl_chart                                                 │
│   ├── Gráfica de barras para KPIs                                      │
│   └── Selector de período                                              │
│                                                                         │
│ Día 3-4: Equipos Avanzados                                             │
│   ├── Pantalla de agenda por miembro                                   │
│   └── Pantalla de bloqueos del equipo                                  │
│                                                                         │
│ Día 5: Testing Final                                                   │
│   ├── QA completo offline/online                                       │
│   └── Corrección de bugs                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 10.4 Resumen del Cronograma

| Fase | Duración | Entregables |
|:-----|:--------:|:------------|
| 1. Críticas | 2 semanas | Push notifications, Background sync |
| 2. Alta | 1 semana | Acciones rápidas, Recuperación password, Biometría |
| 3. Media | 2 semanas | Filtros, Detalles, Gráficas, Equipos avanzados |
| **Buffer + QA** | 1 semana | Testing final, correcciones |
| **TOTAL** | **~6 semanas** | App 100% completada |

---

# 11. RIESGOS Y MITIGACIONES

## 11.1 Riesgos Técnicos

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|:---|:-------|:------------:|:-------:|:-----------|
| R1 | FCM falla en algunos dispositivos | Media | Alto | Implementar fallback a polling |
| R2 | Background sync drenando batería | Media | Alto | Limitar frecuencia, respetar Doze mode |
| R3 | Conflictos de sincronización | Baja | Alto | Estrategia last-write-wins + timestamp |
| R4 | API cambia y rompe móvil | Media | Alto | Versionado de endpoints |
| R5 | iOS rechaza por políticas | Baja | Alto | Revisar guidelines antes de submit |

## 11.2 Riesgos de Proyecto

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|:---|:-------|:------------:|:-------:|:-----------|
| P1 | Falta de dispositivos reales para QA | Alta | Medio | Usar Firebase Test Lab |
| P2 | Tiempo insuficiente para testing | Media | Alto | Priorizar flujos críticos |
| P3 | Backend no expone endpoints necesarios | Baja | Alto | Coordinar con equipo backend |

## 11.3 Matriz de Riesgos

```
                    IMPACTO
              Bajo    Medio    Alto
         ┌─────────┬─────────┬─────────┐
    Alta │         │   P1    │         │
         │         │         │         │
PROB.    ├─────────┼─────────┼─────────┤
   Media │         │         │ R1,R2   │
         │         │         │ R4,P2   │
         ├─────────┼─────────┼─────────┤
    Baja │         │         │ R3,R5   │
         │         │         │ P3      │
         └─────────┴─────────┴─────────┘
```

---

# 12. CHECKLIST DE PRODUCCIÓN

## 12.1 Pre-Release

### Configuración
- [ ] API_BASE_URL apunta a producción
- [ ] Firebase configurado con proyecto de producción
- [ ] Keystore firmado para Android
- [ ] Provisioning profile para iOS
- [ ] Versión incrementada en pubspec.yaml

### Seguridad
- [ ] Tokens se guardan en SecureStorage
- [ ] No hay logs de datos sensibles
- [ ] Certificate pinning configurado (opcional)
- [ ] ProGuard habilitado (Android)

### Performance
- [ ] Release build optimizado
- [ ] Sin console.log / print en producción
- [ ] Imágenes optimizadas
- [ ] Cache configurado correctamente

## 12.2 Testing

### Funcional
- [ ] Login/Logout funciona
- [ ] Check-in diario funciona
- [ ] CRUD de tareas funciona
- [ ] Sincronización funciona
- [ ] Push notifications llegan
- [ ] Biometría funciona (si implementado)

### Offline
- [ ] App abre sin internet
- [ ] Datos en cache se muestran
- [ ] Operaciones se encolan
- [ ] Sync funciona al recuperar red
- [ ] Background sync funciona

### Dispositivos
- [ ] Probado en Android 6.0
- [ ] Probado en Android 10+
- [ ] Probado en iOS 12
- [ ] Probado en iOS 15+
- [ ] Probado en tablets

## 12.3 Stores

### Google Play
- [ ] App Bundle generado
- [ ] Screenshots preparados (phone + tablet)
- [ ] Descripción y metadata
- [ ] Política de privacidad URL
- [ ] Categoría correcta
- [ ] Rating de contenido

### App Store
- [ ] IPA generado
- [ ] Screenshots para todos los tamaños
- [ ] App Preview video (opcional)
- [ ] Descripción localizada
- [ ] Política de privacidad URL
- [ ] App Information completa

---

# 13. GLOSARIO

| Término | Definición |
|:--------|:-----------|
| **APNs** | Apple Push Notification service - Servicio de Apple para notificaciones push |
| **Backoff Exponencial** | Estrategia de reintentos donde el tiempo de espera se duplica cada vez |
| **BGTask** | Background Task Scheduler de iOS para tareas en segundo plano |
| **Cache** | Almacenamiento temporal de datos para acceso rápido |
| **FCM** | Firebase Cloud Messaging - Servicio de Google para notificaciones push |
| **Flutter** | Framework de Google para desarrollo de apps multiplataforma |
| **Offline-First** | Arquitectura que prioriza el funcionamiento sin conexión |
| **Provider** | Librería de gestión de estado para Flutter |
| **SQLite** | Base de datos relacional ligera y embebida |
| **Sync Queue** | Cola de operaciones pendientes de sincronizar |
| **WorkManager** | API de Android para tareas en segundo plano |

---

# 14. REFERENCIAS

## Documentación Interna

- `docs/ANALISIS_COMPLETO_PROYECTO.md` - Análisis técnico detallado
- `docs/ESTADO_IMPLEMENTACION_MOVIL.md` - Estado por módulo
- `docs/PLAN_COMPLETAR_100_PORCIENTO.md` - Plan de completitud
- `docs/MAPA_FUNCIONAL_WEB_A_MOVIL.md` - Mapeo funcional
- `docs/BACKEND_REUSE_MAP.md` - Endpoints a reutilizar

## Documentación Externa

- [Flutter Official Docs](https://docs.flutter.dev)
- [Firebase Flutter](https://firebase.flutter.dev)
- [sqflite Package](https://pub.dev/packages/sqflite)
- [Dio HTTP Client](https://pub.dev/packages/dio)
- [WorkManager](https://developer.android.com/topic/libraries/architecture/workmanager)

---

**Documento generado por Antigravity AI**
**Fecha: 2026-02-08 | Versión: 1.0**
**Proyecto: Momentus Mobile (flutter_movil)**
