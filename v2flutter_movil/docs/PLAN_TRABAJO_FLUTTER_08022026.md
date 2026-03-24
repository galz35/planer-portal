# 📋 Plan de Trabajo Final - Flutter Móvil Momentus
## Versión Actualizada 8 de Febrero 2026 (17:51 CST)

**Objetivo:** App Flutter hermosa, rápida y eficiente - Diseño inspirado en React con tema verde

---

## 📊 ANÁLISIS COMPLETADO

### ✅ Proyecto React (clarity-pwa) - Diseño de Referencia
| Elemento | Valor Actual | Equivalente Flutter |
|----------|--------------|---------------------|
| **Color Primary** | `#e11d48` (rosa) | `#22C55E` (verde) |
| **Fuente** | Inter | Inter |
| **Bordes** | `rounded-3xl` (24px) | `radiusXl: 24` |
| **Sombras** | `shadow-2xl` | `cardShadow` implementado |
| **Neutrales** | slate-50 a slate-900 | Mismo rango exacto |
| **Login Layout** | Panel dividido 50/50 | Adaptado para móvil |

### ✅ Backend - FCM Ya Está Listo
| Archivo | Estado | Función |
|---------|--------|---------|
| `notification.service.ts` | ✅ Funcional | Envía push via Firebase Admin |
| `notification.controller.ts` | ✅ Funcional | `POST /notifications/device-token` |
| SP `sp_Dispositivos_Registrar` | ✅ Existe | Guarda tokens FCM |
| SP `sp_Dispositivos_ObtenerPorUsuario` | ✅ Existe | Obtiene tokens para enviar push |

**Trigger automático:** Cuando creas tarea asignada a otro usuario, el backend le envía push.

### ⚠️ React NO tiene FCM
El proyecto clarity-pwa NO tiene Firebase configurado. Creé guía en:
- `planer/firebasereact/GUIA_FCM_REACT.md` - Para implementar después

### ✅ Tema Flutter Actualizado
Ya actualicé `app_theme.dart` con:
- Colores verdes + neutrales slate (igual que React)
- Gradientes inspirados en React pero verdes
- Sombras `shadow-2xl` traducidas a Flutter
- Bordes `rounded-3xl` (24px)
- Tipografía Inter

---

## 🚀 FASES DE TRABAJO

---

## FASE 0: GENERAR CARPETA ANDROID
**Duración:** 10 minutos
**Criticidad:** 🔴 BLOQUEANTE

### Comandos:
```powershell
cd "c:\Users\Gustavo Lira\Documents\gustavoplan\planer\flutter_movil"
flutter create --org com.momentus .
```

### Configurar Memoria Gradle
Editar `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=256m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
android.useAndroidX=true
```

### Verificar:
```powershell
flutter pub get
flutter run
```

---

## FASE 1: INTEGRAR FIREBASE FCM
**Duración:** 20 minutos
**Criticidad:** 🔴 CRÍTICO

### Paso 1.1: Agregar Dependencias
Editar `pubspec.yaml` - agregar en `dependencies:`:
```yaml
  # Firebase / Notifications
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
```

```powershell
flutter pub get
```

### Paso 1.2: Configurar google-services.json
El archivo existe en `planer/google-services.json` con:
- project_id: `plannerfcm`
- package_name: `com.gustavo`

**Opción A:** Cambiar package de Flutter a `com.gustavo`:
```kotlin
// android/app/build.gradle.kts
android {
    namespace = "com.gustavo"
    defaultConfig {
        applicationId = "com.gustavo"
    }
}
```

Luego copiar:
```powershell
copy "c:\Users\Gustavo Lira\Documents\gustavoplan\planer\google-services.json" "c:\Users\Gustavo Lira\Documents\gustavoplan\planer\flutter_movil\android\app\"
```

**Opción B:** Agregar nuevo package en Firebase Console y descargar nuevo json.

### Paso 1.3: Configurar Gradle
**android/settings.gradle.kts:**
```kotlin
plugins {
    id("com.google.gms.google-services") version "4.4.1" apply false
}
```

**android/app/build.gradle.kts:**
```kotlin
plugins {
    id("com.google.gms.google-services")
}

android {
    defaultConfig {
        minSdk = 21
    }
}
```

### Paso 1.4: Crear Push Service
Ya existe código en `inventario/lib/core/notifications/push_notification_service.dart`
Copiar y adaptar a `flutter_movil/lib/core/services/push_notification_service.dart`

### Paso 1.5: Integrar en main.dart y AuthController
Ver código detallado en plan anterior.

---

## FASE 2: CONECTAR CON BACKEND PRODUCCIÓN
**Duración:** 15 minutos
**Criticidad:** 🔴 CRÍTICO

### URL Backend
- **Producción:** `http://100.26.176.32/api`
- **Swagger:** `http://100.26.176.32/api/docs`

### Verificar en `lib/core/config/app_config.dart`:
```dart
static String get apiBaseUrl =>
    const String.fromEnvironment('API_BASE_URL', 
        defaultValue: 'http://100.26.176.32/api');
```

### Ejecutar en Celular:
```powershell
flutter run
```

### Probar:
1. Login con usuario real
2. Ver que carga Mi Asignación
3. Ver que carga Hoy/Agenda
4. Verificar FCM token en logs

---

## FASE 3: VERIFICAR OFFLINE/ONLINE
**Duración:** 15 minutos
**Criticidad:** 🟡 ALTO

### Checklist:
- [ ] Crear tarea en modo avión → guarda local
- [ ] Desactivar modo avión → sincroniza automáticamente
- [ ] Verificar cache en pantallas sin internet
- [ ] Auto-sync al reabrir app

---

## FASE 4: PROBAR NOTIFICACIONES PUSH
**Duración:** 20 minutos
**Criticidad:** 🟠 MEDIO

### Flujo Esperado:
1. Usuario A hace login en Flutter → token FCM se registra
2. Usuario B (desde web) crea tarea asignada a Usuario A
3. Backend detecta asignación → llama `NotificationService.sendPushToUser()`
4. Usuario A recibe push en su celular

### Verificar:
- [ ] Token FCM aparece en logs al iniciar
- [ ] Token se envía a `/notifications/device-token`
- [ ] Push llega cuando te asignan tarea

---

## FASE 5: QA Y PULIDO
**Duración:** 30 minutos
**Criticidad:** 🟢 MEDIO

### Visual:
- [ ] Diseño verde premium consistente
- [ ] Login se ve como React pero verde
- [ ] Animaciones fluidas
- [ ] Sin textos cortados

### Funcional:
- [ ] Todas las pantallas cargan
- [ ] Sincronización funciona
- [ ] Push funciona
- [ ] No hay crashes

---

## 📅 RESUMEN DE TIEMPOS

| Fase | Tiempo |
|------|--------|
| Fase 0: Android | 10 min |
| Fase 1: Firebase | 20 min |
| Fase 2: Backend | 15 min |
| Fase 3: Offline | 15 min |
| Fase 4: Push | 20 min |
| Fase 5: QA | 30 min |
| **TOTAL** | **~2 horas** |

---

## 🎨 DISEÑO IMPLEMENTADO

### Comparación React vs Flutter

| Elemento React | Implementación Flutter |
|----------------|------------------------|
| `bg-gradient-to-br from-slate-50 to-slate-100` | `loginBackgroundGradient` |
| `bg-gradient-to-br from-slate-900 via-slate-800` | `loginPanelGradient` (verde) |
| `rounded-3xl shadow-2xl` | `radiusXl: 24` + `cardShadow` |
| `from-pink-500 to-orange-500` | `accentGradient` (green-teal) |
| `h-1 bg-gradient-to-r` | `topAccentGradient` |
| `bg-slate-50/50 border-slate-200` | `InputDecorationTheme` |
| `text-slate-900, text-slate-500` | `_textTheme` con colores |

### Colores Principales
```dart
primary: #22C55E    // Verde - reemplaza rosa de React
green50: #F0FDF4    // Fondo principal  
green600: #16A34A   // Botones
slate50-slate900    // Neutrales (idéntico a React)
```

### Archivos Actualizados
- ✅ `lib/core/theme/app_theme.dart` - Tema completo inspirado en React
- ✅ `lib/features/auth/presentation/login_screen.dart` - Ya tiene diseño verde

---

## 📦 ARCHIVOS CREADOS/ACTUALIZADOS

| Archivo | Descripción |
|---------|-------------|
| `flutter_movil/lib/core/theme/app_theme.dart` | Tema verde inspirado en React |
| `flutter_movil/docs/PLAN_TRABAJO_FLUTTER_08022026.md` | Este plan |
| `firebasereact/GUIA_FCM_REACT.md` | Guía para agregar FCM a React (para después) |

---

## 🔧 COMANDOS RÁPIDOS

```powershell
# 1. Navegar al proyecto
cd "c:\Users\Gustavo Lira\Documents\gustavoplan\planer\flutter_movil"

# 2. Generar Android
flutter create --org com.momentus .

# 3. Instalar dependencias
flutter pub get

# 4. Ejecutar en celular
flutter run

# 5. Build release
flutter build apk --release
```

---

## ✅ CHECKLIST FINAL

### Antes de empezar:
- [ ] Celular conectado con USB
- [ ] Modo desarrollador activado
- [ ] Depuración USB activada
- [ ] `flutter devices` muestra el celular

### Al terminar:
- [ ] App corre en celular
- [ ] Login funciona con backend real
- [ ] Diseño verde premium visible
- [ ] Push notifications funcionan
- [ ] Offline/online sincroniza bien

---

## 📝 NOTAS IMPORTANTES

### Sobre FCM y React
- **Flutter:** Recibirá push cuando te asignen tareas
- **React:** NO recibe push actualmente (no tiene Firebase)
- **Para después:** Ver `firebasereact/GUIA_FCM_REACT.md`

### Sobre el Diseño
- Inspirado en `LoginPage.tsx` de React
- Mismo sistema de colores slate
- Primary cambia de rosa a verde
- Gradientes adaptados a tema verde
- Tipografía Inter (igual que React)

### Sobre el Backend
- Ya está listo para FCM
- URL: `http://100.26.176.32/api`
- Endpoint FCM: `POST /notifications/device-token`
- Swagger: `http://100.26.176.32/api/docs`

---

**¡Listo para empezar! 🌿**

**Última actualización:** 8 de Febrero 2026, 17:51 CST
