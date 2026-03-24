# Guía del Proyecto Inventario (Flutter)

Esta guía ha sido generada tras analizar el código fuente y la documentación existente. Su objetivo es explicar **cómo funciona realmente el proyecto** y cómo evitar los errores más comunes para que puedas trabajar con él sin problemas.

---

## 1. Configuración CRÍTICA (Antes de empezar)

Para evitar que tu laptop "se muera" o que el celular no conecte, debes verificar estos dos archivos:

### A. Memoria RAM de Gradle (Evita crash en Windows)
El proyecto viene configurado para usar mucha RAM. Si tienes 8GB o 16GB en tu laptop, **debes** bajar esto.
*   **Archivo:** `android/gradle.properties`
*   **Cambio:** Busca `org.gradle.jvmargs` y asegúrate de que diga `-Xmx2048m` (2GB) en lugar de `-Xmx8G`.

### B. Conexión Backend (IP Local)
El emulador usa `10.0.2.2`, pero tu celular físico necesita tú **IP local de Wi-Fi**.
*   **Archivo:** `lib/core/api/api_client.dart`
*   **Línea 16:** `static const String baseUrl = 'http://192.168.X.X:3000/api';`
    *   *Nota:* Cambia `192.168.X.X` por la IP que te da el comando `ipconfig` en Windows.

---

## 2. Arquitectura del Proyecto

El proyecto sigue una estructura limpia y modular. No está todo mezclado; cada cosa tiene su lugar.

### Estructura de Carpetas (`lib/`)

*   **`main.dart`**: El punto de partida. Inicializa la app y configura Riverpod (`ProviderScope`).
*   **`core/`**: Lo que usa toda la app.
    *   **`api/`**: Cliente HTTP (`Dio`) para conectar al servidor.
    *   **`network/`**: Manejo de conexión a internet.
    *   **`storage/`**: Base de datos local (`sqflite` o `shared_preferences`) para guardar sesión y datos offline.
*   **`app/`**: Configuración global.
    *   **`router/`**: Configuración de rutas (`GoRouter`). Aquí se decide qué pantallas se ven.
*   **`features/`**: Las funcionalidades principales. Cada carpeta aquí (`auth`, `inventario`, `dashboard`) es como una "mini-app" con:
    *   **`presentation/`**: Pantallas y Widgets (lo que se ve).
    *   **`application/`**: Lógica de estado (Controladores Riverpod).
    *   **`domain/`**: Modelos de datos (Entidades, ej: `Usuario`, `Producto`).
    *   **`data/`**: Repositorios que deciden si buscar datos de Internet o de la Base de Datos Local.

---

## 3. ¿Cómo funciona por dentro?

### Navegación y Seguridad (`AppRouter`)
El archivo `lib/app/router/app_router.dart` es el guardia de tráfico.
*   Revisa si estás logueado (`authState.isAuthenticated`).
*   Si **NO** estás logueado → Te manda a `/login`.
*   Si **SÍ** estás logueado → Te deja entrar al `/dashboard`.
*   **Permisos:** También revisa si tienes permiso para ver un módulo. Si un técnico intenta entrar a `/usuarios` y no tiene permiso, lo devuelve al Dashboard.

### Autenticación y Modo Offline (`AuthRepository`)
El login es muy inteligente (`lib/features/auth/data/auth_repository_impl.dart`):
1.  Intenta conectar al Backend.
2.  **Si hay internet:** Descarga tu usuario y permisos, los guarda en una base de datos local y te deja pasar.
3.  **Si NO hay internet (o falla el servidor):**
    *   Busca si ya iniciaste sesión antes en la base de datos local.
    *   Si encuentra datos guardados, ¡te deja pasar igual! (Modo Offline).
    *   Si falla todo, crea un usuario "Operador" temporal para que puedas seguir trabajando (esto parece ser un modo de prueba/fallback).

---

## 4. Solución de Errores Comunes

| Error | Causa Probable | Solución |
| :--- | :--- | :--- |
| **"Gradle build daemon disappeared..."** | Tu PC se quedó sin RAM. | Reduce la memoria en `android/gradle.properties` a 2GB. |
| **Celular no conecta al Backend** | Estás usando `localhost` en vez de tu IP. | Edita `api_client.dart` y pon tu IP real (ej: `192.168.1.5`). |
| **Pantalla en blanco / Carga infinita** | El backend no está corriendo. | Asegúrate de correr el servidor Node.js/NestJS en tu PC. |
| **"cmdline-tools component is missing"** | No instalaste herramientas de Android. | Abre Android Studio -> SDK Tools -> marca "Command-line Tools". |

---

## 5. Comandos Útiles

*   **Correr en celular:** `flutter run` (asegura tener el celular conectado).
*   **Limpiar proyecto:** `flutter clean` (úsalo si todo falla inexplicablemente).
*   **Instalar librerías:** `flutter pub get`.
