# 🚀 HOJA DE RUTA: Finalización Paridad NestJS ↔ Rust (Fase 5) 🦀

Este documento es una guía técnica para que un nuevo agente (o tú mismo en un nuevo chat) continúe la migración sin perder el hilo.

---

## 📍 ESTADO ACTUAL (Marzo 2026)
- **Rutas HTTP**: 100% Mapeadas en Axum.
- **Logica Real**: ~95% Implementada (Auth, Proyectos, Tareas, Marcaje, GPS, Notificaciones).
- **Notificaciones**: 🟢 Funciona envío real de Push (FCM v1) y Email (SMTP/lettre).
- **GPS/Campo**: 🟢 Funciona registro de recorridos y puntos reales.
- **Base de Datos**: 🟢 SQL Server (Tiberius) con pool dinámico.

---

## 🎯 PENDIENTES CRÍTICOS (El "5%" final)

### 1. 📧 Plantillas de Correo (Portar de NestJS a Rust)
En NestJS se usan archivos `.pug`. En Rust hemos implementado `Tera` como motor de plantillas, pero falta portar los diseños reales.
- **Ubicación en NestJS**: `v2backend/src/templates/*.pug`
- **Tarea**: Crear carpeta `backendrust/templates/`, convertir los `.pug` a `.html` (estilo Tera/Jinja) y llamarlos desde `NotificationService::send_email` en `src/services/notification.rs`.

### 2. 📱 Validación de Push en Dispositivos Reales
Aunque `send_push` en `src/services/notification.rs` está implementado bajo el estándar FCM v1, falta:
- Probar con el APK/IPA real para asegurar que los `data` payloads (click_action, etc.) activen correctamente la app de Flutter móvil.
- Verificar el manejo de tokens expirados (limpieza automática en `p_Dispositivos`).

### 3. 🛠️ Endpoints de Administración / Mantenimiento
Hay un par de esqueletos en `src/handlers/admin.rs` y `src/handlers/api.rs` que son informativos:
- **`api_seed`**: Actualmente responde "Servicio deshabilitado en Rust". Si se necesita recrear base de datos desde Rust, portar la lógica de NestJS.
- **`admin_backup_export`**: Implementar la generación de Excel/JSON para backups manuales si se decide apagar NestJS definitivamente.

### 4. 🔗 Consolidación de SQL Inline
Se han migrado muchos a SPs, pero aún quedan algunas queries en `src/handlers/campo.rs` y `src/handlers/admin.rs` escritas directamente en el código.
- **Tarea**: Mover esas queries a Stored Procedures en SQL Server para mantener el estándar de arquitectura.

---

## 🛠️ INSTRUCCIONES PARA EL NUEVO AGENTE
1. **Verificar Compilación**: Ejecutar `cargo check` antes de empezar.
2. **Contexto de Notificaciones**: Leer `src/services/notification.rs` para entender cómo se inyectó el servicio en `ApiState`.
3. **Variables de Entorno**: Asegurarse de tener `MAIL_USER`, `MAIL_PASS`, `FIREBASE_CREDENTIALS_PATH` configurados en el `.env`.
4. **Referencia de Paridad**: Consultar `PARITY_REPORT_2026-03-08.md` para ver el detalle de cada endpoint.

---

## 🏁 PRÓXIMO PASO RECOMENDADO
"Comenzar con la migración de la plantilla de correo de 'Tarea Atrasada' desde `v2backend/src/templates/overdue.pug` a un nuevo archivo `overdue.html` en Rust usando el motor Tera."
