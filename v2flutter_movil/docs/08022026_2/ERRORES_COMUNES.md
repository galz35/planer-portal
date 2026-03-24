# Errores Comunes en Proyectos Flutter (Inventario y Momentus)

Este documento recopila los errores más frecuentes encontrados durante la configuración y desarrollo de los proyectos Flutter, con sus soluciones probadas.

---

## 1. Errores de Compilación / Build

### Error: "Gradle build daemon disappeared unexpectedly"
**Síntoma:** Al ejecutar `flutter run`, el proceso falla inesperadamente.
**Causa:** El archivo `android/gradle.properties` asigna demasiada RAM (ej: `-Xmx8G`).
**Solución:**
```properties
# Editar android/gradle.properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

### Error: "cmdline-tools component is missing"
**Síntoma:** `flutter doctor` muestra este error en "Android toolchain".
**Solución:**
1. Abrir Android Studio.
2. Ir a **Settings > Languages & Frameworks > Android SDK > SDK Tools**.
3. Marcar **Android SDK Command-line Tools (latest)** y aplicar.
4. Ejecutar `flutter doctor --android-licenses` y aceptar las licencias.

### Error: "Build failed due to use of deleted Android v1 embedding"
**Síntoma:** El proyecto no tiene archivos de plataforma Android.
**Solución:**
```bash
flutter create .
```

---

## 2. Errores de Conexión / Red

### Error: Celular no conecta al Backend
**Síntoma:** La app no puede comunicarse con el servidor aunque hay internet.
**Causa:** Se está usando `localhost` o `10.0.2.2` en un dispositivo físico.
**Solución:**
1. Obtener IP local con `ipconfig` (Windows) o `ip addr` (Linux/Mac).
2. Editar `lib/core/api/api_client.dart`:
```dart
static const String baseUrl = 'http://192.168.X.X:3000/api';
```

### Error: "SocketException: Connection refused"
**Síntoma:** La app muestra error de conexión rechazada.
**Causas posibles:**
- Backend no está corriendo.
- Firewall bloquea el puerto 3000.
- IP incorrecta configurada en la app.
**Solución:**
1. Verificar que el backend esté corriendo.
2. Abrir puerto en firewall de Windows.
3. Verificar IP correcta.

---

## 3. Errores de Dispositivo

### Error: Dispositivo Android físico no detectado
**Síntoma:** `flutter devices` no muestra el celular.
**Solución:**
1. **Cable USB:** Usar cable de datos, no solo de carga.
2. **Modo Desarrollador:** Activar en *Ajustes > Acerca del teléfono > Número de compilación* (tocar 7 veces).
3. **Depuración USB:** Activar en *Opciones de desarrollador*.
4. **Huella RSA:** Aceptar el mensaje "¿Permitir depuración por USB?" en el celular.
5. **Modo de Conexión:** Cambiar a "Transferencia de archivos (MTP)".

---

## 4. Errores de Test

### Error: "The name 'MyApp' isn't a class"
**Síntoma:** Error en `test/widget_test.dart` después de recrear archivos.
**Causa:** `flutter create .` genera un test que asume que la clase se llama `MyApp`.
**Solución:**
```dart
// Editar test/widget_test.dart
await tester.pumpWidget(
  const ProviderScope(
    child: InventarioApp(), // O el nombre real de tu app
  ),
);
```

---

## 5. Errores de Sincronización (flutter_movil)

### Error: Datos no se sincronizan
**Síntoma:** Las tareas creadas offline no aparecen en el servidor.
**Solución:**
1. Verificar que la app tenga conexión a internet.
2. Revisar la pantalla de "Sincronización" para ver el estado de la cola.
3. Forzar sincronización manual con el botón "Sincronizar ahora".

### Error: "401 Unauthorized" después de tiempo
**Síntoma:** La app deja de funcionar después de varias horas.
**Causa:** El access_token expiró y el refresh no funcionó.
**Solución:** Verificar que el interceptor de refresh esté configurado correctamente en `api_client.dart`.

---

## Comandos de Diagnóstico Útiles

```bash
# Ver dispositivos conectados
flutter devices

# Verificar instalación de Flutter
flutter doctor -v

# Limpiar proyecto (soluciona muchos problemas)
flutter clean && flutter pub get

# Ver logs detallados
flutter run -v
```
