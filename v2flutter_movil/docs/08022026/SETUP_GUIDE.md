# 📱 Guía de Configuración - Momentus Mobile

## Pre-requisitos

### 1. Herramientas Necesarias
- **Flutter SDK** >= 3.3.0 ([Guía de instalación](https://docs.flutter.dev/get-started/install))
- **Android Studio** o **VS Code** con extensiones Flutter/Dart
- **Java JDK 17+**
- Cuenta de Google para Firebase

### 2. Verificar Instalación
```bash
flutter doctor
```
Asegúrate de que todo tenga ✓ verde.

---

## 🔧 Configuración Inicial

### Paso 1: Generar Carpeta Android
El proyecto actualmente solo tiene código Dart. Ejecuta esto para generar las plataformas:

```bash
cd d:\planificacion\flutter_movil

# Genera las carpetas android, ios, etc.
flutter create --org com.momentus .
```

> **Nota**: El `--org com.momentus` crea el package ID `com.momentus.flutter_movil`.

### Paso 2: Instalar Dependencias
```bash
flutter pub get
```

### Paso 3: Agregar Dependencias de Firebase

Edita `pubspec.yaml` y agrega:
```yaml
dependencies:
  # ... existentes ...
  firebase_core: ^3.8.1
  firebase_messaging: ^15.1.6
  flutter_local_notifications: ^18.0.1
```

Luego ejecuta:
```bash
flutter pub get
```

---

## 🔥 Configuración de Firebase

### Paso 1: Colocar google-services.json
Ya tienes el archivo `google-services.json`. Cópialo a:
```
flutter_movil/android/app/google-services.json
```

### Paso 2: Configurar Gradle (Nivel Proyecto)
Edita `android/build.gradle`:

```groovy
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        // AGREGA ESTA LÍNEA:
        classpath 'com.google.gms:google-services:4.4.1'
    }
}
```

### Paso 3: Configurar Gradle (Nivel App)
Edita `android/app/build.gradle`:

Al **final** del archivo agrega:
```groovy
apply plugin: 'com.google.gms.google-services'
```

Verifica que `minSdkVersion` sea al menos 21:
```groovy
android {
    defaultConfig {
        minSdkVersion 21  // Mínimo para Firebase
        targetSdkVersion 34
        // ...
    }
}
```

### Paso 4: Permisos de Internet
Verifica que `android/app/src/main/AndroidManifest.xml` tenga:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

---

## 📲 Código de Notificaciones Push

### Archivo: `lib/core/services/push_notification_service.dart`

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:dio/dio.dart';

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._();
  factory PushNotificationService() => _instance;
  PushNotificationService._();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();

  String? _token;
  String? get token => _token;

  /// Inicializar al arrancar la app
  Future<void> initialize() async {
    await Firebase.initializeApp();
    
    // Pedir permisos
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('✅ Permisos de notificación concedidos');
      await _setupToken();
      _setupListeners();
      await _initLocalNotifications();
    } else {
      print('❌ Permisos de notificación denegados');
    }
  }

  /// Obtener y registrar token
  Future<void> _setupToken() async {
    _token = await _fcm.getToken();
    print('📱 FCM Token: $_token');
    
    // Enviar token al backend cuando el usuario esté autenticado
    // Esto se llama desde AuthController después del login
  }

  /// Registrar token en el backend
  Future<void> registerTokenWithBackend(String authToken) async {
    if (_token == null) return;
    
    try {
      final dio = Dio();
      await dio.post(
        'https://TU_API_URL/notifications/device-token',
        data: {
          'token': _token,
          'platform': 'android', // o 'ios' según corresponda
        },
        options: Options(
          headers: {'Authorization': 'Bearer $authToken'},
        ),
      );
      print('✅ Token registrado en backend');
    } catch (e) {
      print('❌ Error registrando token: $e');
    }
  }

  /// Configurar listeners para mensajes
  void _setupListeners() {
    // Mensaje en foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📩 Mensaje recibido en foreground: ${message.notification?.title}');
      _showLocalNotification(message);
    });

    // App abierta desde notificación
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('📩 App abierta desde notificación: ${message.data}');
      _handleNotificationTap(message.data);
    });
  }

  /// Notificaciones locales (para foreground)
  Future<void> _initLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);
    
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        // Manejar tap en notificación local
        print('🔔 Tap en notificación local: ${response.payload}');
      },
    );
  }

  /// Mostrar notificación local
  Future<void> _showLocalNotification(RemoteMessage message) async {
    const androidDetails = AndroidNotificationDetails(
      'momentus_channel',
      'Momentus Notifications',
      channelDescription: 'Notificaciones de tareas y asignaciones',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );
    
    const details = NotificationDetails(android: androidDetails);
    
    await _localNotifications.show(
      message.hashCode,
      message.notification?.title ?? 'Nueva notificación',
      message.notification?.body ?? '',
      details,
      payload: message.data.toString(),
    );
  }

  /// Manejar tap en notificación
  void _handleNotificationTap(Map<String, dynamic> data) {
    final type = data['type'];
    final taskId = data['taskId'];
    
    if (type == 'ASSIGNMENT' && taskId != null) {
      // TODO: Navegar a la tarea específica
      print('🚀 Navegar a tarea $taskId');
    }
  }
}
```

### Integración en `main.dart`

```dart
import 'package:flutter/material.dart';
import 'core/services/push_notification_service.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar notificaciones push
  await PushNotificationService().initialize();
  
  runApp(const MomentusMobileApp());
}
```

### Integración en Login (después de autenticar)

```dart
// En AuthController o donde manejes el login exitoso:
await PushNotificationService().registerTokenWithBackend(jwtToken);
```

---

## 🎨 Sistema de Diseño

El proyecto incluye un sistema de diseño completo:

| Archivo | Propósito |
|---------|-----------|
| `lib/core/theme/app_theme.dart` | Tema completo con modo claro/oscuro |
| `lib/core/widgets/momentus_widgets.dart` | Widgets reutilizables (botones, cards, inputs) |
| `docs/DESIGN_SYSTEM.md` | Documentación de colores, tipografía, espaciado |

### Colores Principales
- **Verde primario**: `#22C55E` (claro) / `#4ADE80` (oscuro)
- **Fondo**: `#F8FAFC` (claro) / `#0F172A` (oscuro)
- **Superficies**: Blanco (claro) / `#1E293B` (oscuro)

---

## 🚀 Ejecutar la App

### En emulador/dispositivo:
```bash
flutter run
```

### Build de release:
```bash
flutter build apk --release
```

### Con modo verbose (para debug):
```bash
flutter run --verbose
```

---

## 📋 Checklist Antes de Ejecutar

- [ ] Ejecutar `flutter create --org com.momentus .` (si falta carpeta android)
- [ ] Copiar `google-services.json` a `android/app/`
- [ ] Editar `android/build.gradle` (classpath google-services)
- [ ] Editar `android/app/build.gradle` (apply plugin + minSdkVersion)
- [ ] Ejecutar `flutter pub get`
- [ ] Configurar URL del API en el servicio de notificaciones
- [ ] Ejecutar `flutter run`

---

## 🔧 Configuración del Backend

El archivo de credenciales de Firebase Admin SDK debe estar en el servidor:

```env
# En el .env del backend
FIREBASE_CREDENTIALS_PATH="./firebase-adminsdk.json"
```

Descarga este archivo desde:
1. Firebase Console → ⚙️ Configuración → Cuentas de servicio
2. "Generar nueva clave privada"
3. Renombrar a `firebase-adminsdk.json`
4. Colocar en la raíz del backend

---

## 📱 Estructura de Pantallas

```
┌─────────────────────────────────────────┐
│                LOGIN                     │
│  Logo + Formulario + Botón verde        │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│              DASHBOARD                   │
│  Saludo + Stats + Lista de Tareas       │
│  FAB "Nueva" + Bottom Navigation        │
└─────────────────────────────────────────┘
      │         │        │         │
      ▼         ▼        ▼         ▼
   Inicio    Tareas   Equipo   Ajustes
```

¡Listo! Con esta guía tienes todo para continuar en la otra máquina. 🚀
