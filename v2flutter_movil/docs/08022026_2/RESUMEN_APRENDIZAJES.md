# Resumen de Aprendizajes - Proyectos Flutter (08/02/2026)

Este documento consolida las lecciones aprendidas durante el análisis y configuración de los proyectos Flutter (Inventario y Momentus Mobile).

---

## 1. Arquitectura Offline-First

### Lo que aprendimos:
- **Write-Local-First:** Siempre guardar primero en SQLite, luego sincronizar.
- **Cola de Sincronización:** Usar una tabla `sync_queue` para encolar cambios pendientes.
- **Backoff Exponencial:** Si falla el sync, esperar cada vez más tiempo antes de reintentar.
- **Cache Local:** Usar `kv_cache` para guardar respuestas del API y mostrarlas cuando no hay red.

### Implementación en flutter_movil:
```
Usuario crea tarea → SQLite local → sync_queue → (cuando hay red) → API Backend
```

---

## 2. Configuración de Backend

### Puntos Críticos:
1. **IP Local vs Remota:**
   - Emulador: `10.0.2.2`
   - Celular físico: IP de la red WiFi (ej: `192.168.1.100`)
   - Producción: IP pública del servidor (ej: `100.26.176.32`)

2. **Swagger es tu amigo:** Siempre revisar `/api/docs` para entender los endpoints.

3. **Backend NestJS + Fastify:** Más rápido que Express, pero requiere configuración especial para multipart/formdata.

---

## 3. Gestión de Memoria (Gradle)

### Lección Clave:
**Nunca usar más de 2GB de RAM para Gradle en laptops normales.**

```properties
# android/gradle.properties
org.gradle.jvmargs=-Xmx2048m
```

Usar más RAM (como 8G) puede hacer que Windows "mate" el proceso de compilación.

---

## 4. Autenticación JWT

### Flujo Correcto:
1. Login → Obtener `access_token` (corta duración: 8-12h) + `refresh_token` (larga duración: 7d).
2. Guardar `refresh_token` en **Secure Storage** (nunca en SharedPreferences normal).
3. En cada request, enviar `access_token` en el header `Authorization: Bearer ...`.
4. Si el servidor responde 401, usar el `refresh_token` para obtener nuevo `access_token`.
5. Si el refresh falla, redirigir a login.

---

## 5. Compilación en la Nube (Codemagic)

### Alternativas para compilar sin ocupar RAM local:
1. **GitHub Actions:** Configurar workflow en `.github/workflows/build_apk.yml`.
2. **Codemagic.io:** Servicio visual que compila y envía el APK por correo.

### Ventaja:
- No consume recursos de tu laptop.
- Genera APKs listos para distribuir.

---

## 6. Estructura de Proyecto Recomendada

```
lib/
├── main.dart              # Punto de entrada
├── app/
│   ├── app.dart           # Widget raíz
│   └── router/            # Navegación (GoRouter)
├── core/
│   ├── api/               # Cliente HTTP (Dio)
│   ├── config/            # Configuración de la app
│   ├── network/           # Manejo de conectividad
│   └── storage/           # SQLite, Secure Storage
├── features/
│   ├── auth/              # Login, sesión
│   ├── tasks/             # Tareas (CRUD)
│   ├── sync/              # Sincronización
│   └── settings/          # Ajustes del usuario
└── shared/
    └── widgets/           # Componentes reutilizables
```

---

## 7. Checklist Antes de Probar en Celular

- [ ] Backend corriendo y accesible desde la red WiFi.
- [ ] IP correcta configurada en `api_client.dart` o vía `--dart-define`.
- [ ] Celular con Modo Desarrollador y Depuración USB activados.
- [ ] Cable USB de datos (no solo carga).
- [ ] Gradle configurado con máximo 2GB de RAM.

---

## 8. Recursos Útiles

- **Swagger Backend:** `http://100.26.176.32/api/docs`
- **Documentación Flutter:** `https://docs.flutter.dev`
- **Codemagic:** `https://codemagic.io`
- **Estado del proyecto móvil:** `flutter_movil/docs/ESTADO_IMPLEMENTACION_MOVIL.md`
